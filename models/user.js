import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({

    providerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    providerName: {
        type: String,
        enum: ['google', 'facebook'],
        required: true,
    },
    displayName: {
        type: String,
        trim: true,
    },
    avatarUrl: { 
        type: String,
        required: false, 
        default: ''
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.model('User', UserSchema);

export default User;
