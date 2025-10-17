import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { ioInstance } from '../server.js';
import { dogCeo } from '../utils/dogCeo.js';
import { getQuote } from '../utils/quotable.js';
import mongoose from 'mongoose'; 

// ====================================================================
// A. ЧАТИ (CRUD & INITIALIZATION)
// ====================================================================

/**
 * Отримує ID власника/гостя з заголовків або JWT payload.
 * @param {object} req - Об'єкт запиту
 * @returns {string|null} - ID власника/гостя
 */
const getOwnerId = (req) => {
    // req.user?.id встановлюється JWT middleware
    return req.headers["x-guest-id"] || req.user?.id; 
};

/**
 * Ініціалізує стандартні повідомлення для чатів
 * @param {Array} chats - Масив щойно створених чатів
 * @param {string} ownerId - ID власника
 * @returns {Promise<Array>} - Вставлені повідомлення
 */
const insertDefaultMessages = async (chats, ownerId) => {
    // Встановлюємо базову мітку часу і невелику затримку (наприклад, 100 мс)
    let currentTimestamp = Date.now();
    const delayMs = 100;

    const messagesToInsert = chats.flatMap((chat, index) => {
        let conversation = [];
        
        if (index === 0) { // Alice Freeman
            conversation = [
                { text: "Hello", sender: 'user', incoming: false },
                { text: "Hi", sender: 'auto_response', incoming: true },
                { text: "Will we meet?", sender: 'user', incoming: false },
            ];
        } else if (index === 1) { // Helen Fischer
            conversation = [
                { text: "Доброго дня", sender: 'user', incoming: false },
                { text: "Доброго", sender: 'auto_response', incoming: true },
                { text: "Ми вас чекаємо на зустрічі о 11.00", sender: 'auto_response', incoming: true },
            ];
        } else if (index === 2) { // Piter Steele
            conversation = [
                { text: "Доброго дня", sender: 'auto_response', incoming: true },
                { text: "Вас цікавить ковбаса?", sender: 'auto_response', incoming: true },
            ];
        }

        // Встановлюємо унікальну мітку часу для кожного повідомлення
        return conversation.map(msg => {
            currentTimestamp += delayMs; // Збільшуємо час на 100 мс
            const uniqueTime = new Date(currentTimestamp);
            
            return {
                ...msg,
                chat: chat._id,
                senderId: msg.incoming ? chat._id.toString() : ownerId,
                // ЯВНО ВСТАНОВЛЮЄМО унікальні мітки часу
                createdAt: uniqueTime, 
                timestamp: uniqueTime, 
            };
        });
    });

    // Mongoose використає ці явні мітки часу під час insertMany
    return Message.insertMany(messagesToInsert);
};


/**
 * Отримати список усіх чатів (з останнім повідомленням). 
 * Якщо чатів немає, створює базові шаблони.
 * @route GET /api/chats
 */
export const getChats = async (req, res) => {
    const ownerId = getOwnerId(req);
    // ПЕРЕВІРКА ВЛАСНОСТІ (власник має бути)
    if (!ownerId)
        return res.status(401).json({ message: "Authentication required." });

    const { q } = req.query;
    const query = { ownerId };
    
    // Додавання пошуку до запиту, якщо є 'q'
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

        // ❗ ЛОГІКА ІНІЦІАЛІЗАЦІЇ: Створюємо чати, якщо це перший вхід (немає чатів і немає пошуку)
        if (chats.length === 0 && q === undefined) {
            
            // 1. Отримуємо або створюємо шаблонні чати
            let defaultTemplates = await Chat.find({ isTemplate: true });

            if (defaultTemplates.length === 0) {
                defaultTemplates = await Chat.insertMany([
                    { firstName: "Alice", lastName: "Freeman", isTemplate: true, avatarUrl:"https://cdn-icons-png.flaticon.com/512/428/428573.png",ownerId: 'base' },
                    { firstName: "Helen", lastName: "Fischer", isTemplate: true, avatarUrl:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnSA1zygA3rubv-VK0DrVcQ02Po79kJhXo_A&s",ownerId: 'base'  },
                    { firstName: "Piter", lastName: "Steele", isTemplate: true, avatarUrl:"https://cdn-icons-png.flaticon.com/512/219/219983.png",ownerId: 'base'  },
                ]);
            }

            // 2. Клонуємо шаблони для поточного користувача/гостя
            const userChatsData = defaultTemplates.map((tpl) => ({
                firstName: tpl.firstName,
                lastName: tpl.lastName,
                avatarUrl: tpl.avatarUrl,
                ownerId, // Встановлюємо ID поточного власника
                isTemplate: false,
            }));

            const insertedChats = await Chat.insertMany(userChatsData); 
            
            // 3. Формуємо та вставляємо повідомлення
            const insertedMessages = await insertDefaultMessages(insertedChats, ownerId);
            
            // 4. Оновлюємо чати, встановлюючи lastMessage (Bulk Write)
            const bulkOperations = insertedChats.map(chat => {
                // Знаходимо останнє повідомлення, пов'язане з цим чатом
                const lastMsg = insertedMessages
                    .filter(msg => msg.chat.toString() === chat._id.toString())
                    .sort((a, b) => b.timestamp - a.timestamp)[0]; // Сортуємо за createdAt

                return {
                    updateOne: {
                        filter: { _id: chat._id },
                        update: { lastMessage: lastMsg ? lastMsg._id : null },
                    }
                };
            });

            await Chat.bulkWrite(bulkOperations);
            
            // 5. Завантажуємо оновлений список чатів (з populated lastMessage)
            chats = await Chat.find({ ownerId }).sort({ createdAt: -1 }).populate("lastMessage");
        }
        
        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chats", error: error.message });
    }
};

/**
 * Отримати деталі одного чату за його ID
 * @route GET /api/chats/:chatId
 */
export const getChatById = async (req, res) => {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    // ПЕРЕВІРКА ВЛАСНОСТІ (власник має бути)
    if (!ownerId) {
        return res.status(401).json({ message: "Authentication required." });
    }
    
    try {
        const chat = await Chat.findById(id);

        if (!chat) {
            return res.status(404).json({ message: `Chat not found ${id} ` });
        }

        // ПЕРЕВІРКА ВЛАСНОСТІ: чат повинен належати поточному власнику
        if (chat.ownerId.toString() !== ownerId.toString()) {
            return res.status(403).json({ message: "Access denied: Chat does not belong to owner." });
        }

        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chat details", error: error.message });
    }
};

/**
 * Створити новий чат
 * @route POST /api/chats
 */
export const createChat = async (req, res) => {
    const { firstName, lastName } = req.body;
    const ownerId = getOwnerId(req);

    // ПЕРЕВІРКА ВЛАСНОСТІ (власник має бути)
    if (!ownerId)
        return res.status(401).json({ message: "Authentication required." });

    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required.' });
    }

    try {
        const avatarUrl = await dogCeo(); 
        const newChat = new Chat({ ownerId, firstName, lastName, avatarUrl });
        await newChat.save();
        
        res.status(201).json(newChat);
    } catch (error) {
        res.status(500).json({ message: 'Error creating chat', error: error.message });
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

    // ПЕРЕВІРКА ВЛАСНОСТІ (власник має бути)
    if (!ownerId) return res.status(401).json({ message: "Authentication required." });

    // ПЕРЕВІРКА ВЛАСНОСТІ: Шукаємо чат, що належить власнику
    const chat = await Chat.findOne({ _id: id, ownerId });
    if (!chat) return res.status(403).json({ message: "Access denied: Chat not found or does not belong to owner." });

    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required for update.' });
    }

    try {
        const updatedChat = await Chat.findByIdAndUpdate(
            id,
            { firstName, lastName },
            { new: true, runValidators: true }
        );

        if (!updatedChat) {
            // Це не повинно трапитись, оскільки ми знайшли його вище
            return res.status(404).json({ message: 'Chat not found.' });
        }

        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(500).json({ message: 'Error updating chat', error: error.message });
    }
};

/**
 * Видалити чат та всі пов'язані повідомлення
 * @route DELETE /api/chats/:id
 */
export const deleteChat = async (req, res) => {
    const { id } = req.params;
    const ownerId = getOwnerId(req);

    // ПЕРЕВІРКА ВЛАСНОСТІ (власник має бути)
    if (!ownerId) return res.status(401).json({ message: "Authentication required." });

    // ПЕРЕВІРКА ВЛАСНОСТІ: Шукаємо чат, що належить власнику
    const chat = await Chat.findOne({ _id: id, ownerId });
    if (!chat) return res.status(403).json({ message: "Access denied: Chat not found or does not belong to owner." });

    try {
        // Видалення чату (перевірка власності вже була вище)
        await Chat.findByIdAndDelete(id);

        // Видаляємо всі повідомлення, пов'язані з цим чатом 
        await Message.deleteMany({ chat: id });

        res.status(200).json({ message: 'Chat and all messages deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting chat', error: error.message });
    }
};

// ====================================================================
// B. ПОВІДОМЛЕННЯ ТА АВТО-ВІДПОВІДЬ
// ====================================================================

/**
 * Отримати історію повідомлень для конкретного чату
 * @route GET /api/chats/:chatId/messages
 */
export const getMessages = async (req, res) => {
    const { chatId } = req.params;
    const ownerId = getOwnerId(req); // Додано отримання ownerId

    // ПЕРЕВІРКА ВЛАСНОСТІ (власник має бути)
    if (!ownerId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    try {
        // ПЕРЕВІРКА ВЛАСНОСТІ: Перевіряємо, чи чат належить власнику
        const chat = await Chat.findOne({ _id: chatId, ownerId });
        if (!chat) {
            return res.status(403).json({ message: "Access denied: Chat not found or does not belong to owner." });
        }
        
        // Якщо власник є, завантажуємо повідомлення
        const messages = await Message.find({ chat: chatId }).sort({ timestamp: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
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

    // ПЕРЕВІРКА ВЛАСНОСТІ: Шукаємо чат, що належить власнику
    const chat = await Chat.findOne({ _id: chatId, ownerId });
    if (!chat) return res.status(403).json({ message: "Access denied: Chat not found or does not belong to owner." });

    if (!text) {
        return res.status(400).json({ message: 'Message text cannot be empty.' });
    }

    try {
        // 1. Створюємо повідомлення користувача
        const userMessage = new Message({
            chat: chatId,
            text,
            sender: 'user',
            senderId: ownerId,
            incoming: false,
        });
        await userMessage.save();

        // Оновлюємо посилання на останнє повідомлення в чаті
        await Chat.findByIdAndUpdate(chatId, { lastMessage: userMessage._id });

        // Відправляємо підтвердження клієнту (повідомлення користувача збережено)
        res.status(201).json(userMessage); 
        
        // =================================================================
        // 2. ЛОГІКА АВТО-ВІДПОВІДІ (АСИНХРОННА ЧАСТИНА)
        // =================================================================

        // Затримка 3 секунди (вимога ТЗ)
        setTimeout(async () => {
            try {
                const quote = await getQuote(); // Отримуємо цитату
                
                const autoResponse = new Message({
                    chat: chatId,
                    text: quote,
                    sender: 'auto_response',
                    senderId: chat._id.toString(), // Встановлюємо ID чату/бота
                    incoming: true,
                });
                await autoResponse.save();
                const response = { 
                    autoResponse: autoResponse.toObject(), // 💡 Перетворюємо Mongoose-об'єкт на простий JS-об'єкт
                    chat: chat.toObject() // 💡 Також перетворюємо
                };
                await Chat.findByIdAndUpdate(chatId, { lastMessage: autoResponse._id });

                if (ioInstance) {
                    ioInstance.to(chatId.toString()).emit('new_message', response);

                    ioInstance.emit('chat_list_updated');
                }

            } catch (error) {
                console.error('Error during auto-response generation:', error.message);
            }
        }, 3000);

    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};


/**
 * Оновити існуюче власне повідомлення
 * @route PUT /api/messages/:id
 */
export const updateMessage = async (req, res) => {
    const { id } = req.params;
    const { text } = req.body; 
    const ownerId = getOwnerId(req); // Отримуємо справжній ID власника з аутентифікації

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
        
        // 1. ПЕРЕВІРКА ПРАВ: Чи senderId повідомлення збігається з ID автентифікованого власника
        if (message.senderId.toString() !== ownerId.toString()) { 
             return res.status(403).json({ message: 'You can only edit your own messages.' });
        }
        
        // 2. ПЕРЕВІРКА ТИПУ: Дозволяємо оновлювати лише повідомлення користувача
        if (message.sender !== 'user') {
            return res.status(403).json({ message: 'Cannot update auto-response messages.' });
        }
        
        message.text = text;
        message.isEdited = true; 
        await message.save();

        if (ioInstance) {
            ioInstance.to(message.chat.toString()).emit('message_updated', message);
        }

        res.status(200).json(message);

    } catch (error) {
        res.status(500).json({ message: 'Error updating message', error: error.message });
    }
};

// ====================================================================
// ЕКСПОРТ
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