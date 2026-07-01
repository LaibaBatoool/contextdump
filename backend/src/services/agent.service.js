import Groq from "groq-sdk";
import { getEmbedding } from "./embeddings.js";
import { getStore } from "./faissStore.js";

let groq = null;

const getGroq = () => {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
};
// These are the 4 tools the agent can choose from
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_codebase",
      description:
        "Semantically search the codebase for relevant code. Use this for general questions about how something works or where something is implemented.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What you are searching for in the codebase",
          },
          topK: {
            type: "integer",  // change "number" to "integer" if it says number
            description: "Number of results to return. Must be an integer, not a string. Use 5.",
            default: 5,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_file",
      description:
        "Retrieve all chunks from a specific file by its path. Use when the user asks about a specific file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The relative file path e.g. src/routes/auth.js",
          },
        },
        required: ["filePath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_function",
      description:
        "Find and explain a specific function or class by name. Use when the user asks about a specific named function.",
      parameters: {
        type: "object",
        properties: {
          functionName: {
            type: "string",
            description: "The name of the function or class to explain",
          },
        },
        required: ["functionName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_docs",
      description:
        "Generate markdown documentation for a file or module. Use when the user asks to document something or generate onboarding docs.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "File path or module name to generate docs for",
          },
        },
        required: ["target"],
      },
    },
  },
];

export const runAgent = async (question, vectorStorePath, chatHistory = []) => {
  const store = await getStore(vectorStorePath);

  const systemPrompt = `You are ContextDump, an AI assistant that helps developers understand codebases.
You have tools to search and retrieve code from the repository.
Always use a tool first before answering.
Be specific, cite file paths and line numbers in your answers.
Explain code clearly as if talking to a fellow developer.
When calling search_codebase, topK must always be an integer like 5, never a string like "5".`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-6),
    { role: "user", content: question },
  ];

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Step 1 — Let the agent decide which tool to use
      const toolCallResponse = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const assistantMessage = toolCallResponse.choices[0].message;
      let sources = [];
      let toolUsed = null;
      let toolResult = "";

      // Step 2 — Execute whichever tool the agent chose
      if (assistantMessage.tool_calls?.length > 0) {
        const toolCall = assistantMessage.tool_calls[0];
        toolUsed = toolCall.function.name;

        // Parse args and force topK to a number defensively
        const args = JSON.parse(toolCall.function.arguments);
        if (args.topK) args.topK = parseInt(args.topK, 10) || 5;

        console.log(`Agent using tool: ${toolUsed}`, args);

        if (toolUsed === "search_codebase") {
          const embedding = await getEmbedding(args.query);
          const results = store.search(embedding, args.topK || 5);
          sources = results.map((r) => ({
            filePath: r.metadata.filePath,
            lineStart: r.metadata.lineStart,
            lineEnd: r.metadata.lineEnd,
            snippet: r.metadata.snippet,
          }));
          toolResult = results.map((r) => r.metadata.content).join("\n\n---\n\n");
        }

        else if (toolUsed === "get_file") {
          const results = store.metadata
            .filter((m) => m.filePath.includes(args.filePath))
            .slice(0, 10);
          sources = results.map((r) => ({
            filePath: r.filePath,
            lineStart: r.lineStart,
            lineEnd: r.lineEnd,
            snippet: r.snippet,
          }));
          toolResult = results.map((r) => r.content).join("\n\n");
        }

        else if (toolUsed === "explain_function") {
          const embedding = await getEmbedding(`function ${args.functionName}`);
          const results = store.search(embedding, 3);
          sources = results.map((r) => ({
            filePath: r.metadata.filePath,
            lineStart: r.metadata.lineStart,
            lineEnd: r.metadata.lineEnd,
            snippet: r.metadata.snippet,
          }));
          toolResult = results.map((r) => r.metadata.content).join("\n\n---\n\n");
        }

        else if (toolUsed === "generate_docs") {
          const embedding = await getEmbedding(args.target);
          const results = store.search(embedding, 8);
          sources = results.map((r) => ({
            filePath: r.metadata.filePath,
            lineStart: r.metadata.lineStart,
            lineEnd: r.metadata.lineEnd,
            snippet: r.metadata.snippet,
          }));
          toolResult = results.map((r) => r.metadata.content).join("\n\n---\n\n");
        }

        // Step 3 — Send tool result back for final answer
        const finalResponse = await getGroq().chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            ...messages,
            assistantMessage,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult || "No results found.",
            },
          ],
        });

        return {
          answer: finalResponse.choices[0].message.content,
          sources,
          toolUsed,
        };
      }

      // Agent answered directly without a tool
      return {
        answer: assistantMessage.content,
        sources: [],
        toolUsed: null,
      };

    } catch (err) {
      console.warn(`Agent attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt === MAX_RETRIES) {
        throw new Error(`Agent failed after ${MAX_RETRIES} attempts: ${err.message}`);
      }
      // Small delay before retrying so we don't hammer the API
      await new Promise((res) => setTimeout(res, 500));
    }
  }
};
