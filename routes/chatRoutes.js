import express from 'express';
import chatController from '../controller/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Middleware 'protect' тепер застосовується до всіх маршрутів, оскільки вони потребують ідентифікації
// користувача (аутентифікованого через JWT) або гостя (через x-guest-id).

// ====================================================================
// A. ЧАТИ (CRUD)
// ====================================================================

// GET /api/chats - Отримати всі чати (з підтримкою пошуку ?q=...)
router.get('/', protect, chatController.getChats);

// POST /api/chats - Створити новий чат
router.post('/', protect, chatController.createChat);

// Get /api/chats/:id - Отримати деталі чату
router.get('/:id', protect, chatController.getChatById);

// PUT /api/chats/:id - Оновити існуючий чат
router.put('/:id', protect, chatController.updateChat);

// DELETE /api/chats/:id - Видалити чат
router.delete('/:id', protect, chatController.deleteChat);

// ====================================================================
// B. ПОВІДОМЛЕННЯ
// ====================================================================

// GET /api/chats/:chatId/messages - Отримати історію повідомлень
router.get('/:chatId/messages', protect, chatController.getMessages);

// POST /api/chats/:chatId/messages - Відправити повідомлення та ініціювати авто-відповідь
router.post('/:chatId/messages', protect, chatController.sendMessage);

// PUT /api/messages/:id - Оновити власне повідомлення
router.put('/messages/:id', protect, chatController.updateMessage); 


export default router;



/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get all chats (optionally filtered by search query)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search chats by first or last name
 *     responses:
 *       200:
 *         description: List of chats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 *
 *   post:
 *     summary: Create new chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Chat'
 *     responses:
 *       201:
 *         description: Chat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 */

/**
 * @swagger
 * /api/chats/{id}:
 *   put:
 *     summary: Update chat by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *
 *   delete:
 *     summary: Delete chat by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat deleted successfully
 */

/**
 * @swagger
 * /api/chats/{chatId}/messages:
 *   get:
 *     summary: Get all messages of a chat
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: List of messages in the chat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *
 *   post:
 *     summary: Send a message and receive auto-response
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully (auto-response will be added)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */

/**
 * @swagger
 * /api/messages/{id}:
 *   put:
 *     summary: Update your own message
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: New message text
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */