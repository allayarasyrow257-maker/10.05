const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories with products (public)
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { available: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all products (public)
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get combos (public)
router.get('/combos', async (req, res) => {
  try {
    const combos = await prisma.combo.findMany({
      where: { available: true },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    res.json(combos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch combos' });
  }
});

// ADMIN: Create category
router.post('/categories', authenticateToken, [
  body('name').isObject(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, image, icon, sortOrder } = req.body;
    const category = await prisma.category.create({
      data: { name, image, icon, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ADMIN: Update category
router.put('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { name, image, icon, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (image !== undefined) data.image = image;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ADMIN: Delete category
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ADMIN: Create product
router.post('/products', authenticateToken, [
  body('name').isObject(),
  body('price').isNumeric(),
  body('categoryId').isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, price, image, categoryId, sortOrder } = req.body;
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        image,
        categoryId,
        sortOrder: sortOrder || 0,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ADMIN: Update product
router.put('/products/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, image, categoryId, available, sortOrder } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description, price, image, categoryId, available, sortOrder },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ADMIN: Delete product
router.delete('/products/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ADMIN: Create combo
router.post('/combos', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, image, items } = req.body;
    const combo = await prisma.combo.create({
      data: {
        name,
        description,
        price,
        image,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity || 1,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    res.status(201).json(combo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create combo' });
  }
});

// ADMIN: Update combo
router.put('/combos/:id', authenticateToken, async (req, res) => {
  try {
    const comboId = parseInt(req.params.id);
    const { name, description, price, image, items, available } = req.body;

    // Build update data for combo fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (image !== undefined) updateData.image = image;
    if (available !== undefined) updateData.available = available;

    // If items provided, delete old items and create new ones
    if (items !== undefined) {
      await prisma.comboItem.deleteMany({ where: { comboId } });
      updateData.items = {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity || 1,
        })),
      };
    }

    const combo = await prisma.combo.update({
      where: { id: comboId },
      data: updateData,
      include: { items: { include: { product: true } } },
    });
    res.json(combo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update combo' });
  }
});

// ADMIN: Delete combo
router.delete('/combos/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.combo.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Combo deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete combo' });
  }
});

module.exports = router;
