import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    // ID чату, до якого належить це повідомлення
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat', // Посилається на модель Chat
        required: true,
    },
    // Текст повідомлення (від користувача або цитата від авто-відповіді)
    text: {
        type: String,
        required: true,
        trim: true,
    },
    // Відправник: 'user' або 'auto_response'. 
    // Це дозволяє FE знати, як відображати повідомлення.
    sender: {
        type: String,
        enum: ['user', 'auto_response'], 
        required: true,
    },
    // Унікальний ідентифікатор автора (Guest ID / User ID).
    // Потрібен для перевірки прав на редагування (вимога "own message updating").
    senderId: { 
        type: String,
        required: true,
    },
    incoming: { 
        type: Boolean,
        required: true,
    },
    // Часова мітка створення повідомлення (для сортування)
    timestamp: {
        type: Date,
        default: Date.now,
    },
    // Додатково: чи було повідомлення змінено (вимога "own message updating")
    isEdited: {
        type: Boolean,
        default: false,
    }
});

const Message = mongoose.model('Message', MessageSchema);

export default Message;
