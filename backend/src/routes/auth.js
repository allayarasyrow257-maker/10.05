const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Register (initial setup only)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').isLength({ min: 2 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password, name } = req.body;
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/change-password', [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 }),
], async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(req.body.currentPassword, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(403).json({ error: 'Invalid token' });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Change email (login)
router.put('/change-email', [
  body('newEmail').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(req.body.password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    const existing = await prisma.admin.findUnique({ where: { email: req.body.newEmail } });
    if (existing && existing.id !== admin.id) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { email: req.body.newEmail },
    });

    const newToken = jwt.sign(
      { id: updated.id, email: updated.email, role: updated.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Email updated successfully',
      token: newToken,
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(403).json({ error: 'Invalid token' });
    res.status(500).json({ error: 'Failed to change email' });
  }
});

// Master gate verification (separate credential layer for protected admin area)
router.post('/master-verify', [
  body('login').isString().isLength({ min: 1 }),
  body('password').isString().isLength({ min: 1 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const expectedLogin = process.env.MASTER_LOGIN || 'Yedi';
  const expectedPassword = process.env.MASTER_PASSWORD || 'Yedi7777777';

  const { login, password } = req.body;
  if (login !== expectedLogin || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid master credentials' });
  }
  res.json({ ok: true });
});

// Verify token
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json({ user: admin });
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
