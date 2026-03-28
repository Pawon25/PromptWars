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

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Something went wrong. Please try again. ' + err.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>🌾 AgroIntent</h1>
      <p>Describe your crop problem or upload a photo.</p>

      <textarea
        rows={4}
        style={{ width: '100%', padding: 10, fontSize: 16 }}
        placeholder="e.g. My wheat leaves are turning yellow at the tips..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Describe your crop problem"
      />

      <br /><br />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        aria-label="Upload a crop photo"
      />
      <br /><br />

      <button
        onClick={analyze}
        disabled={loading || (!text && !image)}
        style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer' }}
        aria-label="Analyze crop problem"
      >
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div
          role="region"
          aria-label="Analysis Result"
          style={{ marginTop: 30, padding: 20, border: '1px solid #ccc', borderRadius: 8 }}
        >
          <h2>Result</h2>
          <p><strong>🔍 Diagnosis:</strong> {result.diagnosis}</p>
          <p><strong>✅ Action:</strong> {result.action}</p>
          <p><strong>⚠️ Urgency:</strong> {result.urgency}</p>
        </div>
      )}
    </div>
  );
}

export default App;