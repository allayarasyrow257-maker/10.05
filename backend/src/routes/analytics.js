const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Dashboard KPIs
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyRevenue, weeklyRevenue, monthlyRevenue, totalOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfDay }, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfWeek }, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: { not: 'cancelled' } } }),
    ]);

    res.json({
      dailyRevenue: dailyRevenue._sum.total || 0,
      weeklyRevenue: weeklyRevenue._sum.total || 0,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      totalOrders,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Revenue by hour (daily chart)
router.get('/revenue/daily', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay, lt: endOfDay },
        status: { not: 'cancelled' },
      },
      select: { createdAt: true, total: true },
    });

    // Group by hour
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      revenue: 0,
      orders: 0,
    }));

    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      hourlyData[hour].revenue += parseFloat(order.total);
      hourlyData[hour].orders += 1;
    });

    res.json(hourlyData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch daily revenue' });
  }
});

// Revenue by day (weekly chart)
router.get('/revenue/weekly', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfWeek },
        status: { not: 'cancelled' },
      },
      select: { createdAt: true, total: true },
    });

    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      dailyData.push({ date: dayStr, day: date.toLocaleDateString('en', { weekday: 'short' }), revenue: 0, orders: 0 });
    }

    orders.forEach((order) => {
      const dayStr = order.createdAt.toISOString().split('T')[0];
      const entry = dailyData.find((d) => d.date === dayStr);
      if (entry) {
        entry.revenue += parseFloat(order.total);
        entry.orders += 1;
      }
    });

    res.json(dailyData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly revenue' });
  }
});

// Revenue by date (monthly chart)
router.get('/revenue/monthly', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: { not: 'cancelled' },
      },
      select: { createdAt: true, total: true },
    });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthlyData = Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      revenue: 0,
      orders: 0,
    }));

    orders.forEach((order) => {
      const day = order.createdAt.getDate() - 1;
      monthlyData[day].revenue += parseFloat(order.total);
      monthlyData[day].orders += 1;
    });

    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly revenue' });
  }
});

// Best sellers
router.get('/best-sellers', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.query;

    const where = {
      order: { status: { not: 'cancelled' } },
    };
    
    // For combos, categoryId filter might not apply directly to the combo itself 
    // but for now we filter products by categoryId if provided.
    if (categoryId) {
      where.product = { categoryId: parseInt(categoryId) };
    }

    const items = await prisma.orderItem.groupBy({
      by: ['productId', 'comboId'],
      where,
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 50,
    });

    // Fetch product and combo details
    const productIds = items.filter(i => i.productId).map((i) => i.productId);
    const comboIds = items.filter(i => i.comboId).map((i) => i.comboId);

    const [products, combos] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      }),
      prisma.combo.findMany({
        where: { id: { in: comboIds } }
      })
    ]);

    const productMap = {};
    products.forEach((p) => { productMap[p.id] = p; });
    const comboMap = {};
    combos.forEach((c) => { comboMap[c.id] = c; });

    const result = items.map((item) => {
      if (item.comboId) {
        const combo = comboMap[item.comboId];
        return {
          comboId: item.comboId,
          name: combo?.name || {},
          image: combo?.image,
          category: { en: 'Combo', tr: 'Kombo', ru: 'Комбо' },
          categoryId: 0,
          totalSold: item._sum.quantity,
          orderCount: item._count.id,
          revenue: combo ? parseFloat(combo.price) * item._sum.quantity : 0,
        };
      } else {
        const product = productMap[item.productId];
        return {
          productId: item.productId,
          name: product?.name || {},
          image: product?.image,
          category: product?.category?.name || {},
          categoryId: product?.categoryId,
          totalSold: item._sum.quantity,
          orderCount: item._count.id,
          revenue: product ? parseFloat(product.price) * item._sum.quantity : 0,
        };
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Best sellers error:', error);
    res.status(500).json({ error: 'Failed to fetch best sellers' });
  }
});

// Order history
router.get('/orders/history', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const where = { status: { not: 'cancelled' } };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: { 
        table: true, 
        items: { 
          include: { 
            product: true,
            combo: true
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.order.count({ where });

    res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

module.exports = router;
