import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
    // Встановіть надійний SECRET у .env
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined! Tokens will not be signed correctly.");

    }
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d', // Токен дійсний 7 днів
    });
};
export { generateToken }