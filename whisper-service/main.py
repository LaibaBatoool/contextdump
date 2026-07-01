from fastapi import FastAPI, File, UploadFile, Response
from faster_whisper import WhisperModel
import tempfile
import os
import edge_tts
import uuid

# Load model once when the server starts, not per-request
# "base" is a good balance of speed vs accuracy for a laptop CPU
model = WhisperModel("base", device="cpu", compute_type="int8")

app = FastAPI()

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # Save the uploaded audio to a temporary file
    # Whisper needs a file path, not raw bytes directly
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(tmp_path)
        text = " ".join([segment.text for segment in segments]).strip()
        return {"text": text, "language": info.language}
    finally:
        os.remove(tmp_path)  # clean up the temp file regardless of success/failure

@app.post("/synthesize")
async def synthesize_speech(text: str):
    output_path = f"temp_{uuid.uuid4().hex}.mp3"
    
    communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
    await communicate.save(output_path)
    
    with open(output_path, "rb") as f:
        audio_bytes = f.read()
    
    os.remove(output_path)
    
    return Response(content=audio_bytes, media_type="audio/mpeg")

@app.get("/")
def health_check():
    return {"status": "Whisper service is running"}
