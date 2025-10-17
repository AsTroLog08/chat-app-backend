import Chat from '../models/chat.js';
import Message from '../models/message.js';
import { ioInstance } from '../server.js';
import { dogCeo } from '../utils/dogCeo.js';
import { getQuote } from '../utils/quotable.js';
import mongoose from 'mongoose';

// ====================================================================
// A. УТИЛІТИ ТА КОНСТАНТИ
// ====================================================================

/**
 * Отримує ID власника/гостя з заголовків або JWT payload.
 */
const getOwnerId = (req) => {
    return req.headers["x-guest-id"] || req.user?.id;
};

const INITIAL_CONVERSATIONS = [
    // Alice Freeman (index 0)
    [{ text: "Hello", sender: 'user', incoming: false }, { text: "Hi", sender: 'auto_response', incoming: true }, { text: "Will we meet?", sender: 'user', incoming: false }],
    // Helen Fischer (index 1)
    [{ text: "Доброго дня", sender: 'user', incoming: false }, { text: "Доброго", sender: 'auto_response', incoming: true }, { text: "Ми вас чекаємо на зустрічі о 11.00", sender: 'auto_response', incoming: true }],
    // Piter Steele (index 2)
    [{ text: "Доброго дня", sender: 'auto_response', incoming: true }, { text: "Вас цікавить ковбаса?", sender: 'auto_response', incoming: true }],
];

const DEFAULT_CHAT_TEMPLATES = [
    { firstName: "Alice", lastName: "Freeman", isTemplate: true, avatarUrl: "https://cdn-icons-png.flaticon.com/512/428/428573.png", ownerId: 'base' },
    { firstName: "Helen", lastName: "Fischer", isTemplate: true, avatarUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnSA1zygA3rubv-VK0DrVcQ02Po79kJhXo_A&s", ownerId: 'base' },
    { firstName: "Piter", lastName: "Steele", isTemplate: true, avatarUrl: "https://cdn-icons-png.flaticon.com/512/219/219983.png", ownerId: 'base' },
];

/**
 * Ініціалізує стандартні повідомлення для чатів.
 */
const insertDefaultMessages = async (chats, ownerId) => {
    let currentTimestamp = Date.now();
    const delayMs = 100;

    const messagesToInsert = chats.flatMap((chat, index) => {
        const conversation = INITIAL_CONVERSATIONS[index] || [];
        
        return conversation.map(msg => {
            currentTimestamp += delayMs;
            const uniqueTime = new Date(currentTimestamp);
            
            return {
                ...msg,
                chat: chat._id,
                senderId: msg.incoming ? chat._id.toString() : ownerId,
                createdAt: uniqueTime, 
                timestamp: uniqueTime, 
            };
        });
    });

    return Message.insertMany(messagesToInsert);
};

// ====================================================================
// B. КОНТРОЛЕРИ ЧАТІВ (CRUD & INITIALIZATION)
// ====================================================================

/**
 * Отримати список усіх чатів (з останнім повідомленням). Ініціалізує, якщо чатів немає.
 * @route GET /api/chats
 */
export const getChats = async (req, res) => {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const { q } = req.query;
    const query = { ownerId };
    
    if (q) {
        query.$or = [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
        ];
    }

    try {
        let chats = await Chat.find(query)
            .sort({ createdAt: -1 })
            .populate("lastMessage")
            .exec();

        // ЛОГІКА ІНІЦІАЛІЗАЦІЇ
        if (chats.length === 0 && q === undefined) {
            
            let defaultTemplates = await Chat.find({ isTemplate: true });

            if (defaultTemplates.length === 0) {
                defaultTemplates = await Chat.insertMany(DEFAULT_CHAT_TEMPLATES);
            }

            const userChatsData = defaultTemplates.map((tpl) => ({
                firstName: tpl.firstName,
                lastName: tpl.lastName,
                avatarUrl: tpl.avatarUrl,
                ownerId,
                isTemplate: false,
            }));

            const insertedChats = await Chat.insertMany(userChatsData); 
            const insertedMessages = await insertDefaultMessages(insertedChats, ownerId);
            
            const bulkOperations = insertedChats.map(chat => {
                const lastMsg = insertedMessages
                    .filter(msg => msg.chat.toString() === chat._id.toString())
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

                return {
                    updateOne: {
                        filter: { _id: chat._id },
                        update: { lastMessage: lastMsg ? lastMsg._id : null },
                    }
                };
            });

            await Chat.bulkWrite(bulkOperations);
            
            // Завантажуємо оновлений список
            chats = await Chat.find({ ownerId }).sort({ createdAt: -1 }).populate("lastMessage");
        }
        
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error.message);
        res.status(500).json({ message: "Server error while fetching chats." });
    }
};

/**
 * Отримати деталі одного чату за його ID
 * @route GET /api/chats/:chatId
 */
export const getChatById = async (req, res) => {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    if (!ownerId) {
        return res.status(401).json({ message: "Authentication required." });
    }
    
    try {
        // Перевірка власності в запиті
        const chat = await Chat.findOne({ _id: id, ownerId });

        if (!chat) {
            return res.status(404).json({ message: "Chat not found or access denied." });
        }

        res.status(200).json(chat);
    } catch (error) {
        console.error('Error fetching chat details:', error.message);
        res.status(500).json({ message: "Server error while fetching chat details." });
    }
};

/**
 * Створити новий чат
 * @route POST /api/chats
 */
export const createChat = async (req, res) => {
    const { firstName, lastName } = req.body;
    const ownerId = getOwnerId(req);

    if (!ownerId) return res.status(401).json({ message: "Authentication required." });
    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required.' });
    }

    try {
        const avatarUrl = await dogCeo(); 
        const newChat = await Chat.create({ ownerId, firstName, lastName, avatarUrl });
        
        res.status(201).json(newChat);
    } catch (error) {
        console.error('Error creating chat:', error.message);
        res.status(500).json({ message: 'Server error while creating chat.' });
    }
};

/**
 * Оновити існуючий чат (ім'я та прізвище)
 * @route PUT /api/chats/:id
 */
export const updateChat = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName } = req.body;
    const ownerId = getOwnerId(req);

    if (!ownerId) return res.status(401).json({ message: "Authentication required." });
    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required for update.' });
    }

    try {
        // Знайти та оновити в одній операції, перевіряючи власність
        const updatedChat = await Chat.findOneAndUpdate(
            { _id: id, ownerId },
            { firstName, lastName },
            { new: true, runValidators: true }
        );

        if (!updatedChat) {
            return res.status(404).json({ message: 'Chat not found or access denied.' });
        }

        res.status(200).json(updatedChat);
    } catch (error) {
        console.error('Error updating chat:', error.message);
        res.status(500).json({ message: 'Server error while updating chat.' });
    }
};

/**
 * Видалити чат та всі пов'язані повідомлення
 * @route DELETE /api/chats/:id
 */
export const deleteChat = async (req, res) => {
    const { id } = req.params;
    const ownerId = getOwnerId(req);

    if (!ownerId) return res.status(401).json({ message: "Authentication required." });

    try {
        // Використовуємо findOneAndDelete для атомарного видалення з перевіркою власності
        const chat = await Chat.findOneAndDelete({ _id: id, ownerId });

        if (!chat) {
            return res.status(404).json({ message: "Chat not found or access denied." });
        }

        // Видаляємо всі повідомлення, пов'язані з цим чатом 
        await Message.deleteMany({ chat: id });

        res.status(200).json({ message: 'Chat and all messages deleted successfully.' });
    } catch (error) {
        console.error('Error deleting chat:', error.message);
        res.status(500).json({ message: 'Server error while deleting chat.' });
    }
};

// ====================================================================
// C. ПОВІДОМЛЕННЯ ТА АВТО-ВІДПОВІДЬ
// ====================================================================

/**
 * Отримати історію повідомлень для конкретного чату
 * @route GET /api/chats/:chatId/messages
 */
export const getMessages = async (req, res) => {
    const { chatId } = req.params;
    const ownerId = getOwnerId(req);

    if (!ownerId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    try {
        // Перевіряємо, чи чат належить власнику
        const chat = await Chat.findOne({ _id: chatId, ownerId });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found or access denied." });
        }
        
        const messages = await Message.find({ chat: chatId }).sort({ timestamp: 1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error.message);
        res.status(500).json({ message: 'Server error while fetching messages.' });
    }
};

/**
 * Надсилання повідомлення користувачем та ініціація авто-відповіді
 * @route POST /api/chats/:chatId/messages
 */
export const sendMessage = async (req, res) => {
    const { chatId } = req.params;
    const { text } = req.body;
    const ownerId = getOwnerId(req);
    let chat;

    if (!text) {
        return res.status(400).json({ message: 'Message text cannot be empty.' });
    }

    try {
        // Перевірка власності
        chat = await Chat.findOne({ _id: chatId, ownerId });
        if (!chat) return res.status(404).json({ message: "Chat not found or access denied." });

        // 1. Створюємо повідомлення користувача
        const userMessage = await Message.create({
            chat: chatId,
            text,
            sender: 'user',
            senderId: ownerId,
            incoming: false,
        });

        // 2. Оновлюємо посилання на останнє повідомлення в чаті
        await Chat.findByIdAndUpdate(chatId, { lastMessage: userMessage._id });

        // 3. Відправляємо підтвердження
        res.status(201).json(userMessage); 
        
    } catch (error) {
        console.error('Error sending user message:', error.message);
        return res.status(500).json({ message: 'Server error while sending message.' });
    }
    
    // 4. ЛОГІКА АВТО-ВІДПОВІДІ (АСИНХРОННА ЧАСТИНА)
    setTimeout(async () => {
        try {
            const quote = await getQuote(); 
            
            const autoResponse = await Message.create({
                chat: chatId,
                text: quote,
                sender: 'auto_response',
                senderId: chat._id.toString(), 
                incoming: true,
            });
            await autoResponse.save();

            // Оновлення lastMessage на авто-відповідь
            await Chat.findByIdAndUpdate(chatId, { lastMessage: autoResponse._id });
            const populatedResponse = await Message.findById(autoResponse._id)
            const response = { 
                autoResponse: populatedResponse.toObject(), // 💡 Перетворюємо Mongoose-об'єкт на простий JS-об'єкт
                chat: chat.toObject() // 💡 Також перетворюємо
            };
            if (ioInstance) {
                // Надсилання нового повідомлення та оновлення списку чатів
                ioInstance.to(chatId.toString()).emit('new_message', response);
                ioInstance.to(chatId.toString()).emit('chat_list_updated');
            }

        } catch (error) {
            console.error('Error during auto-response generation:', error.message);
        }
    }, 3000);
};


/**
 * Оновити існуюче власне повідомлення
 * @route PUT /api/messages/:id
 */
export const updateMessage = async (req, res) => {
    const { id } = req.params;
    const { text } = req.body; 
    const ownerId = getOwnerId(req);

    if (!ownerId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Message text cannot be empty.' });
    }

    try {
        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({ message: 'Message not found.' });
        }
        
        // Єдина перевірка прав: власник AND це повідомлення користувача
        if (message.senderId.toString() !== ownerId.toString() || message.sender !== 'user') { 
            return res.status(403).json({ message: 'Access denied: You can only edit your own messages.' });
        }
        
        const updatedMessage = await Message.findByIdAndUpdate(
            id,
            { text, isEdited: true },
            { new: true }
        );

        if (ioInstance && updatedMessage) {
            ioInstance.to(updatedMessage.chat.toString()).emit('message_updated', updatedMessage.toObject());
        }

        res.status(200).json(updatedMessage);

    } catch (error) {
        console.error('Error updating message:', error.message);
        res.status(500).json({ message: 'Server error while updating message.' });
    }
};

// ====================================================================
// D. ЕКСПОРТ
// ====================================================================

export default {
    getChats,
    createChat,
    updateChat,
    deleteChat,
    getMessages,
    sendMessage,
    updateMessage,
    getChatById
};
