# AgroIntent — AI-Powered Crop Assistant

> Built for PromptWars Hackathon (Google for Developers + H2S)

AgroIntent takes unstructured real-world farmer inputs — a typed description or a crop photo — and converts them into structured, actionable diagnosis cards using Google Vertex AI.

---

## What It Does

A farmer types a crop problem or uploads a photo. The app analyzes it and returns:

- **Diagnosis** — what is wrong with the crop
- **Recommended Action** — what the farmer should do immediately
- **Urgency Level** — Low, Medium, or High
- **AI Confidence** — how certain the model is, with a prompt to add more details if confidence is low

Additional features:

- Voice input (speech-to-text) in English, Hindi, Kannada, Telugu, and Tamil
- Text-to-speech playback of the diagnosis in the selected language
- Multi-language response output via Vertex AI (same API call, zero extra latency)
- Sample scenarios for quick demo and onboarding
- Share diagnosis via WhatsApp or copy to clipboard
- Rate limiting, input validation, and Cloud Logging on the backend

---

## Architecture

```
Browser (React + Firebase Hosting)
        |
        | POST /analyze (multipart/form-data)
        v
FastAPI Backend (Cloud Run)
        |
        | Vertex AI SDK
        v
Gemini 2.5 Flash (us-central1)
```
## Tech Stack
```
-------------------------------------------------------
| Layer            | Technology                       |
|------------------|----------------------------------|
| Frontend         | React (Create React App)         |
| Frontend Hosting | Firebase Hosting                 |
| Backend          | FastAPI (Python)                 |
| Backend Hosting  | Google Cloud Run                 |
| AI Model         | VertexAI gemini-2.5-flash        |
| Rate Limiting    | slowapi                          |
| Cloud Logging    | google-cloud-logging             |
| Icons            | lucide-react                     |
| Auth (cloud)     | gcloud application-default login |
-------------------------------------------------------
```
## Project Structure

```
PromptWars/
├── README.md
└── agrointent/
    ├── backend/
    │   ├── main.py               # FastAPI app — /analyze endpoint
    │   ├── requirements.txt      # Python dependencies
    │   ├── Dockerfile            # Cloud Run container
    │   └── test_main.py          # pytest test suite
    └── agrointent/               # React CRA frontend
        ├── public/
        │   └── scenarios/        # Local scenario images
        │       ├── wheat.jpg
        │       ├── corn.jpg
        │       ├── tomato.jpg
        │       └── rice.jpg
        ├── src/
        │   ├── App.js
        │   └── App.css
        ├── .env                  # REACT_APP_BACKEND_URL
        ├── firebase.json
        └── .firebaserc
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- Google Cloud SDK (`gcloud` CLI)
- A GCP project with Vertex AI API enabled

### 1. Authenticate with GCP

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Start the Backend

```bash
cd agrointent/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

Backend will be available at `http://127.0.0.1:8000`.

### 3. Start the Frontend

```bash
cd agrointent/agrointent

# Create .env file
echo REACT_APP_BACKEND_URL=http://127.0.0.1:8000 > .env

# Install dependencies and start
npm install
npm start
```

Frontend will open at `http://localhost:3000`.

### 4. Run Tests

```bash
cd agrointent/backend
pytest test_main.py -v
```

---

## Deploying to Google Cloud

### Prerequisites

- GCP project with billing enabled
- Vertex AI API enabled
- Cloud Run API enabled
- Artifact Registry API enabled
- Firebase project linked to the same GCP project

Enable all required APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  logging.googleapis.com \
  --project YOUR_PROJECT_ID
```

### Deploy the Backend to Cloud Run

```bash
cd agrointent/backend

gcloud run deploy agrointent-backend \
  --source . \
  --project YOUR_PROJECT_ID \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID
```

Copy the service URL from the output. It will look like:
```
https://agrointent-backend-XXXXXXXXXX-uc.a.run.app
```

### Deploy the Frontend to Firebase Hosting

```bash
cd agrointent/agrointent

# Set the Cloud Run URL in .env
echo REACT_APP_BACKEND_URL=https://agrointent-backend-XXXXXXXXXX-uc.a.run.app > .env

# Build and deploy
npm run build
npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID
```

---

## Backend API Reference

### `GET /`

Health check.

```json
{ "status": "AgroIntent backend running", "version": "1.0.0" }
```

### `POST /analyze`

Analyzes a crop problem.

**Request** — `multipart/form-data`
```
-------------------------------------------------------------------------------------------------------
| Field    | Type   | Required | Description                                                          |
|----------|--------|----------|----------------------------------------------------------------------|
| text     | string | No*      | Farmer's description of the problem                                  |
| image    | file   | No*      | Crop photo (JPEG, PNG, WebP, max 5MB)                                |
| language | string | No       | Response language code: `en`, `hi`, `kn`, `te`, `ta` (default: `en`) |
-------------------------------------------------------------------------------------------------------
```
*At least one of `text` or `image` is required.

**Response**

```json
{
  "diagnosis": "Nitrogen deficiency causing chlorosis",
  "action": "Apply urea fertilizer at 50kg/acre and irrigate within 24 hours",
  "urgency": "High",
  "confidence": "Medium"
}
```

**Rate limit:** 10 requests per minute per IP.

---

## Environment Variables

### Backend (Cloud Run)
```
------------------------------------------------------------------------
| Variable         | Description                  | Default            |
|------------------|------------------------------|--------------------|
| `GCP_PROJECT_ID` | GCP project ID for Vertex AI | `pavan-promptwars` |
------------------------------------------------------------------------
```

### Frontend
```
--------------------------------------------------------------
| Variable                | Description                      |
|-------------------------|----------------------------------|
| `REACT_APP_BACKEND_URL` | Full URL of the deployed backend |
--------------------------------------------------------------
```

## Supported Languages
```
--------------------------------------------------
| Code | Language | Speech Input | Speech Output |
|------|----------|--------------|---------------|
| en   | English  | Yes          | Yes           |
| hi   | Hindi    | Yes          | Yes           |
| kn   | Kannada  | Yes          | Yes           |
| te   | Telugu   | Yes          | Yes           |
| ta   | Tamil    | Yes          | Yes           |
--------------------------------------------------
```
Speech features use the browser's built-in Web Speech API. No additional configuration required.

---

## Security

- CORS restricted to the Firebase Hosting domain only
- Rate limiting: 10 analyze requests per minute per IP
- Image type validation: JPEG, PNG, WebP only
- Image size limit: 5MB
- Text input length limit: 1000 characters
- No API keys stored in the frontend
- All AI calls made server-side via Vertex AI with application-default credentials on Cloud Run

---

## Built With

- [Google Vertex AI](https://cloud.google.com/vertex-ai) — Gemini 2.5 Flash
- [Google Cloud Run](https://cloud.google.com/run) — Serverless backend
- [Firebase Hosting](https://firebase.google.com/docs/hosting) — Frontend deployment
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [React](https://react.dev/) — Frontend framework
- [lucide-react](https://lucide.dev/) — Icons
- [slowapi](https://github.com/laurentS/slowapi) — Rate limiting

---

## Author

**Pavan B**

- [LinkedIn](https://www.linkedin.com/in/pavan-b-mce/)
- [GitHub](https://github.com/Pawon25)
- [Portfolio](https://pawon25.github.io/Pavans_Portfolio/)

---

*Built for PromptWars Hackathon — Google for Developers + H2S*
