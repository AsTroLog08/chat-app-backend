import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    ownerId: { 
        type: String, 
        required: true 
    },
    firstName: {
        type: String,
        required: [true, 'First name is required.'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required.'],
        trim: true,
    },
    avatarUrl: { 
        type: String,
        required: false,
        default: ''
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    isTemplate: {
        type: Boolean,
        default: false,
    }
}, {
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
});

ChatSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat;
