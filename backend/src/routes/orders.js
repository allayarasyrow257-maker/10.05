const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();
const prisma = new PrismaClient();

// Create order (public - from customer)
router.post(
  "/",
  [body("tableId").isInt(), body("items").isArray({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { tableId, items, notes } = req.body;

      // Validate table exists
      const table = await prisma.table.findUnique({ where: { id: tableId } });
      if (!table) return res.status(404).json({ error: "Table not found" });

      // Fetch products and combos
      const productIds = items.filter(i => i.productId).map(i => i.productId);
      const comboIds = items.filter(i => i.comboId).map(i => i.comboId);

      const [products, combos] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds } } }),
        prisma.combo.findMany({ where: { id: { in: comboIds } } })
      ]);

      const productMap = {};
      products.forEach((p) => { productMap[p.id] = p; });
      const comboMap = {};
      combos.forEach((c) => { comboMap[c.id] = c; });

      let total = 0;
      const orderItems = items.map((item) => {
        if (item.comboId) {
          const combo = comboMap[item.comboId];
          if (!combo) throw new Error(`Combo #${item.comboId} not found`);
          const itemTotal = parseFloat(combo.price) * item.quantity;
          total += itemTotal;
          return {
            comboId: item.comboId,
            quantity: item.quantity,
            price: combo.price,
            notes: item.notes || null,
            isGift: item.isGift || false,
          };
        } else {
          const product = productMap[item.productId];
          if (!product) throw new Error(`Product #${item.productId} not found`);
          const itemTotal = parseFloat(product.price) * item.quantity;
          total += itemTotal;

          // Build notes for gift items with receiver table info
          let itemNotes = item.notes || null;
          if (item.isGift && item.receiverTableId) {
            itemNotes = `Gift to Table ${item.receiverTableNumber || item.receiverTableId}`;
          }


          return {
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            notes: itemNotes,
            isGift: item.isGift || false,
          };
        }
      });

      const { sessionId, source } = req.body;

      const order = await prisma.order.create({
        data: {
          tableId,
          total,
          notes,
          source: source === 'tablet' ? 'tablet' : 'qr',
          sessionId: sessionId || null,
          items: { create: orderItems },
        },
        include: {
          items: { 
            include: { 
              product: true,
              combo: true
            } 
          },
          table: true,
        },
      });

      // Update table status
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "occupied" },
      });

      // Emit realtime event
      const io = req.app.get("io");
      io.to("admin").emit("order-received", order);
      io.to(`table-${tableId}`).emit("table-order-updated", order);

      res.status(201).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create order" });
    }
  },
);

// Get orders for a table (public) — in-flight orders only (customer view)
router.get("/table/:tableId", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        tableId: parseInt(req.params.tableId),
        billClosedAt: null,
        status: { notIn: ["cancelled"] },
      },
      include: {
        items: {
          include: {
            product: true,
            combo: true
          }
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get all orders (admin) — supports date range, status, and table filtering
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, tableId, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tableId) where.tableId = parseInt(tableId);

    if (from || to) {
      where.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) where.createdAt.gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) where.createdAt.lte = toDate;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            combo: true
          }
        },
        table: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.order.count({ where });

    // Aggregate stats for the filtered window
    const stats = await prisma.order.aggregate({
      where,
      _sum: { total: true },
      _count: { _all: true },
    });
    const deliveredAggregate = await prisma.order.aggregate({
      where: { ...where, status: "delivered" },
      _sum: { total: true },
      _count: { _all: true },
    });

    res.json({
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      stats: {
        totalOrders: stats._count._all || 0,
        totalRevenue: stats._sum.total ? Number(stats._sum.total) : 0,
        deliveredOrders: deliveredAggregate._count._all || 0,
        deliveredRevenue: deliveredAggregate._sum.total ? Number(deliveredAggregate._sum.total) : 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status (admin)
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: {
        items: { 
          include: { 
            product: true,
            combo: true
          } 
        },
        table: true,
      },
    });

    // Emit realtime event
    const io = req.app.get("io");
    io.to(`table-${order.tableId}`).emit("order-status-updated", order);
    io.to("admin").emit("order-status-updated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Toggle delivered status for a single order item (admin)
router.put("/:orderId/items/:itemId/delivered", authenticateToken, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const item = await prisma.orderItem.findFirst({
      where: { id: parseInt(itemId), orderId: parseInt(orderId) },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const updated = await prisma.orderItem.update({
      where: { id: parseInt(itemId) },
      data: { delivered: !item.delivered },
      include: { product: true, combo: true },
    });

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      select: { tableId: true },
    });

    const io = req.app.get("io");
    io.to("admin").emit("order-status-updated", { orderId: parseInt(orderId), tableId: order?.tableId });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to toggle item delivered" });
  }
});

// Mark ALL items of an order as delivered (admin)
router.put("/:orderId/items/deliver-all", authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);

    await prisma.orderItem.updateMany({
      where: { orderId },
      data: { delivered: true },
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { tableId: true },
    });

    const io = req.app.get("io");
    io.to("admin").emit("order-status-updated", { orderId, tableId: order?.tableId });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark all items delivered" });
  }
});


// Close bill - archive current session's orders for a table (admin).
// Kept for backward-compat; same behavior as POST /api/tables/:id/close-bill.
router.post(
  "/table/:tableId/close-bill",
  authenticateToken,
  async (req, res) => {
    try {
      const tableId = parseInt(req.params.tableId);
      const closedAt = new Date();

      await prisma.order.updateMany({
        where: {
          tableId,
          billClosedAt: null,
          status: { in: ["pending", "preparing", "ready"] },
        },
        data: { status: "delivered" },
      });

      await prisma.order.updateMany({
        where: { tableId, billClosedAt: null },
        data: { billClosedAt: closedAt },
      });

      await prisma.table.update({
        where: { id: tableId },
        data: { status: "available" },
      });

      const io = req.app.get("io");
      io.to(`table-${tableId}`).emit("bill-closed");
      io.to("admin").emit("bill-closed", { tableId });
      io.to("admin").emit("table-updated", { id: tableId, status: "available" });

      res.json({ success: true, message: "Bill closed successfully", closedAt });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to close bill" });
    }
  },
);

module.exports = router;
