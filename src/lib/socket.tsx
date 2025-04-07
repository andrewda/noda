import { createContext, useEffect, useState, useContext } from 'react';
import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'https://localhost:6111';
  }

  // TODO: allow this to be a query param
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.protocol = 'https:';
  if (url.port === '3000') {
    url.port = '6111';
  }

  return url.toString();
}

export const SocketContext = createContext<Socket | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket] = useState<Socket | undefined>(io(getSocketUrl()));

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = (socketContext = SocketContext) => useContext(socketContext);

// AirTrafficSim socket.io server
// TODO: maybe proxy through a different server???
// export const socket = io(getSocketUrl());

export const useSocketEvent = (eventName: string, callback: (data: any) => void, socketContext = SocketContext) => {
  const socket = useContext(socketContext);

  useEffect(() => {
    socket?.on(eventName, callback);
    return () => {
      socket?.off(eventName, callback);
    };
  }, [socket, eventName, callback]);
}
