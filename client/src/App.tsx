import { useVoice } from "./hooks/useVoice";
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SignLanguagePage from './pages/SignLanguagePage';
import SpeechToTextPage from './pages/SpeechToTextPage';
import OCRPage from './pages/OCRPage';
import SOSPage from './pages/SOSPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
    useVoice();
    
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            {/* Protected */}
            <Route path="/dashboard" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
            <Route path="/sign-language" element={<PrivateRoute><Layout><SignLanguagePage /></Layout></PrivateRoute>} />
            <Route path="/speech-to-text" element={<PrivateRoute><Layout><SpeechToTextPage /></Layout></PrivateRoute>} />
            <Route path="/ocr" element={<PrivateRoute><Layout><OCRPage /></Layout></PrivateRoute>} />
            <Route path="/sos" element={<PrivateRoute><Layout><SOSPage /></Layout></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><Layout><HistoryPage /></Layout></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Layout><SettingsPage /></Layout></PrivateRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
