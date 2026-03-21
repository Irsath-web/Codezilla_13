import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Volume2, Save, Camera, CameraOff, Zap, Hand } from 'lucide-react';
import { signApi } from '../api';
import toast from 'react-hot-toast';

/* ── types ── */
declare global {
    interface Window {
        Hands: any;
        Camera: any;
        drawConnectors: any;
        drawLandmarks: any;
        HAND_CONNECTIONS: any;
    }
}

const SIGN_WORDS = [
    'Hello', 'Thank You', 'Help', 'Yes', 'No', 'Please', 'Sorry',
    'Water', 'Food', 'Good', 'Bad', 'Stop', 'Go', 'Love', 'Friend',
    'Family', 'Home', 'School', 'Work', 'Doctor',
];

// Common English words for prediction
const WORD_DICT = [
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'come', 'could',
    'day', 'did', 'do', 'does', 'eat', 'for', 'from', 'get', 'give', 'go',
    'good', 'great', 'have', 'he', 'hello', 'help', 'her', 'here', 'him',
    'his', 'home', 'how', 'i', 'if', 'in', 'is', 'it', 'just', 'know',
    'let', 'like', 'love', 'make', 'me', 'more', 'my', 'name', 'need',
    'no', 'not', 'now', 'of', 'ok', 'okay', 'on', 'one', 'or', 'our',
    'out', 'please', 'right', 'said', 'see', 'she', 'so', 'some', 'sorry',
    'that', 'the', 'their', 'them', 'then', 'there', 'they', 'this', 'time',
    'to', 'up', 'us', 'very', 'was', 'we', 'well', 'what', 'when', 'where',
    'who', 'will', 'with', 'yes', 'you', 'your', 'thank', 'want', 'can',
    'call', 'come', 'back', 'safe', 'wait', 'stop', 'fine', 'sure', 'okay',
    'help', 'pain', 'sick', 'hurt', 'bad', 'emergency', 'doctor', 'water',
    'food', 'hospital', 'ambulance', 'family', 'friend', 'phone', 'number',
    'address', 'location', 'name', 'age', 'blood', 'medicine', 'allergy',
];

function predictWords(prefix: string): string[] {
    if (!prefix || prefix.length < 1) return [];
    const lower = prefix.toLowerCase();
    const matches = WORD_DICT.filter(w => w.startsWith(lower) && w !== lower);
    // Sort shorter matches first
    matches.sort((a, b) => a.length - b.length);
    return matches.slice(0, 6);
}

const ASL_DESCRIPTIONS: Record<string, string> = {
    A: 'Closed fist, thumb to side', B: 'Four fingers up, thumb across palm',
    C: 'Curved hand like letter C', D: 'Index up, others curl to touch thumb',
    E: 'All fingers curled, thumb under', F: 'Index-thumb circle, others up',
    G: 'Index+thumb point sideways', H: 'Index+middle extended horizontal',
    I: 'Only pinky extended', J: 'Pinky extended, trace J motion',
    K: 'Index+middle up, thumb between', L: 'L-shape: index up, thumb out',
    M: 'Three fingers over thumb', N: 'Two fingers over thumb',
    O: 'All fingers form O shape', P: 'K pointing down',
    Q: 'G pointing down', R: 'Index+middle crossed',
    S: 'All closed, thumb over fingers', T: 'Thumb between index+middle',
    U: 'Index+middle up, together', V: 'Index+middle spread (peace)',
    W: 'Index+middle+ring spread', X: 'Index crooked/hooked',
    Y: 'Thumb+pinky out (hang loose)', Z: 'Index traces Z in air',
};

/* ─────────── ASL Gesture Classifier ─────────── */
function classifyASL(landmarks: any[]): { letter: string; confidence: number; isSpace: boolean } {
    if (!landmarks || landmarks.length < 21) return { letter: '?', confidence: 0, isSpace: false };

    const lm = landmarks;
    const wrist = lm[0];

    // Finger tips / pip / mcp indices
    const tips = [4, 8, 12, 16, 20];
    const pips = [3, 6, 10, 14, 18];
    const mcps = [2, 5, 9, 13, 17];

    // Is each finger "up" (tip above PIP joint)?
    const fingerUp = tips.map((tipIdx, f) => {
        if (f === 0) {
            // Thumb: compare tip x relative to mcp x (mirrored camera)
            return lm[4].x < lm[3].x;
        }
        return lm[tipIdx].y < lm[pips[f]].y - 0.02;
    });

    const [thumb, idx, mid, ring, pinky] = fingerUp;

    // Useful distances
    const d = (a: number, b: number) =>
        Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);

    const thumbIndexDist = d(4, 8);
    const thumbMiddleDist = d(4, 12);
    const indexMiddleSpread = Math.abs(lm[8].x - lm[12].x);

    /** Rule-based matching */
    // B: all 4 fingers fully up, thumb down
    if (idx && mid && ring && pinky && !thumb) return { letter: 'B', confidence: 95 };

    // W: index+middle+ring up
    if (idx && mid && ring && !pinky && !thumb) return { letter: 'W', confidence: 90 };

    // V/U: index+middle up
    if (idx && mid && !ring && !pinky) {
        if (indexMiddleSpread > 0.07) return { letter: 'V', confidence: 88 };
        return { letter: 'U', confidence: 85 };
    }

    // L: index+thumb up
    if (idx && !mid && !ring && !pinky && thumb) return { letter: 'L', confidence: 90 };

    // Y: thumb+pinky
    if (!idx && !mid && !ring && pinky && thumb) return { letter: 'Y', confidence: 90 };

    // I: only pinky
    if (!idx && !mid && !ring && pinky && !thumb) return { letter: 'I', confidence: 88 };

    // D: only index up (no thumb)
    if (idx && !mid && !ring && !pinky && !thumb) return { letter: 'D', confidence: 82 };

    // G/Z: index + horizontal point (index up, thumb side)
    if (idx && !mid && !ring && !pinky && thumb && lm[8].y > wrist.y - 0.1) return { letter: 'G', confidence: 80 };

    // K: index+middle up, with thumb to middle
    if (idx && mid && !ring && !pinky && thumb) return { letter: 'K', confidence: 85 };

    // R: index+middle up but crossed
    if (idx && mid && !ring && !pinky && lm[8].x < lm[12].x + 0.02) return { letter: 'R', confidence: 80 };

    // F: thumb-index pinch, others up
    if (!idx && mid && ring && pinky && thumbIndexDist < 0.07) return { letter: 'F', confidence: 82 };

    // All fingers closed (various fist letters)
    if (!idx && !mid && !ring && !pinky) {
        // A: thumb to side
        if (thumb && lm[4].y > lm[5].y) return { letter: 'A', confidence: 85 };
        // O: thumb touching index
        if (thumbIndexDist < 0.06) return { letter: 'O', confidence: 80 };
        // S: thumb over fingers (high thumb)
        if (lm[4].y < lm[8].y) return { letter: 'S', confidence: 80 };
        // E: all very tightly closed
        return { letter: 'E', confidence: 75 };
    }

    // C: all slightly curved (tips between fully up and full fist)
    const allPartial = !idx && !mid && !ring && !pinky &&
        lm[8].y < wrist.y && lm[12].y < wrist.y;
    if (allPartial && thumbIndexDist > 0.08 && thumbIndexDist < 0.2) return { letter: 'C', confidence: 75 };

    // H: index+middle horizontal (both low height, similar y)
    if (idx && mid && !ring && !pinky && Math.abs(lm[8].y - lm[12].y) < 0.04) return { letter: 'H', confidence: 78 };

    // T: thumb pokes between index+middle
    if (!idx && !mid && !ring && !pinky && thumbMiddleDist < 0.09) return { letter: 'T', confidence: 76 };

    // M/N: fingers curled over thumb
    if (!idx && !mid && !ring && !pinky && !thumb) return { letter: 'M', confidence: 70 };

    // P: index+thumb, pointing down
    if (idx && !mid && !ring && !pinky && thumb && lm[8].y > wrist.y + 0.05) return { letter: 'P', confidence: 75, isSpace: false };

    // X: only index slightly bent
    if (!mid && !ring && !pinky && lm[8].y < wrist.y) return { letter: 'X', confidence: 70, isSpace: false };

    // ✋ OPEN PALM = SPACE (all 5 fingers up, spread)
    const allUp = idx && mid && ring && pinky && thumb;
    if (allUp) return { letter: ' ', confidence: 90, isSpace: true };

    return { letter: '?', confidence: 0, isSpace: false };
}

/* ─────────── Component ─────────── */
export default function SignLanguagePage() {
    const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
    const [sentence, setSentence] = useState('');
    const [currentWord, setCurrentWord] = useState('');   // letters being typed now
    const [predictions, setPredictions] = useState<string[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [mpLoaded, setMpLoaded] = useState(false);
    const [mpLoading, setMpLoading] = useState(false);
    const [detected, setDetected] = useState<{ letter: string; confidence: number; isSpace: boolean } | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [manualSign, setManualSign] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const bufferRef = useRef<{ letter: string; count: number }>({ letter: '', count: 0 });
    const lastSpokenRef = useRef<string>('');
    const lastSentRef = useRef<number>(0);
    const currentWordRef = useRef<string>('');  // mirror of currentWord for use inside callbacks
    const spaceHeldRef = useRef<number>(0);   // frames open-palm held

    /* ── Load MediaPipe from CDN ── */
    const loadMediaPipe = useCallback((): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.Hands) { resolve(); return; }
            setMpLoading(true);

            const loadScript = (src: string) =>
                new Promise<void>((res, rej) => {
                    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
                    const s = document.createElement('script');
                    s.src = src; s.crossOrigin = 'anonymous';
                    s.onload = () => res();
                    s.onerror = () => rej(new Error(`Failed to load ${src}`));
                    document.head.appendChild(s);
                });

            Promise.all([
                loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js'),
                loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js'),
                loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js'),
            ])
                .then(() => { setMpLoaded(true); setMpLoading(false); resolve(); })
                .catch(e => { setMpLoading(false); reject(e); });
        });
    }, []);

    /* ── Auto-speak helper ── */
    const speakLetter = useCallback((text: string) => {
        if (!autoSpeak || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.85; utt.pitch = 1;
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
    }, [autoSpeak]);

    /* ── MediaPipe onResults ── */
    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Draw mirrored video
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Scan line
        const st = (Date.now() % 2000) / 2000;
        const sg = ctx.createLinearGradient(0, st * canvas.height - 4, 0, st * canvas.height + 4);
        sg.addColorStop(0, 'transparent');
        sg.addColorStop(0.5, 'rgba(6,182,212,0.5)');
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.fillRect(0, st * canvas.height - 4, canvas.width, 8);

        // Corner brackets
        const cw = canvas.width, ch = canvas.height, len = 36;
        ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        [[0, 0], [cw, 0], [0, ch], [cw, ch]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.moveTo(x === 0 ? x + len : x - len, y); ctx.lineTo(x, y);
            ctx.lineTo(x, y === 0 ? y + len : y - len);
            ctx.stroke();
        });

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // Draw using MediaPipe drawing_utils (mirrored)
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            if (window.drawConnectors && window.HAND_CONNECTIONS) {
                window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS,
                    { color: 'rgba(124,58,237,0.7)', lineWidth: 2 });
                window.drawLandmarks(ctx, landmarks,
                    { color: '#06B6D4', fillColor: '#7C3AED', lineWidth: 1, radius: 4 });
            }
            ctx.restore();

            // Classify
            const result = classifyASL(landmarks);
            setDetected(result);

            if (result.isSpace) {
                // ✋ Open palm = SPACE — hold 20 frames to commit word
                spaceHeldRef.current++;
                if (spaceHeldRef.current === 20) {
                    const word = currentWordRef.current.trim();
                    if (word) {
                        setSentence(prev => (prev ? prev + ' ' : '') + word);
                        setCurrentWord('');
                        currentWordRef.current = '';
                        setPredictions([]);
                        speakLetter(word);
                        toast.success(`Word: "${word}"`, { duration: 1000, icon: '💬' });
                    }
                    spaceHeldRef.current = 0;
                }
                bufferRef.current = { letter: '', count: 0 };
            } else if (result.letter !== '?' && result.confidence > 72) {
                spaceHeldRef.current = 0;
                // Stability buffer: letter must hold for ~25 frames (~1s)
                if (bufferRef.current.letter === result.letter) {
                    bufferRef.current.count++;
                    if (bufferRef.current.count === 25) {
                        const now = Date.now();
                        if (result.letter !== lastSpokenRef.current || now - lastSentRef.current > 2000) {
                            // Add letter to current word
                            const newWord = currentWordRef.current + result.letter;
                            setCurrentWord(newWord);
                            currentWordRef.current = newWord;
                            setPredictions(predictWords(newWord));
                            speakLetter(result.letter);
                            lastSpokenRef.current = result.letter;
                            lastSentRef.current = now;
                            toast.success(`Letter: ${result.letter}`, { duration: 600, icon: '🤟' });
                        }
                    }
                } else {
                    bufferRef.current = { letter: result.letter, count: 1 };
                }
            } else {
                spaceHeldRef.current = 0;
                bufferRef.current = { letter: '', count: 0 };
            }

            // Draw detected letter on canvas
            if (result.letter !== '?') {
                const boxW = 90, boxH = 52;
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.beginPath();
                ctx.roundRect(canvas.width - boxW - 12, 12, boxW, boxH, 10);
                ctx.fill();
                ctx.font = 'bold 36px Inter,sans-serif';
                ctx.textAlign = 'center';
                const grad = ctx.createLinearGradient(canvas.width - 57, 0, canvas.width - 57 + 80, 0);
                grad.addColorStop(0, '#7C3AED'); grad.addColorStop(1, '#06B6D4');
                ctx.fillStyle = grad;
                ctx.fillText(result.letter, canvas.width - boxW / 2 - 12, 52);
                ctx.font = '11px Inter,sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`${result.confidence}% conf`, canvas.width - boxW / 2 - 12, 66);
                ctx.textAlign = 'left';

                // Progress bar for stability
                const progress = Math.min(bufferRef.current.count / 25, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(canvas.width - boxW - 12, 66, boxW, 6);
                ctx.fillStyle = progress === 1 ? '#10b981' : '#7C3AED';
                ctx.fillRect(canvas.width - boxW - 12, 66, boxW * progress, 6);
            }
        } else {
            setDetected(null);
            bufferRef.current = { letter: '', count: 0 };
            spaceHeldRef.current = 0;

            // No hand message
            ctx.font = '14px Inter,sans-serif';
            ctx.fillStyle = 'rgba(148,163,184,0.8)';
            ctx.textAlign = 'center';
            ctx.fillText('👋 Show your hand to the camera', canvas.width / 2, canvas.height - 20);
            ctx.textAlign = 'left';
        }
    }, [speakLetter]);

    /* ── Start camera + MediaPipe ── */
    const startCamera = async () => {
        setCameraError(null);
        try {
            await loadMediaPipe();
        } catch (e) {
            setCameraError('Failed to load MediaPipe AI. Check internet connection.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Init MediaPipe Hands
            const hands = new window.Hands({
                locateFile: (file: string) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
            });
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5,
            });
            hands.onResults(onResults);
            handsRef.current = hands;

            // Use MediaPipe Camera to send frames
            if (window.Camera && videoRef.current) {
                const cam = new window.Camera(videoRef.current, {
                    onFrame: async () => {
                        if (handsRef.current && videoRef.current) {
                            await handsRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 640,
                    height: 480,
                });
                cam.start();
                cameraRef.current = cam;
            }

            setCameraOn(true);
            toast.success('🤟 Camera + AI ready! Show your hand.');
        } catch (err: unknown) {
            const e = err as Error;
            setCameraError(e.name === 'NotAllowedError'
                ? 'Camera permission denied. Please allow camera access in your browser.'
                : 'Camera error: ' + e.message);
        }
    };

    const stopCamera = () => {
        cameraRef.current?.stop();
        cameraRef.current = null;
        handsRef.current?.close();
        handsRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
        setDetected(null);
    };

    useEffect(() => () => stopCamera(), []);

    /* ── Start session ── */
    const startSession = async () => {
        try {
            const res = await signApi.startSession();
            setSessionId(res.data.sessionId);
            toast.success('Session saved to MongoDB!');
        } catch { toast('Offline mode.', { icon: '⚡' }); }
    };

    /* ── Manual mode select ── */
    const handleManual = (sign: string, type: 'alphabet' | 'word' = 'alphabet') => {
        setManualSign(sign);
        if (type === 'word') {
            // Commit current word first if any, then add the sign word
            const prefix = currentWord.trim();
            if (prefix) {
                setSentence(prev => (prev ? prev + ' ' : '') + prefix + ' ' + sign);
                setCurrentWord('');
                currentWordRef.current = '';
            } else {
                setSentence(prev => (prev ? prev + ' ' : '') + sign);
            }
        } else {
            // Letter – add to current-word buffer
            const newWord = currentWord + sign;
            setCurrentWord(newWord);
            currentWordRef.current = newWord;
            setPredictions(predictWords(newWord));
        }
        speakLetter(sign);
    };

    /* ── Accept a word prediction ── */
    const acceptPrediction = (word: string) => {
        const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
        setSentence(prev => (prev ? prev + ' ' : '') + capitalized);
        setCurrentWord('');
        currentWordRef.current = '';
        setPredictions([]);
        speakLetter(capitalized);
        toast.success(`Word: "${capitalized}"`, { duration: 800, icon: '💬' });
    };

    /* ── Commit currentWord as a space ── */
    const commitWord = () => {
        const word = currentWord.trim();
        if (!word) return;
        setSentence(prev => (prev ? prev + ' ' : '') + word);
        setCurrentWord('');
        currentWordRef.current = '';
        setPredictions([]);
        speakLetter(word);
    };

    /* ── Speak full sentence ── */
    const speakSentence = () => {
        if (!sentence) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(sentence);
        utt.rate = 0.85;
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
    };

    const saveSession = async () => {
        if (!sentence) { toast.error('Nothing to save'); return; }
        try {
            if (sessionId) {
                await signApi.updateSentence(sessionId, sentence, 60);
                toast.success('Session saved to MongoDB!');
            } else {
                toast('Connect server to save.', { icon: '⚡' });
            }
        } catch { toast.error('Save failed'); }
    };

    return (
        <div className="feature-page">
            {/* Header */}
            <div className="feature-header">
                <div className="feature-title-row">
                    <div className="feature-icon-badge" style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4' }}>🤟</div>
                    <div>
                        <h1 className="feature-title">Sign Language Recognition</h1>
                        <p className="feature-subtitle">
                            {cameraOn
                                ? mpLoaded
                                    ? '🧠 AI active — spell letters → ✋ open palm to commit word'
                                    : '⏳ Loading AI model...'
                                : 'Sign → letter → word → sentence. Open palm (✋) = SPACE between words'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Auto-speak toggle */}
                    <button
                        className={`toggle-btn ${autoSpeak ? 'toggle-on' : ''}`}
                        onClick={() => setAutoSpeak(v => !v)}
                        id="autospeak-toggle"
                        title="Auto-speak detected letters"
                    >
                        🔊 Auto-Speak {autoSpeak ? 'ON' : 'OFF'}
                    </button>
                    <button
                        className="btn-primary-sm"
                        onClick={cameraOn ? stopCamera : startCamera}
                        id="toggle-camera"
                        style={cameraOn ? { background: 'linear-gradient(135deg,#ef4444,#dc2626)' } : {}}
                    >
                        {cameraOn ? <><CameraOff size={15} /> Stop</> : <><Camera size={15} /> Open Camera</>}
                    </button>
                    <button className="btn-primary-sm" onClick={startSession} id="start-session"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
                        <Zap size={15} /> Session
                    </button>
                </div>
            </div>

            {cameraError && (
                <div className="camera-error-banner">
                    <span>⚠️ {cameraError}</span>
                    <button onClick={() => setCameraError(null)}>✕</button>
                </div>
            )}

            {/* Mode tabs */}
            <div className="tab-row">
                <button className={`tab-btn ${activeTab === 'camera' ? 'tab-active' : ''}`} id="tab-cam"
                    onClick={() => setActiveTab('camera')}>📷 Camera Mode (AI)</button>
                <button className={`tab-btn ${activeTab === 'manual' ? 'tab-active' : ''}`} id="tab-manual"
                    onClick={() => setActiveTab('manual')}>⌨️ Manual Mode</button>
            </div>

            <div className="page-layout">
                {/* LEFT */}
                <div className="page-left">
                    {activeTab === 'camera' && (
                        <div className="camera-how-it-works">
                            <h3 className="section-label">🎯 How Real-Time Detection Works</h3>
                            <div className="how-steps">
                                <div className="how-step"><span className="hs-num">1</span><span>Click <strong>Open Camera</strong> and allow permission</span></div>
                                <div className="how-step"><span className="hs-num">2</span><span>MediaPipe AI loads (21-point hand skeleton)</span></div>
                                <div className="how-step"><span className="hs-num">3</span><span>Hold your ASL hand sign for ~1 second</span></div>
                                <div className="how-step"><span className="hs-num">4</span><span>Letter is <strong>detected, added & spoken</strong> automatically</span></div>
                            </div>

                            {/* Current detection status */}
                            {cameraOn && (
                                <div className="detection-status-card">
                                    <div className="dsc-row">
                                        <span className="dsc-label">Detecting:</span>
                                        <span className={`dsc-val ${detected ? 'dsc-active' : ''}`}>
                                            {detected && detected.letter !== '?' && !detected.isSpace
                                                ? `🤟 "${detected.letter}" (${detected.confidence}%)`
                                                : detected?.isSpace
                                                    ? '✋ Open palm — hold to add SPACE'
                                                    : '👋 Show hand to camera'}
                                        </span>
                                    </div>
                                    <div className="dsc-row">
                                        <span className="dsc-label">Current word:</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#a78bfa', letterSpacing: '0.15em', fontWeight: 700 }}>
                                            {currentWord || <span style={{ opacity: 0.4, fontWeight: 400 }}>—</span>}
                                        </span>
                                    </div>
                                    <div className="dsc-row">
                                        <span className="dsc-label">Hold progress:</span>
                                        <div className="hold-bar">
                                            <div className="hold-fill"
                                                style={{ width: `${Math.min(bufferRef.current.count / 25 * 100, 100)}%` }}>
                                            </div>
                                        </div>
                                        <span className="dsc-hint">Hold 1s to add</span>
                                    </div>
                                    <div className="dsc-row">
                                        <span className="dsc-label">Auto-Speak:</span>
                                        <span style={{ color: autoSpeak ? '#10b981' : '#64748b', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {autoSpeak ? '🔊 ON' : '🔇 OFF'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!cameraOn && (
                                <div className="camera-start-prompt" onClick={startCamera} id="cam-start-prompt">
                                    <div className="csp-icon">📷</div>
                                    <div className="csp-title">Click to Start Camera + AI</div>
                                    <div className="csp-sub">Loads MediaPipe hand tracking from CDN</div>
                                    {mpLoading && <div className="csp-loading">Loading AI model... please wait</div>}
                                </div>
                            )}

                            {/* ASL guide */}
                            <div className="asl-mini-guide">
                                <div className="section-label">Quick ASL Reference</div>
                                <div className="asl-guide-grid">
                                    {['A', 'B', 'C', 'D', 'I', 'L', 'U', 'V', 'W', 'Y'].map(ltr => (
                                        <div className="asl-guide-item" key={ltr}>
                                            <div className="agi-letter">{ltr}</div>
                                            <div className="agi-desc">{ASL_DESCRIPTIONS[ltr]?.split(',')[0]}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'manual' && (
                        <>
                            <div className="sign-section">
                                <div className="section-label">🔤 A–Z Alphabet — tap to add & speak</div>
                                <div className="alphabet-grid-react">
                                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                        <button key={l} id={`letter-${l}`}
                                            className={`alpha-btn ${manualSign === l ? 'alpha-selected' : ''}`}
                                            onClick={() => handleManual(l, 'alphabet')}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="sign-section">
                                <div className="section-label">💬 Sign Words</div>
                                <div className="words-grid">
                                    {SIGN_WORDS.map(w => (
                                        <button key={w} id={`word-${w.toLowerCase()}`}
                                            className={`word-btn ${manualSign === w ? 'word-selected' : ''}`}
                                            onClick={() => handleManual(w, 'word')}>
                                            {w}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sentence builder */}
                    <div className="sentence-builder-box">
                        <div className="sb-header">
                            <span>📝 Sentence Builder</span>
                            {sessionId && <span className="session-badge">🟢 Session Active</span>}
                        </div>

                        {/* Current word being typed */}
                        {currentWord && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px 12px', background: 'rgba(124,58,237,0.1)', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.25)' }}>
                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Typing:</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.15em' }}>{currentWord}</span>
                                <button onClick={commitWord} style={{ marginLeft: 'auto', background: 'rgba(124,58,237,0.3)', border: 'none', borderRadius: '6px', color: '#a78bfa', padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem' }}
                                    id="commit-word">Add Word ✓</button>
                            </div>
                        )}

                        {/* Word predictions */}
                        {predictions.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.72rem', opacity: 0.5, alignSelf: 'center' }}>Predict:</span>
                                {predictions.map(w => (
                                    <button key={w} onClick={() => acceptPrediction(w)}
                                        id={`pred-${w}`}
                                        style={{
                                            background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                                            borderRadius: '20px', padding: '3px 12px', cursor: 'pointer',
                                            color: '#06B6D4', fontSize: '0.8rem', fontWeight: 600,
                                            transition: 'all 0.15s',
                                        }}
                                    >{w}</button>
                                ))}
                            </div>
                        )}

                        <div className="sb-output" style={{ fontSize: sentence.length > 30 ? '0.9rem' : '1.05rem' }}>
                            {sentence || 'Detected letters form words. Open palm (✋) → space between words.'}
                        </div>
                        <div className="sb-actions">
                            <button className={`action-btn ${isSpeaking ? 'speaking' : ''}`} onClick={speakSentence} id="speak-sentence">
                                <Volume2 size={16} /> {isSpeaking ? 'Speaking...' : 'Speak All'}
                            </button>
                            <button className="action-btn" onClick={() => { setSentence(''); setCurrentWord(''); currentWordRef.current = ''; setPredictions([]); setManualSign(null); }} id="clear-sentence">
                                <RotateCcw size={16} /> Clear
                            </button>
                            <button className="action-btn" onClick={() => {
                                if (currentWord) {
                                    setCurrentWord(w => w.slice(0, -1));
                                    const newWord = currentWord.slice(0, -1);
                                    currentWordRef.current = newWord;
                                    setPredictions(predictWords(newWord));
                                } else {
                                    setSentence(s => s.slice(0, s.lastIndexOf(' ') + 1 || 0));
                                }
                            }} id="backspace-sentence">
                                ⌫ Back
                            </button>
                            <button className="action-btn primary-action" onClick={saveSession} id="save-session">
                                <Save size={16} /> Save to DB
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT — camera */}
                <div className="page-right">
                    <div className="camera-container" style={{ minHeight: '340px' }}>
                        {!cameraOn && (
                            <div className="camera-placeholder" onClick={startCamera}>
                                <div className="cp-icon">📷</div>
                                <div className="cp-title">{mpLoading ? 'Loading AI...' : 'Open Camera'}</div>
                                <div className="cp-sub">MediaPipe AI detects &amp; speaks your signs</div>
                                {!mpLoading && (
                                    <button className="btn-primary-sm" style={{ marginTop: '10px' }}>
                                        <Camera size={14} /> Start
                                    </button>
                                )}
                                {mpLoading && <div className="mp-spinner"></div>}
                            </div>
                        )}
                        <div className={cameraOn ? 'camera-live-wrap cam-visible' : 'camera-live-wrap cam-hidden'}>
                            <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />
                            <canvas ref={canvasRef} id="sign-canvas" className="sign-canvas" />
                            {cameraOn && <div className="live-badge"><div className="live-dot"></div> LIVE · AI</div>}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="info-cards">
                        <div className="info-card"><span className="ic-icon">🧠</span><span className="ic-text"><strong>MediaPipe Hands</strong> — 21 keypoint real-time tracking at 30 FPS</span></div>
                        <div className="info-card"><span className="ic-icon">✋</span><span className="ic-text">Hold each ASL letter <strong>~1 second</strong> to add it to the current word</span></div>
                        <div className="info-card"><span className="ic-icon">🖐</span><span className="ic-text">Show <strong>open palm (all fingers up)</strong> for ~1s to add a space / commit word</span></div>
                        <div className="info-card"><span className="ic-icon">💡</span><span className="ic-text"><strong>Word predictions</strong> appear as you spell — tap to complete quickly</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
