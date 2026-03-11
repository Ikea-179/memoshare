import db, { get, all, run } from '../database.js';

export const getGroups = (req, res) => {
  try {
    const groups = all(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT COUNT(*) FROM memos WHERE group_id = g.id AND is_completed = 0) as pending_count
      FROM memo_groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `, [req.user.id]);

    res.json(groups);
  } catch (error) {
    console.error('获取组列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const createGroup = (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: '组名称不能为空' });
    }

    const result = run('INSERT INTO memo_groups (name, created_by) VALUES (?, ?)', [name, req.user.id]);
    const groupId = result.lastInsertRowid;

    run('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, req.user.id, 'owner']);

    const group = get('SELECT * FROM memo_groups WHERE id = ?', [groupId]);
    
    res.status(201).json(group);
  } catch (error) {
    console.error('创建组错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const getGroup = (req, res) => {
  try {
    const { id } = req.params;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [id, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: '无权访问此备忘录组' });
    }

    const group = get('SELECT * FROM memo_groups WHERE id = ?', [id]);
    if (!group) {
      return res.status(404).json({ error: '组不存在' });
    }

    const members = all(`
      SELECT u.id, u.username, u.nickname, u.avatar, gm.role, gm.joined_at
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `, [id]);

    res.json({ ...group, members, role: membership.role });
  } catch (error) {
    console.error('获取组详情错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const updateGroup = (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role IN (?, ?)', [id, req.user.id, 'owner', 'admin']);
    if (!membership) {
      return res.status(403).json({ error: '无权修改此组' });
    }

    run('UPDATE memo_groups SET name = ? WHERE id = ?', [name, id]);

    const group = get('SELECT * FROM memo_groups WHERE id = ?', [id]);
    res.json(group);
  } catch (error) {
    console.error('更新组错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const deleteGroup = (req, res) => {
  try {
    const { id } = req.params;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?', [id, req.user.id, 'owner']);
    if (!membership) {
      return res.status(403).json({ error: '只有组长才能删除此组' });
    }

    run('DELETE FROM memo_groups WHERE id = ?', [id]);

    res.json({ message: '组已删除' });
  } catch (error) {
    console.error('删除组错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const addMember = (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role IN (?, ?)', [id, req.user.id, 'owner', 'admin']);
    if (!membership) {
      return res.status(403).json({ error: '无权添加成员' });
    }

    const user = get('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existingMember = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [id, user.id]);
    if (existingMember) {
      return res.status(400).json({ error: '用户已在组中' });
    }

    run('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [id, user.id, 'member']);

    const newMember = get(`
      SELECT u.id, u.username, u.nickname, u.avatar, gm.role, gm.joined_at
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ? AND gm.user_id = ?
    `, [id, user.id]);

    res.status(201).json(newMember);
  } catch (error) {
    console.error('添加成员错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const removeMember = (req, res) => {
  try {
    const { id, userId } = req.params;

    const membership = get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [id, req.user.id]);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && parseInt(userId) !== req.user.id)) {
      return res.status(403).json({ error: '无权移除成员' });
    }

    if (parseInt(userId) === req.user.id && membership.role === 'owner') {
      return res.status(400).json({ error: '组长不能退出组' });
    }

    run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [id, userId]);

    res.json({ message: '成员已移除' });
  } catch (error) {
    console.error('移除成员错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
