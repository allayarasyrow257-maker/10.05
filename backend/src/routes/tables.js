const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

function generateTableCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper: strip tabletPin from table object(s) for public responses
function stripPin(table) {
  if (!table) return table;
  const { tabletPin, ...rest } = table;
  return { ...rest, hasTabletPin: !!tabletPin };
}



// Lookup table by code or number
router.get('/lookup/:param', async (req, res) => {
  try {
    const { param } = req.params;
    let table;

    // Lookup by tableCode only (random 8-char code, not guessable)
    table = await prisma.table.findUnique({
      where: { tableCode: param },
      include: {
        orders: {
          where: { billClosedAt: null },
          include: { items: { include: { product: true, combo: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(stripPin(table));
  } catch (error) {
    res.status(500).json({ error: 'Failed to lookup table' });
  }
});

// Get all tables (public for gift target selection)
router.get('/', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      where: { status: { not: 'deleted' } },
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: { billClosedAt: null },
          include: { items: { include: { product: true, combo: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    // If admin auth header present, include PIN; otherwise strip it
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      res.json(tables);
    } else {
      res.json(tables.map(stripPin));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get single table
router.get('/:id', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orders: {
          where: { billClosedAt: null },
          include: { items: { include: { product: true, combo: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Get full order history for a table (admin) — includes combo items + billClosedAt
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    const orders = await prisma.order.findMany({
      where: { tableId },
      include: {
        items: { include: { product: true, combo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table history' });
  }
});

// Close table bill (admin) - archive current session's orders and reset the table
router.post('/:id/close-bill', authenticateToken, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    const closedAt = new Date();

    // Compute totals for the receipt before mutating
    const sessionOrders = await prisma.order.findMany({
      where: { tableId, billClosedAt: null },
      include: { items: { include: { product: true, combo: true } } },
    });

    // Block closing if any order is not yet delivered
    const undelivered = sessionOrders.filter(o => o.status !== 'delivered');
    if (undelivered.length > 0) {
      return res.status(400).json({
        error: `Cannot close bill: ${undelivered.length} order(s) not yet delivered`,
      });
    }

    const sessionTotal = sessionOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );


    // 2) Stamp every current-session order with the closure timestamp.
    //    These orders disappear from the active view and are tied together
    //    in history as one bill.
    await prisma.order.updateMany({
      where: { tableId, billClosedAt: null },
      data: { billClosedAt: closedAt },
    });

    // 3) Reset the table — ready for the next group of customers
    const table = await prisma.table.update({
      where: { id: tableId },
      data: { status: 'available' },
      include: {
        orders: {
          where: { billClosedAt: null },
          include: { items: { include: { product: true, combo: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Notify via socket
    const io = req.app.get('io');
    io.to('admin').emit('table-updated', table);
    io.to(`table-${tableId}`).emit('bill-closed', { tableId });

    res.json({
      message: 'Bill closed',
      table,
      bill: {
        closedAt,
        ordersCount: sessionOrders.length,
        total: sessionTotal,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to close bill' });
  }
});

// Create table (admin)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { number, name, tabletPin } = req.body;
    if (tabletPin && !/^\d{4,6}$/.test(tabletPin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }
    const tableCode = generateTableCode();
    const table = await prisma.table.create({
      data: { number, name, tableCode, tabletPin: tabletPin || null },
    });
    res.status(201).json(table);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Table number already exists' });
    }
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table (admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { number, name, status, tabletPin } = req.body;
    if (tabletPin !== undefined && tabletPin !== null && tabletPin !== '' && !/^\d{4,6}$/.test(tabletPin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }
    const data = {};
    if (number !== undefined) data.number = number;
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (tabletPin !== undefined) data.tabletPin = tabletPin || null;
    const table = await prisma.table.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete table (admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    // Soft delete: keep the table and its revenue history, but free up its number and code
    await prisma.table.update({
      where: { id: tableId },
      data: {
        status: 'deleted',
        number: -tableId,
        tableCode: `DEL-${tableId}-${Date.now()}`
      }
    });
    res.json({ message: 'Table softly deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

module.exports = router;
