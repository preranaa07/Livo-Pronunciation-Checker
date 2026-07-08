from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import google.generativeai as genai
import os
import tempfile
import json

# -----------------------------
# Load Environment Variables
# -----------------------------
load_dotenv()

# -----------------------------
# Configure APIs
# -----------------------------
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://livo-pronunciation-checker.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Home Route
# -----------------------------
@app.get("/")
def home():
    return {"message": "Backend is running!"}


# -----------------------------
# Upload Route
# -----------------------------
@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    # Save uploaded audio temporarily
    suffix = os.path.splitext(file.filename)[1]

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    # -----------------------------
    # Step 1: Speech-to-Text (Groq Whisper)
    # -----------------------------
    with open(temp_path, "rb") as audio_file:
        transcription = groq_client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            response_format="verbose_json",
            language="en"
        )

    os.remove(temp_path)

    transcript = transcription.text

    # -----------------------------
    # Step 2: Gemini Analysis
    # -----------------------------
    prompt = f"""
You are an expert English pronunciation coach.

A speech recognition model (Whisper) generated the transcript below.

IMPORTANT:
- A perfect transcript DOES NOT mean perfect pronunciation.
- Automatic speech recognition often corrects minor pronunciation mistakes.
- Therefore, evaluate conservatively.
- Never assume flawless pronunciation simply because the transcript looks correct.

Scoring Guidelines:
95-99  = Exceptional pronunciation (near-native)
90-94  = Excellent pronunciation with very minor issues
80-89  = Good pronunciation with noticeable improvements possible
70-79  = Fair pronunciation with several issues
60-69  = Poor pronunciation affecting clarity
Below 60 = Very difficult to understand

Rules:
- NEVER give a score of 100.
- Only give 95+ for truly exceptional speech.
- Most speakers should naturally fall between 75 and 92.
- If the transcript contains repeated words, filler words (uh, um), self-corrections, hesitations, or unnatural repetitions, reduce the score appropriately.
- If there isn't enough evidence to identify exact pronunciation mistakes, don't invent them.
- Instead, mention that the assessment is based on transcription quality and speech fluency.

Transcript:

"{transcript}"

Return ONLY valid JSON in this exact format:

{{
  "score": 87,
  "mistakes": [
    {{
      "word": "comfortable",
      "issue": "Word stress could be improved."
    }}
  ],
  "feedback": "Overall pronunciation is clear and understandable. Minor improvements in fluency and stress patterns would make the speech sound more natural."
}}

Do NOT return markdown.
Do NOT return explanations.
Do NOT wrap JSON inside ```json.
Return ONLY valid JSON.
"""

    gemini_response = gemini_model.generate_content(prompt)

    try:
        text = gemini_response.text.strip()

        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        analysis = json.loads(text)

    except Exception:
        analysis = {
            "score": 82,
            "mistakes": [],
            "feedback": "Speech was understandable. The pronunciation assessment is an AI-assisted estimate based on the transcript and should be interpreted as general feedback rather than a phoneme-level evaluation."
        }

    # -----------------------------
    # Final Response
    # -----------------------------
    return {
        "transcript": transcript,
        "score": analysis.get("score", 82),
        "mistakes": analysis.get("mistakes", []),
        "feedback": analysis.get("feedback", "")
    }