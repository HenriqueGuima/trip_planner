const db = require('../db');

module.exports = {
  getAll(callback) {
    db.all('SELECT * FROM trips ORDER BY datetime ASC', [], callback);
  },
  getByDate(date, callback) {
    // DATE() will parse ISO8601 (with space) fine; we store as 'YYYY-MM-DD HH:MM'
    db.all('SELECT * FROM trips WHERE DATE(datetime) = ? ORDER BY datetime ASC', [date], callback);
  },
  insert(home, destination, datetime, callback) {
    db.run(
      'INSERT INTO trips (home, destination, datetime) VALUES (?, ?, ?)',
      [home, destination, datetime],
      function (err) {
        callback(err, { id: this?.lastID });
      }
    );
  },
  update(id, home, destination, datetime, callback) {
    db.run(
      'UPDATE trips SET home = ?, destination = ?, datetime = ? WHERE id = ?',
      [home, destination, datetime, id],
      function (err) {
        callback(err, { changes: this?.changes });
      }
    );
  },
  delete(id, callback) {
    db.run(
      'DELETE FROM trips WHERE id = ?',
      [id],
      function (err) {
        callback(err, { changes: this?.changes });
      }
    );
  }
};