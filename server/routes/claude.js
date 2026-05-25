const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// POST /api/claude — proxy to Anthropic Messages API
router.post('/', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      req.body,
      {
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        timeout: 60000,
      }
    );
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data   = err.response?.data   || { error: err.message };
    console.error('[claude proxy error]', status, data);
    res.status(status).json(data);
  }
});

module.exports = router;
