const express = require('express');
const router = express.Router();

// Production Pattern: Route -> Logic -> Response
router.get('/', (req, res) => res.json({ status: 'active', service: 'leads' }));
router.post('/', (req, res) => res.status(202).json({ message: 'Request received by leads' }));

module.exports = router;
