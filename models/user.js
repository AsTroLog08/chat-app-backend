import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    // Унікальний ідентифікатор користувача, отриманий від Google/Facebook
    providerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Назва провайдера (Google, Facebook, etc.)
    providerName: {
        type: String,
        enum: ['google', 'facebook'], // Додайте більше, якщо потрібно
        required: true,
    },
    // Ім'я користувача, як надано провайдером
    displayName: {
        type: String,
        trim: true,
    },
    avatarUrl: { 
        type: String,
        required: false, // Не обов'язково
        default: ''
    },
    // Email користувача
    email: {
        type: String,
        trim: true,
        unique: true,
        sparse: true, // Дозволяє null-значенням не бути унікальними
    },
    // Дата створення/останнього логіну
    lastLogin: {
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.model('User', UserSchema);

export default User;
