const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../trips.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home TEXT NOT NULL,
      destination TEXT NOT NULL,
      datetime TEXT NOT NULL
    )
  `);
});

module.exports = db;