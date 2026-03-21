import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import SOSAlert from '../models/SOSAlert';
import User from '../models/User';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

const router = Router();

// ─────────────────────────────────────────────
// Nodemailer transporter (Gmail, free)
// Add to server/.env:
//   GMAIL_USER=yourgmail@gmail.com
//   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← Google App Password (not your login password)
// How to get App Password:
//   myaccount.google.com → Security → 2-Step Verification → App Passwords
// ─────────────────────────────────────────────
function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

// ─────────────────────────────────────────────
// Send SOS email to one contact
// ─────────────────────────────────────────────
async function sendSOSEmail(opts: {
    toEmail: string;
    toName: string;
    fromName: string;
    message: string;
    lat: number;
    lng: number;
}): Promise<{ success: boolean; info: string }> {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
        return { success: false, info: 'GMAIL credentials not set in server/.env' };
    }
    if (!opts.toEmail || !opts.toEmail.includes('@')) {
        return { success: false, info: 'No valid email address for this contact' };
    }

    const mapsLink = `https://maps.google.com/?q=${opts.lat},${opts.lng}`;

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f0f2a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:#ef4444;padding:28px 32px;text-align:center;">
        <div style="font-size:3rem;">🆘</div>
        <h1 style="margin:8px 0 0;font-size:1.8rem;color:#fff;letter-spacing:2px;">SOS EMERGENCY ALERT</h1>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:1.1rem;margin-top:0;">Dear <strong>${opts.toName}</strong>,</p>
        <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:12px;padding:16px 20px;margin:16px 0;">
          <p style="margin:0;font-size:1rem;line-height:1.7;"><strong>${opts.fromName}</strong> needs your help urgently:</p>
          <p style="margin:10px 0 0;font-size:1rem;line-height:1.7;">${opts.message}</p>
        </div>
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:16px 20px;margin:16px 0;">
          <p style="margin:0;font-weight:700;color:#10b981;">📍 Current Location</p>
          <p style="margin:8px 0 0;">Coordinates: ${opts.lat.toFixed(5)}°N, ${opts.lng.toFixed(5)}°E</p>
          <a href="${mapsLink}" style="display:inline-block;margin-top:10px;background:#10b981;color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Open in Google Maps →
          </a>
        </div>
        <p style="color:#94a3b8;font-size:0.85rem;margin-top:20px;">
          Please call or go to their location immediately. This alert was sent via <strong>AccessAI Emergency System</strong>.
        </p>
      </div>
      <div style="background:rgba(255,255,255,0.04);padding:16px 32px;text-align:center;font-size:0.78rem;color:#64748b;">
        AccessAI · Emergency Alert System
      </div>
    </div>`;

    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: `"AccessAI SOS 🆘" <${gmailUser}>`,
            to: opts.toEmail,
            subject: `🆘 EMERGENCY — ${opts.fromName} needs help NOW`,
            html,
            text: `SOS EMERGENCY from ${opts.fromName}!\n\n${opts.message}\n\nLocation: ${mapsLink}`,
        });
        return { success: true, info: `Email sent to ${opts.toEmail}` };
    } catch (err: unknown) {
        return { success: false, info: (err as Error).message };
    }
}

// ─────────────────────────────────────────────
// POST /api/sos/trigger
// ─────────────────────────────────────────────
router.post('/trigger', protect, async (req: AuthRequest, res: Response) => {
    try {
        const start = Date.now();
        const { triggerMethod, location, customMessage } = req.body;

        const user = await User.findById(req.user?.id);
        if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

        const activeContacts = user.emergencyContacts.filter(c => c.isActive);
        const message = customMessage?.trim() || 'I need immediate help. Please respond ASAP.';

        // Send email to each active contact in parallel
        const emailResults = await Promise.all(
            activeContacts.map(async (c) => {
                const result = await sendSOSEmail({
                    toEmail: c.email ?? '',
                    toName: c.name,
                    fromName: user.name,
                    message,
                    lat: location?.lat ?? 13.0827,
                    lng: location?.lng ?? 80.2707,
                });
                return {
                    name: c.name,
                    phone: c.phone,
                    email: c.email ?? '',
                    notifiedAt: new Date(),
                    method: 'sms' as const,    // kept as 'sms' to match existing schema enum
                    delivered: result.success,
                    info: result.info,
                };
            })
        );

        const deliveredCount = emailResults.filter(r => r.delivered).length;

        const alert = await SOSAlert.create({
            userId: new mongoose.Types.ObjectId(req.user?.id),
            triggerMethod: triggerMethod || 'button',
            location: location || { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu' },
            status: 'triggered',
            contactsNotified: emailResults,
            responseTime: Date.now() - start,
        });

        res.status(201).json({
            success: true,
            message: `SOS email sent to ${deliveredCount}/${activeContacts.length} contacts`,
            alert,
            emailResults,
            responseTime: `${Date.now() - start}ms`,
        });
    } catch (e: unknown) {
        res.status(500).json({ success: false, message: (e as Error).message });
    }
});

// PUT /api/sos/:id/resolve
router.put('/:id/resolve', protect, async (req: AuthRequest, res: Response) => {
    try {
        const alert = await SOSAlert.findOneAndUpdate(
            { _id: req.params.id, userId: req.user?.id },
            { $set: { status: req.body.status || 'resolved', resolvedAt: new Date(), notes: req.body.notes } },
            { new: true }
        );
        if (!alert) { res.status(404).json({ success: false, message: 'Alert not found' }); return; }
        res.json({ success: true, message: 'Alert resolved', alert });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});



// GET /api/sos/history
router.get('/history', protect, async (req: AuthRequest, res: Response) => {
    try {
        const alerts = await SOSAlert.find({ userId: req.user?.id }).sort({ createdAt: -1 }).limit(20);
        res.json({ success: true, count: alerts.length, alerts });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

// GET /api/sos/stats
router.get('/stats', protect, async (req: AuthRequest, res: Response) => {
    try {
        const alerts = await SOSAlert.find({ userId: req.user?.id });
        const avg = alerts.length > 0
            ? Math.round(alerts.reduce((a, b) => a + (b.responseTime || 0), 0) / alerts.length) : 0;
        res.json({
            success: true,
            stats: {
                total: alerts.length,
                resolved: alerts.filter(a => a.status === 'resolved').length,
                falseAlarms: alerts.filter(a => a.status === 'false_alarm').length,
                avgResponseTime: `${avg}ms`,
            },
        });
    } catch (e: unknown) { res.status(500).json({ success: false, message: (e as Error).message }); }
});

export default router;
