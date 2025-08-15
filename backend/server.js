const express = require('express');
const cors = require('cors');
const path = require('path');
const tripRoutes = require('./routes/tripRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', tripRoutes);

// (Optional) serve frontend for convenience if you want a single process
app.use('/', express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));