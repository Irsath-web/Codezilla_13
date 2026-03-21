import mongoose, { Document, Schema } from 'mongoose';

export interface ISignSession extends Document {
    userId: mongoose.Types.ObjectId;
    detectedSigns: {
        sign: string;
        confidence: number;
        type: 'alphabet' | 'word';
        timestamp: Date;
    }[];
    builtSentence: string;
    sessionDuration: number; // in seconds
    createdAt: Date;
}

const signSessionSchema = new Schema<ISignSession>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        detectedSigns: [
            {
                sign: { type: String, required: true },
                confidence: { type: Number, min: 0, max: 100 },
                type: { type: String, enum: ['alphabet', 'word'], default: 'alphabet' },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        builtSentence: { type: String, default: '' },
        sessionDuration: { type: Number, default: 0 },
    },
    { timestamps: true }
);

signSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ISignSession>('SignSession', signSessionSchema);
