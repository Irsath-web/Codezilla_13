import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    avatar?: string;
    disabilityType: 'visual' | 'hearing' | 'physical' | 'multiple';
    emergencyContacts: {
        name: string;
        phone: string;
        email?: string;
        relation: string;
        isActive: boolean;
    }[];
    preferences: {
        highContrast: boolean;
        largeText: boolean;
        voiceControl: boolean;
        ttsSpeed: number;
        ttsPitch: number;
        language: string;
    };
    accessibilityMode: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        password: { type: String, required: true, minlength: 6, select: false },
        avatar: { type: String, default: '' },
        disabilityType: {
            type: String,
            enum: ['visual', 'hearing', 'physical', 'multiple'],
            default: 'multiple',
        },
        emergencyContacts: [
            {
                name: { type: String, required: true },
                phone: { type: String, required: true },
                email: { type: String, default: '' },
                relation: { type: String, default: 'Family' },
                isActive: { type: Boolean, default: true },
            },
        ],
        preferences: {
            highContrast: { type: Boolean, default: false },
            largeText: { type: Boolean, default: false },
            voiceControl: { type: Boolean, default: false },
            ttsSpeed: { type: Number, default: 1, min: 0.5, max: 2 },
            ttsPitch: { type: Number, default: 1, min: 0.5, max: 2 },
            language: { type: String, default: 'en-US' },
        },
        accessibilityMode: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.model<IUser>('User', userSchema);
