import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../utils/config';
import { useAuth } from '../context/AuthContext';

export const useSocket = (groupId) => {
  const socketRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('authenticate', user.id);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    if (socketRef.current && groupId) {
      socketRef.current.emit('join_group', groupId);
      return () => {
        socketRef.current.emit('leave_group', groupId);
      };
    }
  }, [groupId]);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return { socket: socketRef.current, on, off };
};
