const express = require("express");
const router = express.Router();
const { getCreatorStats, getDailyBreakdown, getTopPerformingContent, getEmpireStats, recordEvent } = require("../services/analyticsEngine");

const auth = require("../middleware/auth");

router.get("/stats/:avatarId", auth, async (req, res) => {
  try {
    const stats = await getCreatorStats(req.params.avatarId, req.query.days || 30);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/breakdown/:avatarId", auth, async (req, res) => {
  try {
    const data = await getDailyBreakdown(req.params.avatarId, req.query.days || 30);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/top/:avatarId", auth, async (req, res) => {
  try {
    const data = await getTopPerformingContent(req.params.avatarId, req.query.limit || 10);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/empire", auth, async (req, res) => {
  try {
    const data = await getEmpireStats(req.user.id);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/event", auth, async (req, res) => {
  try {
    await recordEvent(req.body.avatarId, req.body.eventType, req.body.data);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;