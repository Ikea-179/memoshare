import db, { get, all, run } from '../database.js';

export const exportData = (req, res) => {
  try {
    const userId = req.user.id;

    const user = get('SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ?', [userId]);

    const groups = all(`
      SELECT g.* FROM memo_groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `, [userId]);

    const groupsWithData = groups.map(group => {
      const members = all(`
        SELECT u.id, u.username, u.nickname, u.avatar
        FROM group_members gm
        INNER JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
      `, [group.id]);

      const memos = all('SELECT * FROM memos WHERE group_id = ?', [group.id]);

      return {
        ...group,
        members,
        memos
      };
    });

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user,
      groups: groupsWithData
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=memoshare_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (error) {
    console.error('导出数据错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

export const importData = (req, res) => {
  try {
    const { groups } = req.body;
    const userId = req.user.id;

    if (!groups || !Array.isArray(groups)) {
      return res.status(400).json({ error: '无效的导入数据' });
    }

    let importedCount = 0;

    for (const group of groups) {
      const existingGroup = get('SELECT id FROM memo_groups WHERE name = ? AND created_by = ?', [group.name, userId]);
      
      let groupId;
      if (existingGroup) {
        groupId = existingGroup.id;
      } else {
        const result = run('INSERT INTO memo_groups (name, created_by) VALUES (?, ?)', [group.name, userId]);
        groupId = result.lastInsertRowid;
        run('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, userId, 'owner']);
      }

      if (group.memos && Array.isArray(group.memos)) {
        for (const memo of group.memos) {
          run(`
            INSERT INTO memos (group_id, content, image_url, due_date, is_recurring, recurring_type, is_completed, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [groupId, memo.content, memo.image_url, memo.due_date, memo.is_recurring || 0, memo.recurring_type, memo.is_completed || 0, userId]);
          importedCount++;
        }
      }
    }

    res.json({ message: `成功导入 ${importedCount} 条备忘录` });
  } catch (error) {
    console.error('导入数据错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
