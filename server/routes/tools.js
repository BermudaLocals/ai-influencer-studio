const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const upload = multer({ dest: '/tmp/uploads/' });

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// Helper to send file and cleanup
async function sendFile(res, filePath) {
  res.sendFile(path.resolve(filePath), () => {
    try { fs.unlinkSync(filePath); } catch {}
  });
}

// ── FACE SWAP ─────────────────────────────────────────
// POST /api/tools/faceswap
// fields: source (face), target (body/scene)
router.post('/faceswap', auth, upload.fields([
  { name: 'source', maxCount: 1 },
  { name: 'target', maxCount: 1 }
]), async (req, res) => {
  try {
    const { faceSwap } = require('../services/faceSwapEngine');
    const sourcePath = req.files['source'][0].path;
    const targetPath = req.files['target'][0].path;
    const resultUrl = await faceSwap(sourcePath, targetPath);
    // Cleanup uploads
    fs.unlinkSync(sourcePath);
    fs.unlinkSync(targetPath);
    res.json({ success: true, url: resultUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── BACKGROUND REMOVAL ────────────────────────────────
// POST /api/tools/remove-bg
router.post('/remove-bg', auth, upload.single('image'), async (req, res) => {
  try {
    const { removeBackground } = require('../services/bgRemovalEngine');
    const result = await removeBackground(req.file.path);
    fs.unlinkSync(req.file.path);
    await sendFile(res, result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── UPSCALE ───────────────────────────────────────────
// POST /api/tools/upscale
// body: { scale: 2|4 }
router.post('/upscale', auth, upload.single('image'), async (req, res) => {
  try {
    const { upscaleImage } = require('../services/upscalerEngine');
    const scale = parseInt(req.body.scale) || 4;
    const result = await upscaleImage(req.file.path, scale);
    fs.unlinkSync(req.file.path);
    await sendFile(res, result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── FACE ENHANCE ──────────────────────────────────────
router.post('/enhance-face', auth, upload.single('image'), async (req, res) => {
  try {
    const { enhanceFace } = require('../services/upscalerEngine');
    const result = await enhanceFace(req.file.path);
    fs.unlinkSync(req.file.path);
    await sendFile(res, result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── INPAINT ───────────────────────────────────────────
// POST /api/tools/inpaint
// fields: image, mask | body: { prompt }
router.post('/inpaint', auth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]), async (req, res) => {
  try {
    const { inpaintImage } = require('../services/inpaintEngine');
    const result = await inpaintImage({
      imagePath: req.files['image'][0].path,
      maskPath: req.files['mask'][0].path,
      prompt: req.body.prompt,
      negativePrompt: req.body.negative_prompt
    });
    await sendFile(res, result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POSE CONTROL ──────────────────────────────────────
router.post('/pose', auth, upload.single('pose_image'), async (req, res) => {
  try {
    const { poseControl } = require('../services/controlNetEngine');
    const result = await poseControl({
      poseImagePath: req.file.path,
      prompt: req.body.prompt,
      negativePrompt: req.body.negative_prompt
    });
    fs.unlinkSync(req.file.path);
    await sendFile(res, result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── STYLE TRANSFER ────────────────────────────────────
router.post('/style-transfer', auth, upload.single('image'), async (req, res) => {
  try {
    const { styleTransfer } = require('../services/controlNetEngine');
    const result = await styleTransfer({
      contentImagePath: req.file.path,
      stylePrompt: req.body.prompt,
      strength: parseFloat(req.body.strength) || 0.8
    });
    res.json({ success: true, output: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── BULK GENERATE ─────────────────────────────────────
// POST /api/tools/bulk-generate
// body: { prompts: [{prompt, options}], concurrency }
router.post('/bulk-generate', auth, async (req, res) => {
  try {
    const { bulkGenerate } = require('../services/bulkEngine');
    // Stream progress via SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const result = await bulkGenerate({
      prompts: req.body.prompts,
      concurrency: req.body.concurrency || 3,
      onProgress: (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    });
    res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── VARIATIONS ────────────────────────────────────────
router.post('/variations', auth, async (req, res) => {
  try {
    const { generateVariations } = require('../services/bulkEngine');
    const result = await generateVariations({
      basePrompt: req.body.prompt,
      count: req.body.count || 6
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODEL MARKETPLACE ─────────────────────────────────
router.get('/models', auth, (req, res) => {
  const { listModels } = require('../services/modelMarketplace');
  res.json(listModels(req.query));
});

router.get('/models/:id', auth, (req, res) => {
  const { getModel } = require('../services/modelMarketplace');
  const model = getModel(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json(model);
});

module.exports = router;
