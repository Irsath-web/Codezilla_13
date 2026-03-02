import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Save, RotateCcw, ZoomIn, X, CheckCircle } from 'lucide-react';
import { ocrApi } from '../api';
import toast from 'react-hot-toast';
import { createWorker } from 'tesseract.js';
// @ts-ignore — Vite ?url import for pdfjs worker (v5 ships .mjs only)
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as pdfjsLib from 'pdfjs-dist';

// Use the local bundled worker — avoids CDN version mismatch (pdfjs-dist v5)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

type FileStage = 'idle' | 'uploading' | 'ocr' | 'done' | 'error';

export default function OCRPage() {
    const [text, setText] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [rate, setRate] = useState(1);
    const [pitch, setPitch] = useState(1);
    const [volume, setVolume] = useState(1);
    const [fontSize, setFontSize] = useState(16);
    const [saved, setSaved] = useState(false);
    const [stage, setStage] = useState<FileStage>('idle');
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const autoReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel();
            if (autoReadTimer.current) clearTimeout(autoReadTimer.current);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, []);

    // ── Start 3-second countdown then speak ──
    const scheduleAutoRead = useCallback((extractedText: string) => {
        if (autoReadTimer.current) clearTimeout(autoReadTimer.current);
        if (countdownTimer.current) clearInterval(countdownTimer.current);

        let secs = 3;
        setCountdown(secs);

        countdownTimer.current = setInterval(() => {
            secs -= 1;
            if (secs <= 0) {
                clearInterval(countdownTimer.current!);
                setCountdown(null);
            } else {
                setCountdown(secs);
            }
        }, 1000);

        autoReadTimer.current = setTimeout(() => {
            setCountdown(null);
            speak(extractedText);
        }, 3000);
    }, []);

    // ── Speak ──
    const speak = (overrideText?: string) => {
        const target = overrideText ?? text;
        if (!target.trim()) { toast.error('No text to read'); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(target);
        utt.rate = rate; utt.pitch = pitch; utt.volume = volume;
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        utt.onerror = () => setIsSpeaking(false);
        utterRef.current = utt;
        window.speechSynthesis.speak(utt);
    };

    const stopSpeak = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

    // ── OCR an image (canvas / blob URL) via Tesseract.js ──
    const runTesseract = async (imageSource: string | HTMLCanvasElement): Promise<string> => {
        const worker = await createWorker('eng', 1, {
            logger: (m: { status: string; progress: number }) => {
                if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
            },
        });
        const result = await worker.recognize(imageSource);
        await worker.terminate();
        return result.data.text;
    };

    // ── Convert first N pages of PDF → canvas → OCR ──
    const extractPdfText = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        const maxPages = Math.min(pdf.numPages, 5);
        let allText = '';

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            toast(`Scanning page ${pageNum} of ${maxPages}…`, { icon: '📄', id: `page-${pageNum}` });
            const page = await pdf.getPage(pageNum);

            // ── Strategy 1: native PDF text layer (instant, perfect quality) ──
            try {
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: unknown) => {
                        const i = item as { str?: string; hasEOL?: boolean };
                        return (i.str ?? '') + (i.hasEOL ? '\n' : ' ');
                    })
                    .join('')
                    .trim();

                if (pageText.length > 20) {
                    allText += `\n\n[Page ${pageNum}]\n` + pageText;
                    setProgress(Math.round((pageNum / maxPages) * 100));
                    continue; // skip Tesseract if we got good native text
                }
            } catch (_) { /* fall through to image OCR */ }

            // ── Strategy 2: render page as image → Tesseract OCR ──
            const viewport = page.getViewport({ scale: 2.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d')!;
            await page.render({ canvasContext: ctx, viewport }).promise;

            const ocrText = await runTesseract(canvas);
            allText += `\n\n[Page ${pageNum}]\n` + ocrText;
            setProgress(Math.round((pageNum / maxPages) * 100));
        }

        if (pdf.numPages > 5) allText += `\n\n(Showing first 5 of ${pdf.numPages} pages)`;
        return allText.trim();
    };

    // ── Main file handler ──
    const processFile = async (file: File) => {
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            toast.error('Please upload an image (PNG/JPG/WEBP) or a PDF file.');
            return;
        }

        // Reset state
        setText('');
        setSaved(false);
        setStage('uploading');
        setProgress(0);
        setFileName(file.name);
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        if (autoReadTimer.current) clearTimeout(autoReadTimer.current);
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        setCountdown(null);

        // Preview for images
        if (isImage) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null);
        }

        try {
            setStage('ocr');
            let extracted = '';

            if (isPDF) {
                extracted = await extractPdfText(file);
            } else {
                const url = URL.createObjectURL(file);
                extracted = await runTesseract(url);
                URL.revokeObjectURL(url);
            }

            const cleaned = extracted.replace(/\s+/g, ' ').trim();
            if (!cleaned) {
                toast.error('No text could be extracted. Try a clearer image.');
                setStage('error');
                return;
            }

            setText(cleaned);
            setStage('done');
            setProgress(100);
            toast.success(`✅ OCR complete — ${cleaned.split(' ').length} words extracted!`);
            scheduleAutoRead(cleaned);
        } catch (err) {
            console.error(err);
            toast.error('OCR failed. Please try again.');
            setStage('error');
        }
    };

    // Drop / file select handler
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleSave = async () => {
        if (!text.trim()) { toast.error('No text to save'); return; }
        try {
            await ocrApi.save({ extractedText: text, confidence: 87, spokenAloud: isSpeaking });
            toast.success('OCR result saved to MongoDB!');
            setSaved(true);
        } catch { toast('Running offline — connect to server to save.', { icon: '⚡' }); }
    };

    const reset = () => {
        setText(''); setSaved(false); setStage('idle'); setProgress(0);
        setFileName(''); setPreviewUrl(null); setCountdown(null);
        window.speechSynthesis.cancel(); setIsSpeaking(false);
        if (autoReadTimer.current) clearTimeout(autoReadTimer.current);
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Stage label ──
    const stageLabel: Record<FileStage, string> = {
        idle: '📄 Ready to scan',
        uploading: '📂 Loading file…',
        ocr: `🔍 Reading text… ${progress}%`,
        done: '✅ OCR Complete',
        error: '❌ OCR Failed',
    };

    return (
        <div className="feature-page">
            <div className="feature-header">
                <div className="feature-title-row">
                    <div className="feature-icon-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>📖</div>
                    <div>
                        <h1 className="feature-title">OCR Text-to-Speech Reader</h1>
                        <p className="feature-subtitle">Upload an image, screenshot or PDF — Tesseract OCR extracts text and reads it aloud in 3 seconds</p>
                    </div>
                </div>
            </div>

            <div className="page-layout">
                <div className="page-left">

                    {/* ── Upload Zone ── */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        id="ocr-drop-zone"
                        style={{
                            border: `2px dashed ${dragOver ? '#f59e0b' : 'rgba(245,158,11,0.35)'}`,
                            borderRadius: '14px',
                            padding: '2rem 1.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: dragOver ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.03)',
                            transition: 'all 0.2s',
                            marginBottom: '1.25rem',
                            position: 'relative',
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={onFileChange}
                            id="ocr-file-input"
                        />

                        {stage === 'idle' || stage === 'error' ? (
                            <>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                                    {dragOver ? '📂' : '⬆️'}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.4rem' }}>
                                    Drop file here or click to browse
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.55 }}>
                                    Supports: PNG · JPG · WEBP · BMP · PDF
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginTop: '1rem' }}>
                                    {[['📸', 'Screenshot'], ['🖼️', 'Image'], ['📄', 'PDF'], ['📋', 'Scanned Doc']].map(([icon, label]) => (
                                        <span key={label} style={{
                                            padding: '0.3rem 0.7rem', borderRadius: '20px',
                                            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                                            fontSize: '0.75rem', color: '#f59e0b',
                                        }}>{icon} {label}</span>
                                    ))}
                                </div>
                            </>
                        ) : stage === 'uploading' || stage === 'ocr' ? (
                            <div>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                                <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{stageLabel[stage]}</div>
                                {/* Progress bar */}
                                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '20px',
                                        background: 'linear-gradient(90deg,#f59e0b,#ef4444)',
                                        width: `${progress}%`, transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '0.4rem' }}>{fileName}</div>
                            </div>
                        ) : (
                            // Done
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                                <CheckCircle size={24} color="#10b981" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                        {fileName}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#10b981' }}>OCR Complete · {text.split(' ').length} words</div>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); reset(); }}
                                    style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'inherit' }}
                                    title="Upload new file"
                                    id="ocr-reset-btn"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Image Preview ── */}
                    {previewUrl && (
                        <div style={{ marginBottom: '1.25rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(245,158,11,0.2)', maxHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                            <img src={previewUrl} alt="Uploaded preview" style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                    )}

                    {/* ── Extracted Text ── */}
                    <div className="ocr-input-card">
                        <div className="oic-header">
                            <span>📝 Extracted Text</span>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {countdown !== null && (
                                    <span style={{
                                        padding: '3px 10px', borderRadius: '20px',
                                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                                        fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(245,158,11,0.3)',
                                        animation: 'pulse 0.9s ease-in-out infinite',
                                    }}>
                                        🔊 Reading in {countdown}s…
                                    </span>
                                )}
                                <button className="icon-action-btn" onClick={reset} title="Clear all" id="ocr-clear-btn"><RotateCcw size={16} /></button>
                            </div>
                        </div>
                        <textarea
                            className="ocr-textarea-react"
                            id="ocr-text"
                            rows={8}
                            value={text}
                            onChange={e => { setText(e.target.value); setSaved(false); }}
                            placeholder="Upload a file above — extracted text will appear here and be read aloud automatically after 3 seconds…"
                            style={{ fontSize: `${fontSize}px` }}
                        />
                        <div className="word-count">
                            {text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} chars
                        </div>
                    </div>

                    {/* ── Voice Controls ── */}
                    <div className="voice-controls-card">
                        <h3 className="vc-title">🔊 Voice Settings</h3>
                        <div className="vc-grid">
                            <div className="vc-item">
                                <label className="vc-label">Speed: {rate.toFixed(1)}x</label>
                                <input type="range" min="0.5" max="2" step="0.1" value={rate}
                                    onChange={e => setRate(parseFloat(e.target.value))} className="range-slider" id="rate-slider" />
                            </div>
                            <div className="vc-item">
                                <label className="vc-label">Pitch: {pitch.toFixed(1)}</label>
                                <input type="range" min="0.5" max="2" step="0.1" value={pitch}
                                    onChange={e => setPitch(parseFloat(e.target.value))} className="range-slider" id="pitch-slider" />
                            </div>
                            <div className="vc-item">
                                <label className="vc-label">Volume: {Math.round(volume * 100)}%</label>
                                <input type="range" min="0" max="1" step="0.05" value={volume}
                                    onChange={e => setVolume(parseFloat(e.target.value))} className="range-slider" id="volume-slider" />
                            </div>
                            <div className="vc-item">
                                <label className="vc-label">Font Size: {fontSize}px</label>
                                <input type="range" min="12" max="32" step="2" value={fontSize}
                                    onChange={e => setFontSize(parseInt(e.target.value))} className="range-slider" id="font-slider" />
                            </div>
                        </div>
                        <div className="vc-actions">
                            <button className={`btn-speak ${isSpeaking ? 'btn-stop' : ''}`} onClick={isSpeaking ? stopSpeak : () => speak()} id="speak-btn">
                                {isSpeaking ? <><VolumeX size={18} /> Stop Reading</> : <><Volume2 size={18} /> Read Aloud</>}
                            </button>
                            <button className="action-btn" onClick={handleSave} disabled={!text || saved} id="save-ocr">
                                <Save size={16} /> {saved ? 'Saved ✓' : 'Save to DB'}
                            </button>
                            <button className="action-btn" onClick={() => setFontSize(24)} title="Large text mode" id="large-text">
                                <ZoomIn size={16} /> Large Text
                            </button>
                        </div>
                    </div>

                    <div className="info-cards">
                        <div className="info-card"><span className="ic-icon">📸</span><span className="ic-text">Upload screenshots, scanned documents or image files — OCR runs instantly in the browser</span></div>
                        <div className="info-card"><span className="ic-icon">📄</span><span className="ic-text">PDF support: extracts text from native PDFs and uses Tesseract for scanned pages</span></div>
                        <div className="info-card"><span className="ic-icon">🔊</span><span className="ic-text">Text is automatically read aloud 3 seconds after extraction completes</span></div>
                    </div>
                </div>

                {/* ── Right Panel ── */}
                <div className="page-right">
                    <div className="ocr-visual-card">
                        <div className="ocr-scan-anim">
                            <div className="doc-preview">
                                {[85, 92, 78, 88, 65, 91, 74, 82, 79].map((w, i) => (
                                    <div key={i} className={`doc-line-react ${(stage === 'ocr' || isSpeaking) ? 'line-active' : ''}`}
                                        style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                            <div className={`scan-beam-react ${(stage === 'ocr' || isSpeaking) ? 'beam-active' : ''}`} />
                        </div>
                        <div className="ocr-status-display">
                            <div className={`oc-dot ${(stage === 'ocr' || isSpeaking) ? 'oc-active' : ''}`} />
                            <span>{isSpeaking ? '🔊 Reading aloud...' : stageLabel[stage]}</span>
                        </div>

                        {/* OCR progress ring */}
                        {(stage === 'ocr') && (
                            <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
                                <svg width="64" height="64" viewBox="0 0 64 64">
                                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="5" />
                                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="5"
                                        strokeDasharray={`${2 * Math.PI * 26}`}
                                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.3s ease' }}
                                    />
                                    <text x="32" y="37" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">{progress}%</text>
                                </svg>
                            </div>
                        )}

                        {/* Countdown badge */}
                        {countdown !== null && (
                            <div style={{
                                margin: '0.5rem auto', width: '56px', height: '56px', borderRadius: '50%',
                                border: '3px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b',
                                boxShadow: '0 0 18px rgba(245,158,11,0.35)',
                                animation: 'pulse 0.9s ease-in-out infinite',
                            }}>
                                {countdown}
                            </div>
                        )}

                        <div className="tts-waveform-react" id="tts-waveform">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className={`tts-bar ${isSpeaking ? 'tts-bar-active' : ''}`}
                                    style={{ animationDelay: `${i * 0.08}s` }} />
                            ))}
                        </div>
                    </div>

                    <div className="ocr-tips">
                        <h4>💡 Tips for Best OCR Accuracy:</h4>
                        <ul>
                            <li>Use high-resolution screenshots (at least 150 DPI)</li>
                            <li>Ensure text is dark on a light background</li>
                            <li>Avoid blurry, rotated, or shadowed images</li>
                            <li>For PDFs — digital PDFs extract instantly; scanned PDFs use image OCR</li>
                            <li>Max 5 pages processed per PDF</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
