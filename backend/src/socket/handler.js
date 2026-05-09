function setupSocket(io, prisma) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join table room
    socket.on('join-table', (tableId) => {
      const room = `table-${tableId}`;
      if (!socket.rooms.has(room)) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
      }
    });

    // Join admin room
    socket.on('join-admin', () => {
      if (!socket.rooms.has('admin')) {
        socket.join('admin');
        console.log(`Socket ${socket.id} joined admin room`);
      }
    });

    // Call waiter
    socket.on('call-waiter', (data) => {
      io.to('admin').emit('waiter-called', {
        tableId: data.tableId,
        tableNumber: data.tableNumber,
        sessionId: data.sessionId || null,
        timestamp: new Date().toISOString(),
      });
    });

    // New order notification
    socket.on('new-order', (data) => {
      io.to('admin').emit('order-received', data);
    });

    // Order status update
    socket.on('update-order-status', (data) => {
      io.to(`table-${data.tableId}`).emit('order-status-updated', data);
      io.to('admin').emit('order-status-updated', data);
    });

    // Gift system
    socket.on('send-gift', (data) => {
      io.to(`table-${data.receiverTableId}`).emit('gift-received', data);
      io.to('admin').emit('gift-sent', data);
    });

    socket.on('gift-response', (data) => {
      io.to(`table-${data.senderTableId}`).emit('gift-response', data);
      io.to('admin').emit('gift-response', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

module.exports = setupSocket;
