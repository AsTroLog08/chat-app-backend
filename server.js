import express from "express";
import mongoose from "mongoose";
import cors from 'cors';
import dotevn from 'dotenv';
import http from 'http';
import { Server } from "socket.io";

// Імпорт маршрутів
import chatRoutes from './routes/chatRoutes.js'; 
import authRoutes from './routes/authRoutes.js'; 

// ====================================================================
// A. ІНІЦІАЛІЗАЦІЯ ТА КОНФІГУРАЦІЯ
// ====================================================================

dotevn.config();
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Створення HTTP-сервера для Express та Socket.IO
const httpServer = http.createServer(app); 

// Ініціалізація Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "https://chat-app-frontend-3tao.onrender.com", 
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Експортуємо io для використання в контролерах (наприклад, для sendMessage)
export const ioInstance = io; 

// Middleware
app.use(cors({ 
    origin: process.env.CLIENT_URL || "https://chat-app-frontend-3tao.onrender.com",
    credentials: true 
}));
app.use(express.json()); 

// ====================================================================
// B. ПІДКЛЮЧЕННЯ ДО БД
// ====================================================================

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB Atlas!'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ====================================================================
// C. МАРШРУТИЗАЦІЯ
// ====================================================================

app.get("/", (req, res) => {
  res.send("Chat API is running... 🚀");
});

app.use("/api/users", authRoutes);
app.use("/api/chats", chatRoutes); 

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ====================================================================
// D. SOCKET.IO ЛОГІКА
// ====================================================================

io.on('connection', (socket) => {
    // console.log(`User connected: ${socket.id}`);

    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        // console.log(`User ${socket.id} joined room: ${chatId}`);
    });

    socket.on('disconnect', () => {
        // console.log(`User disconnected: ${socket.id}`);
    });
});

// ====================================================================
// E. ЗАПУСК СЕРВЕРА
// ====================================================================

httpServer.listen(PORT, () => {
  console.log(`💻 Server is running on port ${PORT}`);
  // console.log(`Open http://localhost:${PORT}`);
});