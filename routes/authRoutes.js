import express from 'express';
// 🚩 Імпортуємо функцію-контролер (іменований імпорт)
import authController from '../controller/authController.js'; 

const router = express.Router();

// 🚩 Визначаємо маршрут, використовуючи функцію-контролер
router.post('/auth/google', authController.googleLogin);

// 🚩 Визначаємо маршрут, використовуючи функцію-контролер
router.get('/auth/me', authController.getMe);

// 🚩 Експортуємо сам об'єкт Router
export default router;