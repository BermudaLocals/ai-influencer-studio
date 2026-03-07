// server/routes/billing.js
const express = require('express');
const router  = express.Router();

// Redirect all billing to monetization
router.all('*', (req, res, next) => {
  req.url = req.url.replace('/billing', '/monetization');
  next();
});

router.get('/', (req, res) => {
  res.json({ message: 'Use /api/monetization for billing', plans_url: '/api/monetization/plans' });
});

module.exports = router;
