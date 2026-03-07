const express = require('express');
const router = express.Router();
const { startRestream } = require('../engines/liveEngine');

router.post('/start', (req, res) => {
    const { rtmpUrl, platforms } = req.body;
    const stream = startRestream(rtmpUrl, platforms || ['tiktok', 'nvme']);
    res.json({ success: true, stream });
});
module.exports = router;
