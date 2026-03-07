const express = require('express');
const router = express.Router();
const podService = require('../../services/pod');
const { authenticateToken } = require('../../middleware/auth');

// Generate image from text using Stability AI
router.post('/generate-image', authenticateToken, async (req, res) => {
  try {
    const { prompt, style } = req.body;
    const imageUrl = await podService.generateImage(prompt, style);
    res.json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create POD products
router.post('/create-products', authenticateToken, async (req, res) => {
  try {
    const { imageUrl, products, title, platform, pricing } = req.body;
    const result = await podService.createProducts({
      userId: req.user.id,
      imageUrl,
      products,
      title,
      platform,
      pricing
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create WordPress site
router.post('/create-wordpress', authenticateToken, async (req, res) => {
  try {
    const { name, type, theme, domain, description } = req.body;
    const result = await podService.createWordPressSite({
      userId: req.user.id,
      name,
      type,
      theme,
      domain,
      description
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's POD products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await podService.getUserProducts(req.user.id);
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's WordPress sites
router.get('/wordpress-sites', authenticateToken, async (req, res) => {
  try {
    const sites = await podService.getUserWordPressSites(req.user.id);
    res.json({ success: true, sites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
