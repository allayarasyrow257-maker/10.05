import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  }
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const port = process.env.NEXT_PUBLIC_SOCKET_PORT || '3001';
  return `${protocol}://${window.location.hostname}:${port}`;
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
