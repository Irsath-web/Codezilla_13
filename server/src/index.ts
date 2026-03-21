import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import signRoutes from './routes/sign.routes';
import ocrRoutes from './routes/ocr.routes';
import sosRoutes from './routes/sos.routes';
import transcriptRoutes from './routes/transcript.routes';
import aiRoutes from './routes/ai.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time features
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'OK',
        message: 'AccessAI API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// Root route
app.get('/', (_req, res) => {
    res.send('AccessAI Server is running. Use /api/health to check status.');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/signs', signRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/ai', aiRoutes);

// Socket.IO events
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('sign:detected', (data: { letter: string; confidence: number; userId: string }) => {
        socket.broadcast.emit('sign:update', data);
    });

    socket.on('sos:triggered', (data: { userId: string; location: { lat: number; lng: number } }) => {
        io.emit('sos:alert', { ...data, timestamp: new Date().toISOString() });
    });

    socket.on('speech:transcript', (data: { text: string; userId: string }) => {
        socket.emit('transcript:saved', { success: true, text: data.text });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Error handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`\n🚀 AccessAI Server running on http://localhost:${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔌 Socket.IO ready`);
        console.log(`🌿 MongoDB connected\n`);
    });
});

export { io };
export default app;
