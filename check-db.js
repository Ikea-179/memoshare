import initSqlJs from 'sql.js';
import fs from 'fs';

(async () => {
  try {
    const SQL = await initSqlJs({ locateFile: filename => filename });
    const db = new SQL.Database(fs.readFileSync('memoshare.db'));
    const result = db.exec('PRAGMA table_info(memos)');
    console.log('Memos table columns:');
    result[0].values.forEach(row => console.log(row[1]));
  } catch (error) {
    console.error('Error:', error);
  }
})();
