import mongoose, { Document, Schema } from 'mongoose';

export interface ISOSAlert extends Document {
    userId: mongoose.Types.ObjectId;
    triggerMethod: 'button' | 'voice' | 'fall_detection' | 'manual';
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    status: 'triggered' | 'acknowledged' | 'resolved' | 'false_alarm';
    contactsNotified: {
        name: string;
        phone: string;
        notifiedAt: Date;
        method: 'sms' | 'call' | 'push';
    }[];
    responseTime: number; // ms
    notes?: string;
    createdAt: Date;
    resolvedAt?: Date;
}

const sosAlertSchema = new Schema<ISOSAlert>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        triggerMethod: {
            type: String,
            enum: ['button', 'voice', 'fall_detection', 'manual'],
            required: true,
        },
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            address: { type: String },
        },
        status: {
            type: String,
            enum: ['triggered', 'acknowledged', 'resolved', 'false_alarm'],
            default: 'triggered',
        },
        contactsNotified: [
            {
                name: { type: String },
                phone: { type: String },
                notifiedAt: { type: Date, default: Date.now },
                method: { type: String, enum: ['sms', 'call', 'push'], default: 'sms' },
            },
        ],
        responseTime: { type: Number, default: 0 },
        notes: { type: String },
        resolvedAt: { type: Date },
    },
    { timestamps: true }
);

sosAlertSchema.index({ userId: 1, createdAt: -1 });
sosAlertSchema.index({ status: 1 });

export default mongoose.model<ISOSAlert>('SOSAlert', sosAlertSchema);
