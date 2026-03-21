import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';

const router = Router();

// GET /api/users/profile
router.get('/profile', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
        res.json({ success: true, user });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// PUT /api/users/preferences
router.put('/preferences', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user?.id,
            { $set: { preferences: req.body.preferences, accessibilityMode: req.body.accessibilityMode } },
            { new: true, runValidators: true }
        );
        if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
        res.json({ success: true, message: 'Preferences updated', user });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// PUT /api/users/emergency-contacts
router.put('/emergency-contacts', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user?.id,
            { $set: { emergencyContacts: req.body.contacts } },
            { new: true }
        );
        if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
        res.json({ success: true, message: 'Emergency contacts updated', contacts: user.emergencyContacts });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { name, disabilityType } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user?.id,
            { $set: { name, disabilityType } },
            { new: true, runValidators: true }
        );
        if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
        res.json({ success: true, message: 'Profile updated', user });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

export default router;
