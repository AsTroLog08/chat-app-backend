// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const protect = async (req, res, next) => {
    let token;
const HARDCODED_USER_ID = '68f10cd5b1b0454d166b32d9'; 
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Отримання токена з заголовка
            token = req.headers.authorization.split(' ')[1];
            // 2. Верифікація токена
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // 3. Знаходження користувача за ID у токені і прикріплення його до запиту
            let fdf = await User.findById(decoded.id).select('-password'); 
            console.log(fdf)

            req.user = await User.findById(decoded.id).select('-password'); 

        } catch (error) {
            console.error('JWT verification error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    next();
};

export { protect };