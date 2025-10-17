import express from "express"
import mongoose from "mongoose"
import cors from 'cors'
import dotevn from 'dotenv'
import chatRoutes from './routes/chatRoutes.js'; 
import authRoutes from './routes/authRoutes.js'; 
import http from 'http';
import { Server } from "socket.io";

// ====================================================================
// НАЛАШТУВАННЯ СЕРВЕРА
// ====================================================================
dotevn.config();
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// 🚩 Створення HTTP-сервера для Express та Socket.IO
const httpServer = http.createServer(app); 

// 🚩 Ініціалізація Socket.IO
const io = new Server(httpServer, {
    cors: {
        // ❗ ЗМІНІТЬ ЦЕЙ АДРЕС НА URL ВАШОГО REACT-КЛІЄНТА (наприклад, http://localhost:5173 або 3000)
        origin: "http://localhost:5173", 
        methods: ["GET", "POST"]
    }
});

// 🚩 Експортуємо io, щоб використовувати його в контролерах (sendMessage)
export const ioInstance = io; 

// Middleware
app.use(cors()); // Дозволяємо крос-доменні запити
app.use(express.json()); // Дозволяємо Express парсити JSON тіла запитів

// 3. Підключення до MongoDB Atlas
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch(err => console.error('MongoDB connection error:', err));

// 4. Основний маршрут (перевірка роботи сервера)
app.get("/", (req, res) => {
  res.send("Chat API is running...");
});

app.use("/api/chats", chatRoutes);
app.use("/api/messages", chatRoutes);
app.use("/api/users", authRoutes);

app.use((req, res) => {
  res.status(404).send("Route not found");
});

// 🚩 ЛОГІКА SOCKET.IO ПІДКЛЮЧЕННЯ
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Дозволяємо клієнту приєднатися до "кімнати" за ID чату
    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined room: ${chatId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// 6. Запуск сервера
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
