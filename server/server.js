// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const { Server } = require('socket.io');

// const authRoutes = require('./routes/auth');
// const historyRoutes = require('./routes/history');

// const app = express();
// app.use(cors());
// app.use(express.json());

// app.use('/api/auth', authRoutes);
// app.use('/api/history', historyRoutes);

// const server = http.createServer(app);

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB connected successfully"))
//   .catch(err => console.error("MongoDB connection error:", err));

// const io = new Server(server, {
//     cors: {
//         origin: 'http://localhost:3000',
//         methods: ['GET', 'POST'],
//     },
// });

// let onlineUsers = {};

// io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//     socket.on('join', (userId) => {
//         onlineUsers[userId] = socket.id;
//         io.emit('online-users', Object.keys(onlineUsers));
//     });

//     const getUserIdFromSocketId = (socketId) => {
//         return Object.keys(onlineUsers).find(userId => onlineUsers[userId] === socketId);
//     }

//     socket.on('offer', (payload) => {
//         const targetSocketId = onlineUsers[payload.target];
//         if (targetSocketId) {
//             io.to(targetSocketId).emit('offer', { ...payload, from: getUserIdFromSocketId(socket.id) });
//         }
//     });

//     socket.on('answer', (payload) => {
//         const targetSocketId = onlineUsers[payload.target];
//         if (targetSocketId) {
//             io.to(targetSocketId).emit('answer', { ...payload, from: getUserIdFromSocketId(socket.id) });
//         }
//     });

//     socket.on('ice-candidate', (payload) => {
//         const targetSocketId = onlineUsers[payload.target];
//         if (targetSocketId) {
//             io.to(targetSocketId).emit('ice-candidate', { ...payload, from: getUserIdFromSocketId(socket.id) });
//         }
//     });

//     socket.on('disconnect', () => {
//         const disconnectedUserId = getUserIdFromSocketId(socket.id);
//         if (disconnectedUserId) {
//             delete onlineUsers[disconnectedUserId];
//             io.emit('online-users', Object.keys(onlineUsers));
//         }
//         console.log('User disconnected:', socket.id);
//     });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// ---------------------------------------------------------------------------------------------------------------


require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
const allowedOrigin = 'https://sharesphere-4591.vercel.app';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// ✅ Ensure OPTIONS preflight passes
app.options('*', cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

const server = http.createServer(app);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

const io = new Server(server, {
  cors: {
    origin: allowedOrigin, // no trailing slash!
    methods: ['GET', 'POST']
  }
});

let onlineUsers = {}; // { userId: { socketId, username } }

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', ({ userId, username }) => {
        onlineUsers[userId] = { socketId: socket.id, username };
        broadcastOnlineUsers();
    });

    const getUserIdFromSocketId = (socketId) => {
        return Object.keys(onlineUsers).find(userId => onlineUsers[userId].socketId === socketId);
    }

    const broadcastOnlineUsers = () => {
        const users = Object.entries(onlineUsers).map(([id, { username }]) => ({ id, username }));
        io.emit('online-users', users);
    }

    socket.on('offer', (payload) => {
        const targetUser = onlineUsers[payload.target];
        if (targetUser) {
            io.to(targetUser.socketId).emit('offer', { ...payload, from: getUserIdFromSocketId(socket.id) });
        }
    });

    socket.on('answer', (payload) => {
        const targetUser = onlineUsers[payload.target];
        if (targetUser) {
            io.to(targetUser.socketId).emit('answer', { ...payload, from: getUserIdFromSocketId(socket.id) });
        }
    });

    socket.on('ice-candidate', (payload) => {
        const targetUser = onlineUsers[payload.target];
        if (targetUser) {
            io.to(targetUser.socketId).emit('ice-candidate', { ...payload, from: getUserIdFromSocketId(socket.id) });
        }
    });

    socket.on('disconnect', () => {
        const disconnectedUserId = getUserIdFromSocketId(socket.id);
        if (disconnectedUserId) {
            delete onlineUsers[disconnectedUserId];
            broadcastOnlineUsers();
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// module.exports = app;