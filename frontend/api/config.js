// Vercel serverless endpoint that returns a small JS snippet setting window.APP_CONFIG
// This allows the frontend to read sensitive values from process.env at runtime.
module.exports = (req, res) => {
  const key = process.env.GOOGLE_MAPS_KEY || '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(`window.APP_CONFIG = window.APP_CONFIG || {};\nwindow.APP_CONFIG.GOOGLE_MAPS_KEY = ${JSON.stringify(key)};`);
};
