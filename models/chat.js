import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    ownerId: { 
        type: String, 
        required: true 
    },
    // Обов'язкові поля згідно з ТЗ
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
        required: false, // Не обов'язково
        default: ''
    },
    // Корисне поле для відображення в списку: 
    // ID останнього повідомлення (для швидкого отримання прев'ю)
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    // Дата створення чату
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Додатково: Властивість для пошуку та відображення статусу (можна використовувати для
    // "3 predefined chats", де `isTemplate: true`
    isTemplate: {
        type: Boolean,
        default: false,
    }
}, {
    // Включаємо віртуальні поля та getters/setters
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
});

// Віртуальне поле для зручності: відображає повне ім'я
ChatSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat;
