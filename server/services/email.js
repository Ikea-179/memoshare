import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL || 'your-email@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
  }
});

export const sendReminderEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_EMAIL ? `MemoShare <${process.env.GMAIL_EMAIL}>` : 'MemoShare <your-email@gmail.com>',
      to,
      subject,
      html
    });
    console.log(`邮件发送成功: ${to}`);
    return true;
  } catch (error) {
    console.error('邮件发送失败:', error);
    return false;
  }
};

export const sendMemoReminder = async (userEmail, memo, groupName) => {
  const dueDate = new Date(memo.due_date).toLocaleDateString('zh-CN');
  const subject = `📅 备忘录提醒：${memo.content.substring(0, 20)}...`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EC4899;">📋 MemoShare 提醒</h2>
      <div style="background: #F9FAFB; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>任务内容：</strong>${memo.content}</p>
        <p style="margin: 10px 0;"><strong>所属组：</strong>${groupName}</p>
        <p style="margin: 10px 0;"><strong>截止日期：</strong>${dueDate}</p>
        <p style="margin: 10px 0;"><strong>状态：</strong>${memo.is_completed ? '✅ 已完成' : '⭕ 未完成'}</p>
      </div>
      <p style="color: #6B7280; font-size: 14px;">
        点击查看详情：<a href="http://116.62.101.203" style="color: #EC4899;">打开 MemoShare</a>
      </p>
    </div>
  `;

  return sendReminderEmail(userEmail, subject, html);
};
