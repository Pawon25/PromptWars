from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import vertexai
from vertexai.generative_models import GenerativeModel, Part, Image as VertexImage
import io
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "pavan-promptwars")
LOCATION = "us-central1"

vertexai.init(project=PROJECT_ID, location=LOCATION)

PROMPT = """You are an expert agricultural assistant. Analyze the farmer's input and respond ONLY in valid JSON with exactly these keys:
{
  "diagnosis": "what is the problem",
  "action": "what the farmer should do",
  "urgency": "Low or Medium or High"
}
Do not include anything outside the JSON."""

@app.post("/analyze")
async def analyze(
    text: str = Form(""),
    image: UploadFile = File(None)
):
    model = GenerativeModel("gemini-2.5-flash")

    if image:
        contents = await image.read()
        image_part = Part.from_data(data=contents, mime_type=image.content_type)
        response = model.generate_content([PROMPT, image_part])
    else:
        response = model.generate_content(f"{PROMPT}\n\nFarmer says: {text}")

    raw = response.text.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)

@app.get("/")
def root():
    return {"status": "AgroIntent backend running"}