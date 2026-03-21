import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accessai';
        const conn = await mongoose.connect(mongoURI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

export default connectDB;
