import db, { get, all, run } from '../database.js';

export const getMemos = (req, res) => {
  try {
    const { groupId } = req.params;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权访问此备忘录组' });
    }

    const memos = all(`
      SELECT m.*, u.username as creator_username, u.nickname as creator_nickname,
        cu.nickname as completer_nickname
      FROM memos m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN users cu ON m.completed_by = cu.id
      WHERE m.group_id = ?
      ORDER BY 
        m.is_completed ASC,
        CASE WHEN m.due_date IS NULL THEN 1 ELSE 0 END,
        m.due_date ASC,
        m.created_at DESC
    `, [groupId]);

    res.json(memos);
  } catch (error) {
    console.error('获取备忘录列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const createMemo = (req, res, io) => {
  try {
    const { groupId } = req.params;
    const { content, image_url, due_date, due_time, is_recurring, recurring_type, assignees } = req.body;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权在此组添加备忘录' });
    }

    if (!content) {
      return res.status(400).json({ error: '备忘录内容不能为空' });
    }

    const result = run(`
      INSERT INTO memos (group_id, content, image_url, due_date, due_time, is_recurring, recurring_type, assignees, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [groupId, content, image_url || null, due_date || null, due_time || null, is_recurring ? 1 : 0, recurring_type || null, assignees || null, req.user.id]);

    const memo = get(`
      SELECT m.*, u.username as creator_username, u.nickname as creator_nickname
      FROM memos m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [result.lastInsertRowid]);

    if (io) {
      io.to(`group_${groupId}`).emit('memo_created', memo);
    }

    res.status(201).json(memo);
  } catch (error) {
    console.error('创建备忘录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const updateMemo = (req, res, io) => {
  try {
    const { id } = req.params;
    const { content, image_url, due_date, due_time, is_recurring, recurring_type, assignees } = req.body;

    const memo = get('SELECT * FROM memos WHERE id = ?', [id]);
    if (!memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [memo.group_id, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权修改此备忘录' });
    }

    run(`
      UPDATE memos 
      SET content = ?, image_url = ?, due_date = ?, due_time = ?, is_recurring = ?, recurring_type = ?, assignees = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [content, image_url, due_date, due_time, is_recurring ? 1 : 0, recurring_type, assignees, id]);

    const updatedMemo = get(`
      SELECT m.*, u.username as creator_username, u.nickname as creator_nickname
      FROM memos m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [id]);

    if (io) {
      io.to(`group_${memo.group_id}`).emit('memo_updated', updatedMemo);
    }

    res.json(updatedMemo);
  } catch (error) {
    console.error('更新备忘录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const deleteMemo = (req, res, io) => {
  try {
    const { id } = req.params;

    const memo = get('SELECT * FROM memos WHERE id = ?', [id]);
    if (!memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [memo.group_id, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权删除此备忘录' });
    }

    run('DELETE FROM memos WHERE id = ?', [id]);

    if (io) {
      io.to(`group_${memo.group_id}`).emit('memo_deleted', { id: parseInt(id) });
    }

    res.json({ message: '备忘录已删除' });
  } catch (error) {
    console.error('删除备忘录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const completeMemo = (req, res, io) => {
  try {
    const { id } = req.params;

    const memo = get('SELECT * FROM memos WHERE id = ?', [id]);
    if (!memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [memo.group_id, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权操作此备忘录' });
    }

    run(`
      UPDATE memos 
      SET is_completed = 1, completed_by = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.user.id, id]);

    const updatedMemo = get(`
      SELECT m.*, u.username as creator_username, u.nickname as creator_nickname,
        cu.nickname as completer_nickname
      FROM memos m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN users cu ON m.completed_by = cu.id
      WHERE m.id = ?
    `, [id]);

    if (io) {
      io.to(`group_${memo.group_id}`).emit('memo_completed', updatedMemo);
    }

    res.json(updatedMemo);
  } catch (error) {
    console.error('完成备忘录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const uncompleteMemo = (req, res, io) => {
  try {
    const { id } = req.params;

    const memo = get('SELECT * FROM memos WHERE id = ?', [id]);
    if (!memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [memo.group_id, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权操作此备忘录' });
    }

    run(`
      UPDATE memos 
      SET is_completed = 0, completed_by = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    const updatedMemo = get(`
      SELECT m.*, u.username as creator_username, u.nickname as creator_nickname
      FROM memos m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [id]);

    if (io) {
      io.to(`group_${memo.group_id}`).emit('memo_uncompleted', updatedMemo);
    }

    res.json(updatedMemo);
  } catch (error) {
    console.error('取消完成备忘录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
