import mongoose, { Document, Schema } from 'mongoose';

export interface IOCRResult extends Document {
    userId: mongoose.Types.ObjectId;
    extractedText: string;
    imageUrl?: string;
    language: string;
    confidence: number;
    wordCount: number;
    spokenAloud: boolean;
    createdAt: Date;
}

const ocrResultSchema = new Schema<IOCRResult>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        extractedText: { type: String, required: true },
        imageUrl: { type: String },
        language: { type: String, default: 'en' },
        confidence: { type: Number, default: 0, min: 0, max: 100 },
        wordCount: { type: Number, default: 0 },
        spokenAloud: { type: Boolean, default: false },
    },
    { timestamps: true }
);

ocrResultSchema.pre('save', function (next) {
    this.wordCount = this.extractedText.trim().split(/\s+/).filter(Boolean).length;
    next();
});

ocrResultSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IOCRResult>('OCRResult', ocrResultSchema);
