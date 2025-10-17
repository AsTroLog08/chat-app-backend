import express from 'express';
import { googleLogin, getMe } from '../controller/authController.js'; 

const router = express.Router();

/**
 * @route POST /auth/google
 * Аутентифікація через Google Access Token.
 */
router.post('/auth/google', googleLogin);

/**
 * @route GET /auth/me
 * Отримати дані поточного користувача за JWT.
 */
router.get('/auth/me', getMe);

export default router;