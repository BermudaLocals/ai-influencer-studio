const express = require('express');
const router = express.Router();
router.post('/sync', (req, res) => {
    const { type, data } = req.body;
    console.log(`[EMPIRE] Received ${type} alert. Updating Dashboard...`);
    // Broadcast to LiveStudio.jsx via Socket.io
    res.json({ status: 'broadcasted' });
});
module.exports = router;
