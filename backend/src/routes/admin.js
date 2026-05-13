const express = require('express');
const jwt = require('jsonwebtoken');
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
  } catch { }
  return {};
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Get cafe settings (public - for logo/name on menu; tabletPin only returned with auth)
router.get('/settings', (req, res) => {
  const settings = readSettings();
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    const { tabletPin, waiterPassword, ...publicSettings } = settings;
    return res.json(publicSettings);
  }
  res.json(settings);
});

// Update cafe settings (admin)
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { name, logo, backgroundColorLight, backgroundColorDark, accentColorLight, accentColorDark, maintenance, tabletPin, waiterPassword } = req.body;
    const settings = readSettings();
    if (name !== undefined) settings.name = name;
    if (logo !== undefined) settings.logo = logo;
    if (backgroundColorLight !== undefined) settings.backgroundColorLight = backgroundColorLight;
    if (backgroundColorDark !== undefined) settings.backgroundColorDark = backgroundColorDark;
    if (accentColorLight !== undefined) settings.accentColorLight = accentColorLight;
    if (accentColorDark !== undefined) settings.accentColorDark = accentColorDark;
    if (maintenance !== undefined) settings.maintenance = maintenance;
    if (tabletPin !== undefined) settings.tabletPin = tabletPin || null;
    if (waiterPassword !== undefined) settings.waiterPassword = waiterPassword || null;
    writeSettings(settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Verify global tablet PIN (public — used by tablet page)
router.post('/verify-tablet-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'pin is required' });
  const settings = readSettings();
  if (!settings.tabletPin) return res.status(400).json({ error: 'No tablet PIN configured' });
  if (settings.tabletPin !== pin) return res.status(401).json({ error: 'Invalid PIN' });
  res.json({ ok: true });
});

// Verify waiter password (public — used by waiter page)
router.post('/verify-waiter-password', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password is required' });
  const settings = readSettings();
  if (!settings.waiterPassword) return res.status(400).json({ error: 'No waiter password configured' });
  if (settings.waiterPassword !== password) return res.status(401).json({ error: 'Invalid password' });
  // Generate a JWT so the waiter can use authenticated endpoints (orders, tables, etc.)
  const token = jwt.sign(
    { id: 0, email: 'waiter@system', name: 'Waiter', role: 'waiter' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ ok: true, token });
});

// Get admin stats overview
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [tables, categories, products, pendingOrders] = await Promise.all([
      prisma.table.count({ where: { status: { not: 'deleted' } } }),
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
