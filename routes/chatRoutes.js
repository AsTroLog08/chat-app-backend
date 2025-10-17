import express from 'express';
// Деструктуризуємо функції-контролери для чистоти коду
import { 
    getChats, createChat, getChatById, updateChat, deleteChat,
    getMessages, sendMessage, updateMessage 
} from '../controller/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ====================================================================
// ЧАТИ (CRUD)
// ====================================================================

/**
 * @route GET /
 * Отримати всі чати (з підтримкою пошуку ?q=...)
 */
router.get('/', protect, getChats);

/**
 * @route POST /
 * Створити новий чат
 */
router.post('/', protect, createChat);

/**
 * @route GET /:id
 * Отримати деталі чату
 */
router.get('/:id', protect, getChatById);

/**
 * @route PUT /:id
 * Оновити існуючий чат
 */
router.put('/:id', protect, updateChat);

/**
 * @route DELETE /:id
 * Видалити чат та пов'язані повідомлення
 */
router.delete('/:id', protect, deleteChat);

// ====================================================================
// ПОВІДОМЛЕННЯ
// ====================================================================

/**
 * @route GET /:chatId/messages
 * Отримати історію повідомлень для конкретного чату
 */
router.get('/:chatId/messages', protect, getMessages);

/**
 * @route POST /:chatId/messages
 * Відправити повідомлення та ініціювати авто-відповідь
 */
router.post('/:chatId/messages', protect, sendMessage);

/**
 * @route PUT /messages/:id (Зверніть увагу, що тут маршрут починається без ID чату,
 * що є типовою REST-практикою для оновлення підлеглого ресурсу за його ID)
 * Оновити власне повідомлення
 */
router.put('/messages/:id', protect, updateMessage); 

export default router;