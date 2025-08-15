const Trip = require('../models/tripModel');

// Normalize 'YYYY-MM-DDTHH:MM' -> 'YYYY-MM-DD HH:MM' for SQLite DATE() parsing
function normalize(dt) {
  return (dt || '').replace('T', ' ').trim();
}

exports.getTrips = (req, res) => {
  const date = req.query.date;
  if (date) {
    Trip.getByDate(date, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    Trip.getAll((err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
};

exports.addTrip = (req, res) => {
  const { home, destination } = req.body;
  let { datetime } = req.body;
  if (!home || !destination || !datetime) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  datetime = normalize(datetime);
  Trip.insert(home, destination, datetime, (err, trip) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(trip);
  });
};

exports.updateTrip = (req, res) => {
  const { id } = req.params;
  const { home, destination } = req.body;
  let { datetime } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  datetime = normalize(datetime);
  Trip.update(id, home, destination, datetime, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

exports.deleteTrip = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  Trip.delete(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};