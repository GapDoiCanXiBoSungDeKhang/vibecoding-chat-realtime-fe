import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface UserPresence {
  status: 'online' | 'away' | 'busy' | 'offline';
  customStatusMessage?: string | null;
  lastSeen?: string | null;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTypingStart: (conversationId: string) => void;
  emitTypingStop: (conversationId: string) => void;
  // Presence real-time — cập nhật ngay khi bất kỳ user nào đổi trạng thái
  presenceMap: Record<string, UserPresence>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  emitTypingStart: () => {},
  emitTypingStop: () => {},
  presenceMap: {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Lắng nghe presence real-time — BE broadcast toàn cục mỗi khi 1 user đổi
    // trạng thái (online/away/busy/offline) hoặc custom status message
    newSocket.on('user_status_changed', (payload: {
      userId: string;
      status: UserPresence['status'];
      customStatusMessage?: string | null;
      lastSeen?: string | null;
    }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: {
          status: payload.status,
          customStatusMessage: payload.customStatusMessage ?? null,
          lastSeen: payload.lastSeen ?? null,
        },
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Expose easy methods for components
  const joinConversation = (conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('join_conversation', { conversationId });
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_conversation', { conversationId });
    }
  };

  const emitTypingStart = (conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { conversationId });
    }
  };

  const emitTypingStop = (conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { conversationId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinConversation,
        leaveConversation,
        emitTypingStart,
        emitTypingStop,
        presenceMap,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};