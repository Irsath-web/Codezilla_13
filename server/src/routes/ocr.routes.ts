import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import OCRResult from '../models/OCRResult';

const router = Router();

// POST /api/ocr/save - Save OCR result
router.post('/save', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { extractedText, imageUrl, language, confidence, spokenAloud } = req.body;
        const result = await OCRResult.create({
            userId: req.user?.id,
            extractedText,
            imageUrl,
            language: language || 'en',
            confidence: confidence || 85,
            spokenAloud: spokenAloud || false,
        });
        res.status(201).json({ success: true, result });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// GET /api/ocr/history - Get all OCR results
router.get('/history', protect, async (req: AuthRequest, res: Response) => {
    try {
        const results = await OCRResult.find({ userId: req.user?.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, count: results.length, results });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// DELETE /api/ocr/:id - Delete an OCR result
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
    try {
        const result = await OCRResult.findOneAndDelete({ _id: req.params.id, userId: req.user?.id });
        if (!result) { res.status(404).json({ success: false, message: 'Not found' }); return; }
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

export default router;
