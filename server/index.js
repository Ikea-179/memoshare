import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDb } from './database.js';
import { authenticateToken } from './middleware/auth.js';
import { register, login, getMe, updateProfile } from './routes/auth.js';
import { 
  getGroups, createGroup, getGroup, updateGroup, deleteGroup, 
  addMember, removeMember 
} from './routes/groups.js';
import { 
  getMemos, createMemo, updateMemo, deleteMemo, 
  completeMemo, uncompleteMemo 
} from './routes/memos.js';
import { uploadImage } from './routes/upload.js';
import { exportData, importData } from './routes/backup.js';
import upload from './routes/upload.js';
import { startReminderScheduler } from './services/reminder.js';
import { startRolloverScheduler } from './services/rollover.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://116.62.101.203'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://116.62.101.203'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(join(__dirname, '../uploads')));

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, getMe);
app.put('/api/auth/profile', authenticateToken, updateProfile);

app.get('/api/groups', authenticateToken, getGroups);
app.post('/api/groups', authenticateToken, createGroup);
app.get('/api/groups/:id', authenticateToken, getGroup);
app.put('/api/groups/:id', authenticateToken, updateGroup);
app.delete('/api/groups/:id', authenticateToken, deleteGroup);
app.post('/api/groups/:id/members', authenticateToken, addMember);
app.delete('/api/groups/:id/members/:userId', authenticateToken, removeMember);

app.get('/api/groups/:groupId/memos', authenticateToken, getMemos);
app.post('/api/groups/:groupId/memos', authenticateToken, (req, res) => createMemo(req, res, io));
app.put('/api/memos/:id', authenticateToken, (req, res) => updateMemo(req, res, io));
app.delete('/api/memos/:id', authenticateToken, (req, res) => deleteMemo(req, res, io));
app.patch('/api/memos/:id/complete', authenticateToken, (req, res) => completeMemo(req, res, io));
app.patch('/api/memos/:id/uncomplete', authenticateToken, (req, res) => uncompleteMemo(req, res, io));

app.post('/api/upload', authenticateToken, upload.single('image'), uploadImage);

app.get('/api/backup/export', authenticateToken, exportData);
app.post('/api/backup/import', authenticateToken, importData);

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('authenticate', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`用户 ${userId} 已认证`);
  });

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} 加入组 ${groupId}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`Socket ${socket.id} 离开组 ${groupId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
    console.log('用户断开连接:', socket.id);
  });
});

export const notifyUser = (userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await initDb();
  startReminderScheduler();
  startRolloverScheduler();
  httpServer.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
};

startServer().catch(console.error);

export { io, app };
