// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

/**
 * Middleware для захисту маршрутів.
 * Перевіряє JWT в заголовку Authorization і прикріплює об'єкт користувача до req.
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            // 1. Отримання токена
            token = req.headers.authorization.split(' ')[1];

            // 2. Верифікація токена
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Знаходження користувача за ID у токені
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                // Токен валідний, але користувача не знайдено (наприклад, видалений)
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // 4. Прикріплення користувача до запиту
            req.user = user;

        } catch (error) {
            console.error('JWT verification error:', error.message);
            // Помилка верифікації (невалідний, прострочений токен)
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        // Якщо токен не надано, дозволяємо прохід, але req.user буде null (для гостьового режиму)
    }
    
    // Перехід до наступного мідлвара/контролера
    next();
};

export { protect };