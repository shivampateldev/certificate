// Vercel serverless function for health check
module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    environment: process.env.NODE_ENV || 'development'
  });
}