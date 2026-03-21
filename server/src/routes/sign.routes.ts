import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import SignSession from '../models/SignSession';
import mongoose from 'mongoose';

const router = Router();

// POST /api/signs/session - Start new sign session
router.post('/session', protect, async (req: AuthRequest, res: Response) => {
    try {
        const session = await SignSession.create({
            userId: new mongoose.Types.ObjectId(req.user?.id),
            detectedSigns: [],
            builtSentence: '',
            sessionDuration: 0,
        });
        res.status(201).json({ success: true, sessionId: session._id, session });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// POST /api/signs/detect - Log a detected sign
router.post('/detect', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId, sign, confidence, type } = req.body;
        const session = await SignSession.findOneAndUpdate(
            { _id: sessionId, userId: req.user?.id },
            {
                $push: { detectedSigns: { sign, confidence, type: type || 'alphabet', timestamp: new Date() } },
            },
            { new: true }
        );
        if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
        res.json({ success: true, session });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// PUT /api/signs/session/:id/sentence - Update built sentence
router.put('/session/:id/sentence', protect, async (req: AuthRequest, res: Response) => {
    try {
        const session = await SignSession.findOneAndUpdate(
            { _id: req.params.id, userId: req.user?.id },
            { $set: { builtSentence: req.body.sentence, sessionDuration: req.body.duration || 0 } },
            { new: true }
        );
        if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
        res.json({ success: true, session });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// GET /api/signs/history - Get all sign sessions
router.get('/history', protect, async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await SignSession.find({ userId: req.user?.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ success: true, count: sessions.length, sessions });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// GET /api/signs/stats - Usage statistics
router.get('/stats', protect, async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await SignSession.find({ userId: req.user?.id });
        const totalSigns = sessions.reduce((acc, s) => acc + s.detectedSigns.length, 0);
        const uniqueSigns = new Set(sessions.flatMap(s => s.detectedSigns.map(d => d.sign)));
        res.json({
            success: true,
            stats: {
                totalSessions: sessions.length,
                totalSignsDetected: totalSigns,
                uniqueSignsUsed: uniqueSigns.size,
                avgConfidence: totalSigns > 0
                    ? Math.round(sessions.flatMap(s => s.detectedSigns).reduce((a, d) => a + (d.confidence || 0), 0) / totalSigns)
                    : 0,
            },
        });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

export default router;
