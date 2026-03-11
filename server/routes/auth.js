import bcrypt from 'bcryptjs';
import db, { get, all, run } from '../database.js';
import { generateToken } from '../middleware/auth.js';

export const register = (req, res) => {
  try {
    const { username, password, nickname, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const existingUser = get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = run(
      'INSERT INTO users (username, password, nickname, email) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, nickname || username, email || null]
    );

    const user = get('SELECT id, username, nickname, avatar, email, email_reminder, reminder_time, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    
    const token = generateToken(user);
    
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const login = (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken(user);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        email_reminder: user.email_reminder,
        reminder_time: user.reminder_time,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const getMe = (req, res) => {
  try {
    const user = get('SELECT id, username, nickname, avatar, email, email_reminder, reminder_time, created_at FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const updateProfile = (req, res) => {
  try {
    const { nickname, avatar, email, email_reminder, reminder_time } = req.body;
    
    const updates = [];
    const params = [];
    
    if (nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(nickname);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (email_reminder !== undefined) {
      updates.push('email_reminder = ?');
      params.push(email_reminder ? 1 : 0);
    }
    if (reminder_time !== undefined) {
      updates.push('reminder_time = ?');
      params.push(reminder_time);
    }
    
    if (updates.length > 0) {
      params.push(req.user.id);
      run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    const user = get('SELECT id, username, nickname, avatar, email, email_reminder, reminder_time, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
