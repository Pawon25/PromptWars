import { useState } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';

function App() {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (image) formData.append('image', image);

      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Something went wrong. Please try again. ' + err.message);
    }

    setLoading(false);
  };

  const urgencyClass = result?.urgency?.toLowerCase() || 'low';

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="logo-icon">🌾</span>
        <span className="wordmark">AgroIntent</span>
        <span className="tagline">AI Crop Assistant</span>
      </header>

      <main className="app-main">
        <div className="container">

          <div className="hero">
            <h1>What's happening<br />with your crop?</h1>
            <p>Describe the problem or upload a photo — get an instant diagnosis.</p>
          </div>

          <div className="card">
            <div className="field">
              <label htmlFor="crop-input">Describe the problem</label>
              <textarea
                id="crop-input"
                placeholder="e.g. My wheat leaves are turning yellow at the tips and the stems feel soft..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Describe your crop problem"
              />
            </div>

            <div className="divider">or upload a photo</div>

            <div className="field">
              <label
                className="file-upload"
                htmlFor="image-upload"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('image-upload').click()}
              >
                <span className="upload-icon">📷</span>
                <span className="upload-text">
                  {image ? image.name : <><strong>Choose image</strong> &nbsp;or drag here</>}
                </span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  aria-label="Upload a crop photo"
                />
              </label>
            </div>

            {loading ? (
              <div className="loading-row" role="status" aria-live="polite">
                <div className="spinner" />
                Analyzing your crop…
              </div>
            ) : (
              <button
                className="btn-analyze"
                onClick={analyze}
                disabled={!text && !image}
                aria-label="Analyze crop problem"
              >
                Analyze
              </button>
            )}

            {error && (
              <div className="error-box" role="alert">{error}</div>
            )}
          </div>

          {result && (
            <div className="result-card" role="region" aria-label="Analysis Result">
              <div className="result-header">
                <h2>Analysis</h2>
                <span className={`urgency-badge ${urgencyClass}`}>
                  {result.urgency} urgency
                </span>
              </div>
              <div className="result-body">
                <div className="result-item">
                  <span className="item-label">Diagnosis</span>
                  <span className="item-value">{result.diagnosis}</span>
                </div>
                <div className="result-item">
                  <span className="item-label">Recommended Action</span>
                  <span className="item-value">{result.action}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="app-footer">
        Built for PromptWars · Powered by Vertex AI
      </footer>
    </div>
  );
}

export default App;