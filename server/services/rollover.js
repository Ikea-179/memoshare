import cron from 'node-cron';
import { all, run, get, saveDb } from '../database.js';

export const processAutoRollover = async () => {
  try {
    console.log('开始处理自动顺延任务...');
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const incompleteMemos = all(`
      SELECT m.*, g.name as group_name
      FROM memos m
      JOIN memo_groups g ON m.group_id = g.id
      WHERE m.is_completed = 0
        AND m.due_date IS NOT NULL
        AND m.auto_rollover = 1
        AND m.due_date < ?
    `, [today]);
    
    console.log(`找到 ${incompleteMemos.length} 个需要顺延的任务`);
    
    for (const memo of incompleteMemos) {
      const currentDueDate = new Date(memo.due_date);
      const nextDueDate = new Date(currentDueDate);
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      
      const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
      
      run(`
        UPDATE memos 
        SET due_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nextDueDateStr, memo.id]);
      
      console.log(`任务 "${memo.content}" 已从 ${memo.due_date} 顺延到 ${nextDueDateStr}`);
    }
    
    saveDb();
    console.log('自动顺延任务处理完成');
  } catch (error) {
    console.error('处理自动顺延任务出错:', error);
  }
};

export const startRolloverScheduler = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('定时任务触发: 每日午夜检查自动顺延');
    processAutoRollover();
  });
  console.log('自动顺延定时任务已启动 (每天 0:00 执行)');
};
