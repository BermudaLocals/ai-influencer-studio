const express = require('express');
const router = express.Router();
const { seedToNVME } = require('../services/nvmeService');

router.post('/global', async (req, res) => {
    const { content } = req.body;
    const result = await seedToNVME(content);
    res.json({ status: 'published', nvme_sync: result.success });
});
module.exports = router;
