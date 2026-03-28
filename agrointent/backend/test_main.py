from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

# ── Mock response helper ───────────────────────────────────────
def mock_model_response(diagnosis="Test disease", action="Apply fungicide", urgency="High"):
    mock_resp = MagicMock()
    mock_resp.text = f'{{"diagnosis": "{diagnosis}", "action": "{action}", "urgency": "{urgency}"}}'
    return mock_resp

# ── Root ──────────────────────────────────────────────────────
def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "AgroIntent backend running"

# ── Analyze: no input ─────────────────────────────────────────
def test_analyze_no_input():
    response = client.post("/analyze", data={})
    assert response.status_code == 400
    assert "Provide text or an image" in response.json()["detail"]

# ── Analyze: text too long ────────────────────────────────────
def test_analyze_text_too_long():
    response = client.post("/analyze", data={"text": "a" * 1001})
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"]

# ── Analyze: valid text ───────────────────────────────────────
@patch("main.GenerativeModel")
def test_analyze_text_success(mock_model_class):
    mock_instance = MagicMock()
    mock_instance.generate_content.return_value = mock_model_response()
    mock_model_class.return_value = mock_instance

    response = client.post("/analyze", data={"text": "My wheat leaves are yellow"})
    assert response.status_code == 200
    data = response.json()
    assert "diagnosis" in data
    assert "action" in data
    assert "urgency" in data

# ── Analyze: urgency values ───────────────────────────────────
@patch("main.GenerativeModel")
def test_analyze_urgency_values(mock_model_class):
    for urgency in ["Low", "Medium", "High"]:
        mock_instance = MagicMock()
        mock_instance.generate_content.return_value = mock_model_response(urgency=urgency)
        mock_model_class.return_value = mock_instance

        response = client.post("/analyze", data={"text": "crop issue"})
        assert response.status_code == 200
        assert response.json()["urgency"] == urgency

# ── Analyze: invalid image type ───────────────────────────────
def test_analyze_invalid_image_type():
    response = client.post(
        "/analyze",
        files={"image": ("test.pdf", b"fake content", "application/pdf")}
    )
    assert response.status_code == 400
    assert "JPEG, PNG, or WebP" in response.json()["detail"]

# ── Analyze: image too large ──────────────────────────────────
def test_analyze_image_too_large():
    large_image = b"x" * (5 * 1024 * 1024 + 1)
    response = client.post(
        "/analyze",
        files={"image": ("big.jpg", large_image, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "5MB" in response.json()["detail"]