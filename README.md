# ContextDump

Every developer has wasted hours explaining their own codebase. ContextDump already knows it.

`ContextDump is an AI-powered codebase intelligence tool. Connect any public GitHub repo, and ask natural language questions about your code. The agent finds the exact files, cites line numbers, and explains everything — instantly.
Show Image`

 # Features

Semantic code search — finds relevant code across your entire repo

Autonomous agent — decides which tool to use based on your question

Source citations — every answer links back to exact file + line numbers

Chat history — conversations saved per repo

Smart chunking — splits by functions and classes, not character count

Fast inference — powered by Groq (300-1000+ tokens/sec)

Free embeddings — runs HuggingFace model locally, no OpenAI key needed


## Demo

| Feature                                     | Description                                       |
|---------------------------------------------|---------------------------------------------------|
| `Dashboard`                                 | Chat                                              |
| `Add any public GitHub repository`          | Ask questions and get cited answers               |
| `Real-time Ingestion`                       | Agent picks the right tool automatically          |
| `View files, chunks, and languages`         | Sources show exact file + line number             |

# Architecture
<img width="457" height="556" alt="image" src="https://github.com/user-attachments/assets/87c2d1b4-e8a2-4004-a6ce-fb48627d821f" />


# Tech Stack

| Layer                  | Technology                                       |
|------------------------|--------------------------------------------------|
| `Frontend`             | React 18 + Tailwind CSS + Vite                   |
| `Backend`              | Node.js + Express                                |
| `Database`             | MongoDB + Mongoose                               |
| `Vector Store`         | FAISS                                            |
| `Embeddings`           | HuggingFace all-MiniLM-L6-v2                     |
| `LLM + Agent`          | Groq API — llama-3.3-70b-versatile               |
| `Auth`                 | JWT                                              |

# Project Structure
<img width="539" height="771" alt="image" src="https://github.com/user-attachments/assets/e8c893f1-d109-4c52-861f-ca18baa048a2" />


# Getting Started
Prerequisites:

Node.js 18+

MongoDB running locally

Groq API key

`1. Clone the repo:`
   
git clone https://github.com/LaibaBatoool/contextdump.git

cd contextdump

`2. Setup Backend:`

cd backend

npm install

cp .env.example .env

Fill in .env:

envPORT=5000

MONGO_URI=mongodb://localhost:27017/contextdump

JWT_SECRET=your_secret_key_here

JWT_EXPIRES_IN=7d

GROQ_API_KEY=your_groq_api_key_here

`3. Create data directories:`

mkdir -p data/vectorstores data/repos

`4. Start the backend:`

npm run dev

⚠️ First run downloads the HuggingFace embedding model (~90MB). This only happens once.

`5. Setup Frontend:`

cd ../frontend

npm install

npm run dev

`6. Open the app`

http://localhost:5173

# API Reference
`Auth:`
POST   /api/auth/register    { name, email, password }

POST   /api/auth/login       { email, password }

GET    /api/auth/me

`Repos:`

POST   /api/repos            { githubUrl }

GET    /api/repos

GET    /api/repos/:id

DELETE /api/repos/:id

`Chat:`

POST   /api/chat/:repoId     { content }

GET    /api/chat/:repoId

DELETE /api/chat/:repoId

# Why Smart Chunking?
Most RAG tutorials chunk by character count (every 500 chars). That's bad for code — it splits functions in half and loses context.
ContextDump chunks by code structure:

// Bad — naive chunking

"...const handleLogin = async (req, res" // cut off mid-function

// Good — structure-aware chunking

"// File: controllers/auth.js (lines 12-45)
const handleLogin = async (req, res) => {
  const { email, password } = req.body;
  ..."  // complete function

`This means:`

Semantically complete chunks

Accurate line number citations

Much better retrieval quality


# How the Agent Works
The agent has 4 tools it chooses from automatically:


| Tool               | When it's used                                    |
|--------------------|---------------------------------------------------|
| `search_codebase`  | General questions about how something works       |
| `get_file`         | Questions about a specific file                   |
| `explain_function` | Questions about a named function or class         |
| `generate_docs`    | Requests to document a module                     |

# Built by
Laiba Batool — CS student at PIEAS

https://github.com/LaibaBatoool

https://www.linkedin.com/in/laiba-batool-70b3292b8/


