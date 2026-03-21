import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';

const generateToken = (userId: string): string => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, disabilityType } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            res.status(400).json({ success: false, message: 'Email already registered' });
            return;
        }

        const user = await User.create({ name, email, password, disabilityType });
        const token = generateToken((user._id as mongoose.Types.ObjectId).toString());

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                disabilityType: user.disabilityType,
                preferences: user.preferences,
            },
        });
    } catch (err: unknown) {
        const error = err as Error;
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        const token = generateToken((user._id as IUser['_id']).toString());

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                disabilityType: user.disabilityType,
                preferences: user.preferences,
                emergencyContacts: user.emergencyContacts,
                accessibilityMode: user.accessibilityMode,
            },
        });
    } catch (err: unknown) {
        const error = err as Error;
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as Request & { user?: { id: string } }).user?.id;
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, user });
    } catch (err: unknown) {
        const error = err as Error;
        res.status(500).json({ success: false, message: error.message });
    }
};
