import mongoose, { Document, Schema } from 'mongoose';

export interface ITranscript extends Document {
    userId: mongoose.Types.ObjectId;
    text: string;
    language: string;
    source: 'microphone' | 'file' | 'system';
    duration: number; // seconds
    wordCount: number;
    confidence?: number;
    createdAt: Date;
}

const transcriptSchema = new Schema<ITranscript>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        language: { type: String, default: 'en-US' },
        source: {
            type: String,
            enum: ['microphone', 'file', 'system'],
            default: 'microphone',
        },
        duration: { type: Number, default: 0 },
        wordCount: { type: Number, default: 0 },
        confidence: { type: Number, min: 0, max: 100 },
    },
    { timestamps: true }
);

transcriptSchema.pre('save', function (next) {
    this.wordCount = this.text.trim().split(/\s+/).filter(Boolean).length;
    next();
});

transcriptSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ITranscript>('Transcript', transcriptSchema);
