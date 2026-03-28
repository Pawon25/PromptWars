import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './App.css';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

function App() {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `You are an expert agricultural assistant. Analyze the farmer's input and respond ONLY in valid JSON with exactly these keys:
      {
        "diagnosis": "what is the problem",
        "action": "what the farmer should do",
        "urgency": "Low or Medium or High"
      }`;

      let response;

      if (image) {
        const base64 = await toBase64(image);
        const imagePart = { inlineData: { data: base64, mimeType: image.type } };
        response = await model.generateContent([prompt, imagePart]);
      } else {
        response = await model.generateContent(`${prompt}\n\nFarmer says: ${text}`);
      }

      const raw = response.response.text();
      const clean = raw.replace(/```json|```/g, '').trim();
      setResult(JSON.parse(clean));
    } catch (err) {
      setError('Something went wrong. Please try again.');
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
      />

      <br /><br />
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <br /><br />

      <button onClick={analyze} disabled={loading || (!text && !image)}
        style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer' }}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 30, padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
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