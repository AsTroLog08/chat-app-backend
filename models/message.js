import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({

    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    sender: {
        type: String,
        enum: ['user', 'auto_response'], 
        required: true,
    },
    senderId: { 
        type: String,
        required: true,
    },
    incoming: { 
        type: Boolean,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    isEdited: {
        type: Boolean,
        default: false,
    }
});

const Message = mongoose.model('Message', MessageSchema);

export default Message;
