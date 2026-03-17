import cron from 'node-cron';
import { all, run, get } from '../database.js';
import { sendMemoReminder } from './email.js';

const checkAndSendReminders = async () => {
  try {
    console.log('开始检查待提醒的备忘录...');
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const users = all('SELECT * FROM users WHERE email IS NOT NULL AND email != "" AND email_reminder = 1');
    
    for (const user of users) {
      const userReminderTime = user.reminder_time || 'both';
      let datesToCheck = [];
      let userCheckMinutesBefore = 0;
      
      if (userReminderTime === 'both') {
        datesToCheck = [today, tomorrow];
      } else if (userReminderTime === 'day_before') {
        datesToCheck = [tomorrow];
      } else if (userReminderTime === 'day_of') {
        datesToCheck = [today];
      } else if (userReminderTime === '15min') {
        userCheckMinutesBefore = 15;
      } else if (userReminderTime === '30min') {
        userCheckMinutesBefore = 30;
      } else if (userReminderTime === '1h') {
        userCheckMinutesBefore = 60;
      } else if (userReminderTime === '2h') {
        userCheckMinutesBefore = 120;
      }
      
      const allMemos = all(`
        SELECT m.*, g.name as group_name
        FROM memos m
        JOIN memo_groups g ON m.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
        WHERE m.is_completed = 0
          AND m.due_date IS NOT NULL
      `, [user.id]);
      
      const memosToRemind = [];
      const sentReminders = [];
      
      for (const memo of allMemos) {
        const memoReminder = memo.reminder || 'none';
        
        if (memoReminder === 'none') continue;
        
        const reminderKey = `${memo.id}_${memoReminder}_${today}`;
        
        let shouldRemind = false;
        
        if (['both', 'day_before', 'day_of'].includes(memoReminder)) {
          if (memoReminder === 'both') {
            datesToCheck = [today, tomorrow];
          } else if (memoReminder === 'day_before') {
            datesToCheck = [tomorrow];
          } else if (memoReminder === 'day_of') {
            datesToCheck = [today];
          }
          
          if (datesToCheck.includes(memo.due_date)) {
            if (currentHour === 8 && currentMinute >= 0 && currentMinute < 5) {
              shouldRemind = true;
              sentReminders.push(reminderKey);
            }
          }
        } else if (['15min', '30min', '1h', '2h'].includes(memoReminder)) {
          if (!memo.time) continue;
          
          const [hours, minutes] = memo.time.split(':').map(Number);
          const dueDateTime = new Date(memo.due_date);
          dueDateTime.setHours(hours, minutes, 0, 0);
          
          const diffMs = dueDateTime.getTime() - now.getTime();
          const diffMinutes = diffMs / (1000 * 60);
          
          let checkMinutes = 0;
          if (memoReminder === '15min') checkMinutes = 15;
          else if (memoReminder === '30min') checkMinutes = 30;
          else if (memoReminder === '1h') checkMinutes = 60;
          else if (memoReminder === '2h') checkMinutes = 120;
          
          if (diffMinutes > 0 && diffMinutes <= checkMinutes && diffMinutes > checkMinutes - 5) {
            shouldRemind = true;
            sentReminders.push(reminderKey);
          }
        } else if (memoReminder === 'morning') {
          if (memo.due_date === today || memo.due_date === tomorrow) {
            if (currentHour === 8 && currentMinute >= 0 && currentMinute < 5) {
              shouldRemind = true;
              sentReminders.push(reminderKey);
            }
          }
        }
        
        if (shouldRemind) {
          memosToRemind.push(memo);
        }
      }
      
      if (userCheckMinutesBefore > 0) {
        for (const memo of allMemos) {
          if (!memo.time) continue;
          
          const [hours, minutes] = memo.time.split(':').map(Number);
          const dueDateTime = new Date(memo.due_date);
          dueDateTime.setHours(hours, minutes, 0, 0);
          
          const diffMs = dueDateTime.getTime() - now.getTime();
          const diffMinutes = diffMs / (1000 * 60);
          
          if (diffMinutes > 0 && diffMinutes <= userCheckMinutesBefore && diffMinutes > userCheckMinutesBefore - 5) {
            const reminderKey = `${memo.id}_user_${today}_${currentTime}`;
            if (!memosToRemind.find(m => m.id === memo.id)) {
              memosToRemind.push(memo);
              sentReminders.push(reminderKey);
            }
          }
        }
      } else if (datesToCheck.length > 0 && currentHour === 8 && currentMinute >= 0 && currentMinute < 5) {
        const placeholders = datesToCheck.map(() => '?').join(',');
        const dateMemos = all(`
          SELECT m.*, g.name as group_name
          FROM memos m
          JOIN memo_groups g ON m.group_id = g.id
          JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
          WHERE m.is_completed = 0
            AND m.due_date IN (${placeholders})
            AND (m.reminder = 'both' OR m.reminder = 'day_before' OR m.reminder = 'day_of')
        `, [user.id, ...datesToCheck]);
        
        for (const memo of dateMemos) {
          if (!memosToRemind.find(m => m.id === memo.id)) {
            memosToRemind.push(memo);
          }
        }
      }

      if (memosToRemind.length > 0) {
        console.log(`用户 ${user.username} 有 ${memosToRemind.length} 条待提醒备忘录`);
        for (const memo of memosToRemind) {
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
  cron.schedule('0 8 * * *', () => {
    console.log('定时任务触发: 每日早上8点提醒检查');
    checkAndSendReminders();
  });
  
  console.log('邮件提醒定时任务已启动 (每天 8:00 执行)');
};
