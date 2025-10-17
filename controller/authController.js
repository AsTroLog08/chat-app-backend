import axios from 'axios'; // ❗ ПОТРІБЕН AXIOS
import User from '../models/user.js';
import { generateToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';
// Використання GOOGLE_CLIENT_ID не обов'язкове для цього сценарію,
// оскільки ми не перевіряємо ID Token, але залишаємо для контексту.
// const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 

/**
 * Аутентифікація через Google Access Token
 * @route POST /api/chats/auth/google
 */
export const googleLogin = async (req, res) => {
    // Приймаємо Access Token, який надіслав клієнт
    const { token: accessToken } = req.body; 

    if (!accessToken) {
        return res.status(400).json({ message: 'Google Access Token is required.' });
    }

    try {
        // 1. ОТРИМАННЯ ДАНИХ КОРИСТУВАЧА ЗА ACCESS TOKEN
        // Надсилаємо GET-запит до User Info API, використовуючи Access Token
        const googleResponse = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        // Отримуємо дані про користувача з відповіді Google
        const googleUser = googleResponse.data;
        // Поля: sub, name, email, picture
        
        const { sub: providerId, name: displayName, email, picture: avatarUrl } = googleUser;
        
        // 2. ЗНАЙТИ АБО СТВОРИТИ КОРИСТУВАЧА
        let user = await User.findOne({ providerId, providerName: 'google' });

        if (!user) {
            // Користувач новий - створюємо його
            user = await User.create({
                providerId,
                providerName: 'google',
                displayName,
                email,
                avatarUrl, // Збереження аватара
                lastLogin: Date.now(),
            });
        } else {
            // Користувач вже існує - оновлюємо дані
            user.lastLogin = Date.now();
            // Оновлюємо ім'я та email, якщо вони змінилися в Google
            user.displayName = displayName;
            user.email = email;
            // user.avatarUrl = avatarUrl; // Можна оновлювати і аватар
            await user.save();
        }

        const token = generateToken(user._id);

        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                displayName: user.displayName,
                email: user.email,
            },
            userId: user._id.toString() 
        });

    } catch (error) {
        // Обробка помилок: прострочений, недійсний токен, або помилка мережі
        console.error('Google Access Token verification failed:', error.message);
        // Перевіряємо, чи це помилка відповіді Google API
        if (error.response && error.response.status === 401) {
             return res.status(401).json({ message: 'Invalid or expired Google Access Token.' });
        }
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

/**
 * Отримати дані поточного користувача за JWT (для autoLogin)
 * @route GET /api/auth/me
 * @access Protected (використовує JWT)
 */
export const getMe = async (req, res) => {
    let token;

    // 1. Перевірка наявності токена Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Отримання токена
            token = req.headers.authorization.split(' ')[1];
            
            // 2. Верифікація токена (потрібно мати доступ до process.env.JWT_SECRET)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 3. Знаходження користувача за ID у токені
            const user = await User.findById(decoded.id).select('-password'); 

            if (!user) {
                 // Користувач не знайдений у базі даних (хоча токен валідний)
                return res.status(404).json({ message: "User not found in database." });
            }

            // 4. Успіх: Повертаємо дані користувача
            return res.status(200).json({
                user: {
                    id: user._id,
                    displayName: user.displayName,
                    email: user.email,
                },
                userId: user._id.toString() 
            });

        } catch (error) {
            console.error('JWT verification error in getMe:', error);
            // Помилка верифікації (невалідний, прострочений токен тощо)
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    
    // 5. Якщо токен Bearer не надано
    return res.status(401).json({ message: 'Not authorized, no Bearer token provided' });
};

export default {
    googleLogin,
    getMe
};