import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import Transcript from '../models/Transcript';

const router = Router();

// POST /api/transcripts - Save a transcript
router.post('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { text, language, duration, confidence, source } = req.body;
        const transcript = await Transcript.create({
            userId: req.user?.id, text, language: language || 'en-US',
            duration: duration || 0, confidence, source: source || 'microphone',
        });
        res.status(201).json({ success: true, transcript });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// GET /api/transcripts - Get all transcripts
router.get('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        const transcripts = await Transcript.find({ userId: req.user?.id })
            .sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, count: transcripts.length, transcripts });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// DELETE /api/transcripts/:id
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
    try {
        const t = await Transcript.findOneAndDelete({ _id: req.params.id, userId: req.user?.id });
        if (!t) { res.status(404).json({ success: false, message: 'Not found' }); return; }
        res.json({ success: true, message: 'Deleted' });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

export default router;
