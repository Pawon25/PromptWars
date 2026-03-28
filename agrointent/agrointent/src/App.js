import { useState, useRef, useEffect } from 'react';
import { Wheat, Camera, Loader2, AlertCircle, Check, Leaf, ScanSearch, Mic, MicOff, Volume2, VolumeX, Globe, Share2, Copy, MessageCircle } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', speechCode: 'en-IN' },
  { code: 'hi', label: 'हि', name: 'Hindi', speechCode: 'hi-IN' },
  { code: 'kn', label: 'ಕ', name: 'Kannada', speechCode: 'kn-IN' },
  { code: 'te', label: 'తె', name: 'Telugu', speechCode: 'te-IN' },
  { code: 'ta', label: 'த', name: 'Tamil', speechCode: 'ta-IN' },
];

const SCENARIOS = [
  {
    id: 1,
    title: 'Yellow leaves on wheat',
    description: 'Yellowing tips, soft stems',
    text: 'My wheat leaves are turning yellow at the tips and the stems feel soft. The yellowing started about a week ago and is spreading fast across the field.',
    image: '/scenarios/wheat.jpg',
  },
  {
    id: 4,
    title: 'Pest infestation on corn',
    description: 'Holes in leaves, visible insects',
    text: 'My corn plants have holes in the leaves and I can see small insects clustered on the undersides. Some cobs are also damaged and show signs of borers inside.',
    image: '/scenarios/corn.jpg',
  },
  {
    id: 2,
    title: 'Black spots on tomato',
    description: 'Dark lesions on leaves & fruit',
    text: 'My tomato plants have dark black spots appearing on the leaves and some fruits. The spots have a yellow ring around them and the leaves are starting to drop.',
    image: '/scenarios/tomato.jpg',
  },
  {
    id: 3,
    title: 'Wilting rice crop',
    description: 'Drooping, discolored paddy',
    text: 'My rice crop is wilting and the leaves are turning brown from the tips inward. The plants look droopy even after irrigation and some sections of the field are worse than others.',
    image: '/scenarios/rice.jpg',
  },
];

function App() {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [language, setLanguage] = useState('en');
  const [copied, setCopied] = useState(false);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);

  const speechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const ttsSupported = 'speechSynthesis' in window;

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language);

  const toggleListening = () => {
    if (listening) { stopListening(); return; }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang.speechCode;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript) {
        setText(prev => prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim());
        setActiveScenario(null);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current && listeningRef.current) {
        try { recognition.start(); } catch (_) { }
      } else {
        setListening(false);
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') setListening(false);
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  };

  const speakResult = () => {
    if (!result) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `${result.diagnosis}. ${result.action}.`
    );
    utterance.lang = currentLang.speechCode;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setActiveScenario(null);
  };

  const handleScenario = (scenario) => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setActiveScenario(scenario.id);
    setText(scenario.text);
    setResult(null);
    setError(null);
    setImage(null);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const handleLanguageChange = (code) => {
    setLanguage(code);
    setResult(null);
    stopListening();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);

    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      formData.append('language', language);

      if (image) {
        formData.append('image', image);
      } else if (activeScenario) {
        const scenario = SCENARIOS.find(s => s.id === activeScenario);
        if (scenario) {
          const res = await fetch(scenario.image);
          const blob = await res.blob();
          formData.append('image', blob, 'scenario.jpg');
        }
      }

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

  const shareText = result
    ? `🌾 AgroIntent Crop Diagnosis\n\nDiagnosis: ${result.diagnosis}\n\nAction: ${result.action}\n\nUrgency: ${result.urgency}\n\nPowered by AgroIntent — https://pavan-promptwars.web.app`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const urgencyClass = result?.urgency?.toLowerCase() || 'low';
  const confidenceClass = result?.confidence?.toLowerCase() || 'high';
  const showLowConfidenceHint = result?.confidence === 'Low';

  const uploadLabel = () => {
    if (image) return image.name;
    if (activeScenario) {
      const s = SCENARIOS.find(s => s.id === activeScenario);
      return `Sample image attached — ${s?.title}`;
    }
    return null;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Wheat size={20} strokeWidth={1.5} className="header-icon" />
        <span className="wordmark">AgroIntent</span>
        <div className="lang-selector">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              className={`lang-btn ${language === l.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(l.code)}
              title={l.name}
              aria-label={`Switch to ${l.name}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <main className="app-main">
        <div className="container">

          <div className="hero">
            <h1>What's happening<br />with your crop?</h1>
            <p>Describe your problem or upload a photo — get an instant diagnosis.</p>
            <p className="hero-lang-hint">Responses in <strong>{currentLang.name}</strong> — change language in the top right.</p>

          </div>

          <div className="card">
            <div className="field">
              <div className="field-header">
                <label htmlFor="crop-input">Describe the problem</label>
                {/* {speechSupported && (
                  <button
                    className={`mic-btn ${listening ? 'active' : ''}`}
                    onClick={listening ? stopListening : toggleListening}
                    aria-label={listening ? 'Stop recording' : 'Start voice input'}
                  >
                    {listening
                      ? <><MicOff size={13} strokeWidth={2} /> Stop</>
                      : <><Mic size={13} strokeWidth={2} /> Speak</>
                    }
                  </button>
                )} */}
              </div>
              {listening && (
                <div className="listening-indicator" role="status" aria-live="polite">
                  <span className="listening-dot" />
                  Listening in {currentLang.name}…
                </div>
              )}
              <textarea
                id="crop-input"
                placeholder="e.g. My wheat leaves are turning yellow at the tips..."
                value={text}
                onChange={(e) => { setText(e.target.value); setActiveScenario(null); }}
                aria-label="Describe your crop problem"
              />
            </div>

            <div className="divider">or upload a photo</div>

            <div className="field">
              <label
                className={`file-upload ${activeScenario ? 'has-scenario' : ''}`}
                htmlFor="image-upload"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('image-upload').click()}
              >
                {activeScenario
                  ? <ScanSearch size={17} strokeWidth={1.5} className="upload-svg-icon" />
                  : <Camera size={17} strokeWidth={1.5} className="upload-svg-icon" />
                }
                <span className="upload-text">
                  {uploadLabel()
                    ? <strong style={{ color: 'var(--accent)' }}>{uploadLabel()}</strong>
                    : <><strong>Choose image</strong>&nbsp; or drag here</>
                  }
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
                <Loader2 size={16} className="spin-icon" />
                Analyzing your crop…
              </div>
            ) : (
              <button
                className="btn-analyze"
                onClick={analyze}
                disabled={!text && !image && !activeScenario}
                aria-label="Analyze crop problem"
              >
                <Leaf size={15} strokeWidth={1.5} />
                Analyze
              </button>
            )}

            {error && (
              <div className="error-box" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="result-card" role="region" aria-label="Analysis Result">
              <div className="result-header">
                <h2>Analysis</h2>
                <div className="result-header-right">
                  <span className={`urgency-badge ${urgencyClass}`}>
                    {result.urgency} urgency
                  </span>
                  {ttsSupported && (
                    <button
                      className={`tts-btn ${speaking ? 'active' : ''}`}
                      onClick={speakResult}
                      aria-label={speaking ? 'Stop reading' : 'Read result aloud'}
                    >
                      {speaking
                        ? <><VolumeX size={13} strokeWidth={2} /> Stop</>
                        : <><Volume2 size={13} strokeWidth={2} /> Listen</>
                      }
                    </button>
                  )}
                </div>
              </div>

              <div className="result-body">
                {/* Confidence hint */}
                {showLowConfidenceHint && (
                  <div className="confidence-hint" role="note">
                    <AlertCircle size={13} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>This diagnosis is based on limited information. For a more accurate result, try adding more details or uploading a photo of the affected area.</span>
                  </div>
                )}

                <div className="result-item">
                  <span className="item-label">Diagnosis</span>
                  <span className="item-value">{result.diagnosis}</span>
                </div>
                <div className="result-item">
                  <span className="item-label">Recommended Action</span>
                  <span className="item-value">{result.action}</span>
                </div>

                {/* Confidence bar */}
                {/* <div className="confidence-row">
                  <span className="item-label">AI Confidence</span>
                  <div className="confidence-bar-wrap">
                    <div className={`confidence-bar ${confidenceClass}`} />
                  </div>
                  <span className={`confidence-label ${confidenceClass}`}>{result.confidence}</span>
                </div> */}

                {/* Share row */}
                <div className="share-row">
                  <button className="share-btn whatsapp" onClick={handleWhatsApp} aria-label="Share on WhatsApp">
                    <MessageCircle size={13} strokeWidth={2} />
                    WhatsApp
                  </button>
                  <button className="share-btn copy" onClick={handleCopy} aria-label="Copy to clipboard">
                    <Copy size={13} strokeWidth={2} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scenarios */}
          <div className="scenarios-section">
            <div className="scenarios-label">Or try a sample scenario</div>
            <div className="scenarios-grid">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  className={`scenario-card ${activeScenario === s.id ? 'active' : ''}`}
                  onClick={() => handleScenario(s)}
                  aria-label={`Load scenario: ${s.title}`}
                >
                  <img src={s.image} alt={s.title} className="scenario-img" />
                  <div className="scenario-info">
                    <span className="scenario-title">{s.title}</span>
                    <span className="scenario-desc">{s.description}</span>
                  </div>
                  {activeScenario === s.id && (
                    <span className="scenario-check">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="app-footer">
        <span>Built by <strong style={{ color: 'var(--text-primary)' }}>Pavan</strong> for PromptWars · Powered by Vertex AI</span>
        <div className="footer-links">
          <a href="https://www.linkedin.com/in/pavan-b-mce/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/linkedin.svg" width="16" height="16" alt="LinkedIn" style={{ filter: 'invert(35%) sepia(50%) saturate(400%) hue-rotate(90deg)' }} />
            LinkedIn
          </a>
          <span className="footer-dot">·</span>
          <a href="https://github.com/Pawon25" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <img src="https://cdn.simpleicons.org/github/3d6b3f" width="16" height="16" alt="GitHub" />
            GitHub
          </a>
          <span className="footer-dot">·</span>
          <a href="https://pawon25.github.io/Pavans_Portfolio/" target="_blank" rel="noopener noreferrer" aria-label="Portfolio">
            <Globe size={13} strokeWidth={1.5} style={{ color: '#3d6b3f' }} /> Portfolio
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;