import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { protect, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// System prompt — AccessAI voice assistant personality
const SYSTEM_PROMPT = `You are AccessAI Assistant, a helpful, friendly, and empathetic AI voice assistant embedded in the AccessAI accessibility platform. 

AccessAI helps people with disabilities through these modules:
- Sign Language Recognition (real-time ASL detection via MediaPipe)
- Speech to Text (voice transcription)
- OCR Reader (scan documents and images with Tesseract.js)
- SOS Emergency Alert (sends emergency emails with GPS to contacts)
- History (view past sessions)
- Settings (manage profile and emergency contacts)

Your personality:
- Warm, caring, and supportive — users may have disabilities
- Clear and concise — short sentences that are easy to understand when spoken aloud
- Helpful — always suggest what the user can do
- Never use markdown formatting (no asterisks, headers, or bullet lists) — your response will be spoken aloud
- Max 2-3 sentences per response unless more detail is asked for

If the user asks to navigate somewhere, reply with EXACTLY this format:
NAVIGATE:/dashboard or NAVIGATE:/sign-language or NAVIGATE:/speech-to-text or NAVIGATE:/ocr or NAVIGATE:/history or NAVIGATE:/settings or NAVIGATE:/sos

If the user says emergency/help me/SOS/danger, reply with:
SOS_TRIGGER

Otherwise just have a normal helpful conversation.`;

router.post('/chat', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { message, history = [] } = req.body;

        if (!message?.trim()) {
            res.status(400).json({ success: false, message: 'No message provided' });
            return;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            res.status(503).json({ success: false, message: 'OpenAI API key not configured' });
            return;
        }

        const client = new OpenAI({ apiKey });

        // Build messages array from history + new message
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            // Include last 6 turns of history for context
            ...history.slice(-6).map((h: { role: string; content: string }) => ({
                role: h.role as 'user' | 'assistant',
                content: h.content,
            })),
            { role: 'user', content: message },
        ];

        const completion = await client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages,
            max_tokens: 200,
            temperature: 0.75,
        });

        const reply = completion.choices[0]?.message?.content?.trim() ?? "I'm sorry, I didn't get that.";

        // Detect special directives
        let navigate: string | null = null;
        let triggerSOS = false;
        let cleanReply = reply;

        if (reply.startsWith('NAVIGATE:')) {
            navigate = reply.replace('NAVIGATE:', '').trim();
            cleanReply = `Opening ${navigate.replace('/', '').replace(/-/g, ' ')} for you now.`;
        } else if (reply.includes('SOS_TRIGGER')) {
            triggerSOS = true;
            cleanReply = 'Sending your emergency SOS alert right now. Stay calm, help is on the way.';
        }

        res.json({
            success: true,
            reply: cleanReply,
            navigate,
            triggerSOS,
        });
    } catch (err: unknown) {
        const e = err as any;
        const msg = e?.status === 401
            ? 'Invalid OpenAI API key — check OPENAI_API_KEY in .env'
            : e?.status === 429
                ? 'OpenAI rate limit reached — please wait a moment'
                : (e as Error).message ?? 'AI service error';
        res.status(500).json({ success: false, message: msg });
    }
});

export default router;
