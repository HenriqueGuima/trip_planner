const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), '..', '..', 'trips.db');

function openDb() {
  return new sqlite3.Database(dbPath);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) return resolve(req.body);
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = openDb();

  try {
    if (req.method === 'GET') {
      const date = req.query && req.query.date;
      const sql = date ? 'SELECT * FROM trips WHERE DATE(datetime) = ? ORDER BY datetime ASC' : 'SELECT * FROM trips ORDER BY datetime ASC';
      const params = date ? [date] : [];
      db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      });

    } else if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { home, destination, datetime } = body || {};
      if (!home || !destination || !datetime) return res.status(400).json({ error: 'Missing fields' });
      const normalized = (datetime || '').replace('T', ' ').trim();
      db.run('INSERT INTO trips (home, destination, datetime) VALUES (?, ?, ?)', [home, destination, normalized], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
      });

    } else {
      res.setHeader('Allow', 'GET,POST,OPTIONS');
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
