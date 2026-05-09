'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';

export function useSocket(event: string, handler: (...args: any[]) => void) {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const socket = getSocket();

    const eventListener = (...args: any[]) => {
      savedHandler.current(...args);
    };

    socket.on(event, eventListener);
    return () => {
      socket.off(event, eventListener);
    };
  }, [event]);
}

export function useSocketEmit() {
  const socket = getSocket();

  return (event: string, data?: any) => {
    socket.emit(event, data);
  };
}
