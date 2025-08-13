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


// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const { Server } = require('socket.io');

// const authRoutes = require('./routes/auth');
// const historyRoutes = require('./routes/history');

// const app = express();
// const allowedOrigin = 'https://sharesphere-4591.vercel.app';

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", allowedOrigin);
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.header("Access-Control-Allow-Credentials", "true");

//   // Short-circuit preflight requests
//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }

//   next();
// });

// app.use(cors({
//   origin: allowedOrigin,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true
// }));

// // ✅ Ensure OPTIONS preflight passes
// app.options('*', cors({
//   origin: allowedOrigin,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true
// }));

// app.use(express.json());

// app.use('/api/auth', authRoutes);
// app.use('/api/history', historyRoutes);

// const server = http.createServer(app);

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB connected successfully"))
//   .catch(err => console.error("MongoDB connection error:", err));

// const io = new Server(server, {
//   cors: {
//     origin: allowedOrigin, // no trailing slash!
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     credentials: true
//   }
// });

// let onlineUsers = {}; // { userId: { socketId, username } }

// io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//     socket.on('join', ({ userId, username }) => {
//         onlineUsers[userId] = { socketId: socket.id, username };
//         broadcastOnlineUsers();
//     });

//     const getUserIdFromSocketId = (socketId) => {
//         return Object.keys(onlineUsers).find(userId => onlineUsers[userId].socketId === socketId);
//     }

//     const broadcastOnlineUsers = () => {
//         const users = Object.entries(onlineUsers).map(([id, { username }]) => ({ id, username }));
//         io.emit('online-users', users);
//     }

//     socket.on('offer', (payload) => {
//         const targetUser = onlineUsers[payload.target];
//         if (targetUser) {
//             io.to(targetUser.socketId).emit('offer', { ...payload, from: getUserIdFromSocketId(socket.id) });
//         }
//     });

//     socket.on('answer', (payload) => {
//         const targetUser = onlineUsers[payload.target];
//         if (targetUser) {
//             io.to(targetUser.socketId).emit('answer', { ...payload, from: getUserIdFromSocketId(socket.id) });
//         }
//     });

//     socket.on('ice-candidate', (payload) => {
//         const targetUser = onlineUsers[payload.target];
//         if (targetUser) {
//             io.to(targetUser.socketId).emit('ice-candidate', { ...payload, from: getUserIdFromSocketId(socket.id) });
//         }
//     });

//     socket.on('disconnect', () => {
//         const disconnectedUserId = getUserIdFromSocketId(socket.id);
//         if (disconnectedUserId) {
//             delete onlineUsers[disconnectedUserId];
//             broadcastOnlineUsers();
//         }
//         console.log('User disconnected:', socket.id);
//     });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// // module.exports = app;


// Import necessary modules
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

// Import your route handlers
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

// --- Main Application Setup ---

const app = express();
const server = http.createServer(app);
const allowedOrigin = 'https://sharesphere-4591.vercel.app';

// --- Middleware Configuration ---

// 1. CORS Middleware: This should come first.
// It correctly handles all CORS-related headers, including preflight OPTIONS requests.
app.use(cors({
  origin: allowedOrigin,
  credentials: true, // Allows cookies and authorization headers to be sent
}));

// 2. JSON Body Parser: This is needed to parse `application/json` content from request bodies.
app.use(express.json());

// --- API Routes ---

// All your API routes are defined after the core middleware.
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// --- MongoDB Database Connection ---

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Socket.IO Server Setup ---

// The Socket.IO server is attached to the same HTTP server.
// It requires its own CORS configuration for WebSocket connections.
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

let onlineUsers = {}; // Stores { userId: { socketId, username } }

// --- Socket.IO Event Handling ---

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Helper function to find a user by their socket ID
  const getUserIdFromSocketId = (socketId) => {
    return Object.keys(onlineUsers).find(userId => onlineUsers[userId].socketId === socketId);
  };

  // Helper function to broadcast the updated list of online users
  const broadcastOnlineUsers = () => {
    const users = Object.entries(onlineUsers).map(([id, { username }]) => ({ id, username }));
    io.emit('online-users', users);
  };

  // When a user joins, store their info and broadcast the new list
  socket.on('join', ({ userId, username }) => {
    if (userId) {
        onlineUsers[userId] = { socketId: socket.id, username };
        broadcastOnlineUsers();
    }
  });

  // Relay WebRTC signaling offers
  socket.on('offer', (payload) => {
    const targetUser = onlineUsers[payload.target];
    if (targetUser) {
      io.to(targetUser.socketId).emit('offer', { ...payload, from: getUserIdFromSocketId(socket.id) });
    }
  });

  // Relay WebRTC signaling answers
  socket.on('answer', (payload) => {
    const targetUser = onlineUsers[payload.target];
    if (targetUser) {
      io.to(targetUser.socketId).emit('answer', { ...payload, from: getUserIdFromSocketId(socket.id) });
    }
  });

  // Relay WebRTC ICE candidates
  socket.on('ice-candidate', (payload) => {
    const targetUser = onlineUsers[payload.target];
    if (targetUser) {
      io.to(targetUser.socketId).emit('ice-candidate', { ...payload, from: getUserIdFromSocketId(socket.id) });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const disconnectedUserId = getUserIdFromSocketId(socket.id);
    if (disconnectedUserId) {
      delete onlineUsers[disconnectedUserId];
      broadcastOnlineUsers(); // Inform other users that this user went offline
    }
    console.log('User disconnected:', socket.id);
  });
});


// --- Start the Server ---

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});