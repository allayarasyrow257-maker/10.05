const express = require('express');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const SETTINGS_FILE = path.join(__dirname, '..', 'settings.json');

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Get cafe settings (public - for logo/name on menu)
router.get('/settings', (req, res) => {
  res.json(readSettings());
});

// Update cafe settings (admin)
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { name, logo, backgroundColorLight, backgroundColorDark, accentColorLight, accentColorDark, maintenance } = req.body;
    const settings = readSettings();
    if (name !== undefined) settings.name = name;
    if (logo !== undefined) settings.logo = logo;
    if (backgroundColorLight !== undefined) settings.backgroundColorLight = backgroundColorLight;
    if (backgroundColorDark !== undefined) settings.backgroundColorDark = backgroundColorDark;
    if (accentColorLight !== undefined) settings.accentColorLight = accentColorLight;
    if (accentColorDark !== undefined) settings.accentColorDark = accentColorDark;
    if (maintenance !== undefined) settings.maintenance = maintenance;
    writeSettings(settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get admin stats overview
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [tables, categories, products, pendingOrders] = await Promise.all([
      prisma.table.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.order.count({ where: { status: 'pending' } }),
    ]);

    res.json({ tables, categories, products, pendingOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
