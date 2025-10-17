import axios from 'axios';
import User from '../models/user.js';
import { generateToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

/**
 * Аутентифікація через Google Access Token.
 * @route POST /api/chats/auth/google
 */
export const googleLogin = async (req, res) => {
    const { token: accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ message: 'Missing Google Access Token.' });
    }

    try {
        // Отримання даних користувача від Google
        const { data: googleUser } = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        const { sub: providerId, name: displayName, email, picture: avatarUrl } = googleUser;

        // Пошук або створення користувача
        let user = await User.findOne({ providerId, providerName: 'google' });

        if (!user) {
            user = await User.create({
                providerId,
                providerName: 'google',
                displayName,
                email,
                avatarUrl,
                lastLogin: Date.now(),
            });
        } else {
            // Оновлення даних та останнього входу
            user.lastLogin = Date.now();
            user.displayName = displayName;
            user.email = email;
            // user.avatarUrl = avatarUrl; // Опціональне оновлення аватара
            await user.save();
        }

        const token = generateToken(user._id);

        res.status(200).json({
            message: 'Authentication successful',
            token,
            user: {
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl, // Додано avatarUrl у відповідь
            },
            userId: user._id.toString()
        });

    } catch (error) {
        // Обробка помилок Google API або мережі
        console.error('Google Auth Failed:', error.message);

        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
            return res.status(401).json({ message: 'Invalid or expired Google Access Token.' });
        }
        
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

// -----------------------------------------------------------------------------

/**
 * Отримати дані поточного користувача за JWT (для autoLogin).
 * @route GET /api/auth/me
 * @access Protected
 */
export const getMe = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no Bearer token provided.' });
    }
    
    const token = authHeader.split(' ')[1];

    try {
        // Верифікація токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Знаходження користувача без пароля
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Успіх: Повертаємо дані
        return res.status(200).json({
            user: {
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl, // Додано avatarUrl
            },
            userId: user._id.toString()
        });

    } catch (error) {
        console.error('JWT verification failed:', error.message);
        // Невалідний, прострочений токен тощо
        return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
};

export default {
    googleLogin,
    getMe
};