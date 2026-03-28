from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import os
import json
import logging

# ── Cloud Logging ──────────────────────────────────────────────
try:
    import google.cloud.logging
    client = google.cloud.logging.Client()
    client.setup_logging()
except Exception:
    pass  # fallback to standard logging locally

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App & Rate Limiter ─────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute"])
app = FastAPI(title="AgroIntent API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pavan-promptwars.web.app", "http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

# ── Vertex AI ─────────────────────────────────────────────────
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "pavan-promptwars")
LOCATION = "us-central1"
vertexai.init(project=PROJECT_ID, location=LOCATION)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_TEXT_LENGTH = 1000
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

PROMPT = """You are an expert agricultural assistant. Analyze the farmer's input and respond ONLY in valid JSON with exactly these keys:
{
  "diagnosis": "what is the problem",
  "action": "what the farmer should do",
  "urgency": "Low or Medium or High"
}
Do not include anything outside the JSON."""

# ── Routes ────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "AgroIntent backend running", "version": "1.0.0"}

@app.post("/analyze")
@limiter.limit("10/minute")
async def analyze(
    request: Request,
    text: str = Form(""),
    image: UploadFile = File(None)
):
    # Input validation
    if not text and not image:
        raise HTTPException(status_code=400, detail="Provide text or an image.")

    if text and len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"Text exceeds {MAX_TEXT_LENGTH} characters.")

    logger.info(f"Analyze request — has_text={bool(text)}, has_image={image is not None}")

    try:
        model = GenerativeModel("gemini-2.5-flash")

        if image:
            if image.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed.")

            contents = await image.read()

            if len(contents) > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=400, detail="Image exceeds 5MB limit.")

            image_part = Part.from_data(data=contents, mime_type=image.content_type)
            response = model.generate_content([PROMPT, image_part])
        else:
            response = model.generate_content(f"{PROMPT}\n\nFarmer says: {text}")

        raw = response.text.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)

        # Validate response structure
        if not all(k in result for k in ("diagnosis", "action", "urgency")):
            raise ValueError("Invalid response structure from model")

        logger.info(f"Analysis complete — urgency={result.get('urgency')}")
        return result

    except HTTPException:
        raise
    except json.JSONDecodeError:
        logger.error("Failed to parse model response as JSON")
        raise HTTPException(status_code=502, detail="Model returned an unexpected response.")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")