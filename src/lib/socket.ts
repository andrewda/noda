import { useEffect } from 'react';
import { io } from 'socket.io-client';

// AirTrafficSim socket.io server
// TODO: maybe proxy through a different server???
export const socket = io('http://localhost:6111')

export const useSocketEvent = (eventName: string, callback: (data: any) => void) => {
  useEffect(() => {
    console.log('useSocketEvent', eventName);

    socket.on(eventName, callback);
    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName]);
}
