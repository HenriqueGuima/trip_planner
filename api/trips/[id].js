const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'trips.db');
function openDb() { return new sqlite3.Database(dbPath); }

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
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query && req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const db = openDb();
  try {
    if (req.method === 'PUT') {
      const body = await parseJsonBody(req);
      const { home, destination, datetime } = body || {};
      if (!home || !destination || !datetime) return res.status(400).json({ error: 'Missing fields' });
      const normalized = (datetime || '').replace('T', ' ').trim();
      db.run('UPDATE trips SET home = ?, destination = ?, datetime = ? WHERE id = ?', [home, destination, normalized, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
      });

    } else if (req.method === 'DELETE') {
      db.run('DELETE FROM trips WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
      });

    } else {
      res.setHeader('Allow', 'PUT,DELETE,OPTIONS');
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
