import cron from 'node-cron';
import { all, get } from '../database.js';
import { sendMemoReminder } from './email.js';

const checkAndSendReminders = async () => {
  try {
    console.log('开始检查待提醒的备忘录...');
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const users = all('SELECT * FROM users WHERE email IS NOT NULL AND email != "" AND email_reminder = 1');
    
    for (const user of users) {
      const reminderTime = user.reminder_time || 'both';
      let datesToCheck = [];
      
      if (reminderTime === 'both') {
        datesToCheck = [today, tomorrow];
      } else if (reminderTime === 'day_before') {
        datesToCheck = [tomorrow];
      } else if (reminderTime === 'day_of') {
        datesToCheck = [today];
      }
      
      if (datesToCheck.length === 0) continue;
      
      const placeholders = datesToCheck.map(() => '?').join(',');
      const memos = all(`
        SELECT m.*, g.name as group_name
        FROM memos m
        JOIN memo_groups g ON m.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
        WHERE m.is_completed = 0
          AND m.due_date IS NOT NULL
          AND m.due_date IN (${placeholders})
      `, [user.id, ...datesToCheck]);

      if (memos.length > 0) {
        console.log(`用户 ${user.username} 有 ${memos.length} 条待提醒备忘录`);
        for (const memo of memos) {
          await sendMemoReminder(user.email, memo, memo.group_name);
        }
      }
    }
    
    console.log('提醒检查完成');
  } catch (error) {
    console.error('提醒检查失败:', error);
  }
};

export const startReminderScheduler = () => {
  cron.schedule('0 9 * * *', () => {
    console.log('定时任务触发: 每日提醒检查');
    checkAndSendReminders();
  });
  
  console.log('邮件提醒定时任务已启动 (每天 9:00 执行)');
};
