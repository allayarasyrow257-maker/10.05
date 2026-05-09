const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Send a gift
router.post('/', [
  body('senderTableId').isInt(),
  body('receiverTableId').isInt(),
  body('productId').isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { senderTableId, receiverTableId, productId } = req.body;

    if (senderTableId === receiverTableId) {
      return res.status(400).json({ error: 'Cannot send gift to your own table' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const gift = await prisma.gift.create({
      data: { senderTableId, receiverTableId, productId },
      include: {
        product: true,
        senderTable: true,
        receiverTable: true,
      },
    });

    // Emit to receiver table
    const io = req.app.get('io');
    io.to(`table-${receiverTableId}`).emit('gift-received', gift);
    io.to('admin').emit('gift-sent', gift);

    res.status(201).json(gift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send gift' });
  }
});

// Respond to gift (accept/reject)
router.put('/:id/respond', [
  body('status').isIn(['accepted', 'rejected']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { status } = req.body;
    const gift = await prisma.gift.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: {
        product: true,
        senderTable: true,
        receiverTable: true,
      },
    });

    // If accepted, charge the SENDER - create an order on sender's table
    if (status === 'accepted') {
      const product = gift.product;
      const order = await prisma.order.create({
        data: {
          tableId: gift.senderTableId,
          total: product.price,
          notes: `Gift to Table ${gift.receiverTable.number}`,
          items: {
            create: [{
              productId: product.id,
              quantity: 1,
              price: product.price,
              isGift: true,
              notes: `Gift to Table ${gift.receiverTable.number}`,
            }],
          },
        },
        include: {
          items: { include: { product: true } },
          table: true,
        },
      });

      // Update sender table status
      await prisma.table.update({
        where: { id: gift.senderTableId },
        data: { status: 'occupied' },
      });

      // Notify admin about the new order
      const io = req.app.get('io');
      io.to('admin').emit('order-received', order);
    }

    const io = req.app.get('io');
    io.to(`table-${gift.senderTableId}`).emit('gift-response', gift);
    io.to(`table-${gift.receiverTableId}`).emit('gift-response', gift);
    io.to('admin').emit('gift-response', gift);

    res.json(gift);
  } catch (error) {
    console.error('Gift respond error:', error);
    res.status(500).json({ error: 'Failed to respond to gift' });
  }
});

// Get gifts for a table
router.get('/table/:tableId', async (req, res) => {
  try {
    const tableId = parseInt(req.params.tableId);
    const gifts = await prisma.gift.findMany({
      where: {
        OR: [
          { senderTableId: tableId },
          { receiverTableId: tableId },
        ],
      },
      include: {
        product: true,
        senderTable: true,
        receiverTable: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(gifts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gifts' });
  }
});

module.exports = router;
