export interface User {
    _id: string;
    name: string;
    email: string;
    disabilityType: 'visual' | 'hearing' | 'physical' | 'multiple';
    avatar?: string;
    emergencyContacts: EmergencyContact[];
    preferences: UserPreferences;
    accessibilityMode: boolean;
    createdAt: string;
}

export interface EmergencyContact {
    _id?: string;
    name: string;
    phone: string;
    email?: string;
    relation: string;
    isActive: boolean;
}

export interface UserPreferences {
    highContrast: boolean;
    largeText: boolean;
    voiceControl: boolean;
    ttsSpeed: number;
    ttsPitch: number;
    language: string;
}

export interface DetectedSign {
    sign: string;
    confidence: number;
    type: 'alphabet' | 'word';
    timestamp: string;
}

export interface SignSession {
    _id: string;
    userId: string;
    detectedSigns: DetectedSign[];
    builtSentence: string;
    sessionDuration: number;
    createdAt: string;
}

export interface SOSAlert {
    _id: string;
    userId: string;
    triggerMethod: 'button' | 'voice' | 'fall_detection' | 'manual';
    location: { lat: number; lng: number; address?: string };
    status: 'triggered' | 'acknowledged' | 'resolved' | 'false_alarm';
    contactsNotified: { name: string; phone: string; notifiedAt: string; method: string }[];
    responseTime: number;
    notes?: string;
    createdAt: string;
    resolvedAt?: string;
}

export interface Transcript {
    _id: string;
    userId: string;
    text: string;
    language: string;
    source: 'microphone' | 'file' | 'system';
    duration: number;
    wordCount: number;
    confidence?: number;
    createdAt: string;
}

export interface OCRResult {
    _id: string;
    userId: string;
    extractedText: string;
    imageUrl?: string;
    language: string;
    confidence: number;
    wordCount: number;
    spokenAloud: boolean;
    createdAt: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

export type NavTab = 'home' | 'sign' | 'speech' | 'ocr' | 'sos' | 'history' | 'settings';
