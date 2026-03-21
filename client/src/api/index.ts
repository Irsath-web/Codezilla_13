import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// Attach JWT token from localStorage/zustand persist
api.interceptors.request.use((config) => {
    try {
        const stored = localStorage.getItem('accessai-auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            const token = parsed?.state?.token;
            if (token) config.headers.Authorization = `Bearer ${token}`;
        }
    } catch { /* ignore */ }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('accessai-auth');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ──────────────── Auth ────────────────
export const authApi = {
    register: (data: { name: string; email: string; password: string; disabilityType: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// ──────────────── Users ────────────────
export const userApi = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data: { name: string; disabilityType: string }) =>
        api.put('/users/profile', data),
    updatePreferences: (data: object) => api.put('/users/preferences', data),
    updateEmergencyContacts: (contacts: object[]) =>
        api.put('/users/emergency-contacts', { contacts }),
};

// ──────────────── Sign Language ────────────────
export const signApi = {
    startSession: () => api.post('/signs/session'),
    detectSign: (sessionId: string, sign: string, confidence: number, type = 'alphabet') =>
        api.post('/signs/detect', { sessionId, sign, confidence, type }),
    updateSentence: (sessionId: string, sentence: string, duration: number) =>
        api.put(`/signs/session/${sessionId}/sentence`, { sentence, duration }),
    getHistory: () => api.get('/signs/history'),
    getStats: () => api.get('/signs/stats'),
};

// ──────────────── OCR ────────────────
export const ocrApi = {
    save: (data: { extractedText: string; imageUrl?: string; language?: string; confidence?: number; spokenAloud?: boolean }) =>
        api.post('/ocr/save', data),
    getHistory: () => api.get('/ocr/history'),
    deleteResult: (id: string) => api.delete(`/ocr/${id}`),
};

// ──────────────── SOS ────────────────
export const sosApi = {
    trigger: (triggerMethod: string, location: { lat: number; lng: number }) =>
        api.post('/sos/trigger', { triggerMethod, location }),
    resolve: (id: string, status: string, notes?: string) =>
        api.put(`/sos/${id}/resolve`, { status, notes }),
    getHistory: () => api.get('/sos/history'),
    getStats: () => api.get('/sos/stats'),
};

// ──────────────── Transcripts ────────────────
export const transcriptApi = {
    save: (data: { text: string; language?: string; duration?: number; confidence?: number }) =>
        api.post('/transcripts', data),
    getAll: () => api.get('/transcripts'),
    delete: (id: string) => api.delete(`/transcripts/${id}`),
};

// ──────────────── AI Chat ────────────────
export const aiApi = {
    chat: (message: string, history: { role: string; content: string }[]) =>
        api.post('/ai/chat', { message, history }),
};

export default api;
