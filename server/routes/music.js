const express = require('express');
const router = express.Router();

// Production Pattern: Route -> Logic -> Response
router.get('/', (req, res) => res.json({ status: 'active', service: 'music' }));
router.post('/', (req, res) => res.status(202).json({ message: 'Request received by music' }));

module.exports = router;
