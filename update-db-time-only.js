import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'memoshare.db');

const updateDatabase = async () => {
  try {
    const SQLITE = await initSqlJs({
      locateFile: filename => join(__dirname, 'node_modules', 'sql.js', 'dist', filename)
    });
    const buffer = readFileSync(DB_PATH);
    const db = new SQLITE.Database(buffer);

    // 检查memos表是否已经有time字段
    const result = db.exec("PRAGMA table_info(memos)");
    const hasTimeField = result[0]?.values.some(row => row[1] === 'time');

    if (!hasTimeField) {
      console.log('添加time字段到memos表...');
      db.run("ALTER TABLE memos ADD COLUMN time TEXT");
      console.log('time字段添加成功');
    } else {
      console.log('time字段已经存在');
    }

    // 保存数据库
    const data = db.export();
    const newBuffer = Buffer.from(data);
    writeFileSync(DB_PATH, newBuffer);
    console.log('数据库更新完成');
  } catch (error) {
    console.error('更新数据库时出错:', error);
  }
};

updateDatabase();
