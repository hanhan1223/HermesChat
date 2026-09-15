'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export interface AgentEvent {
  type: 'thinking' | 'message' | 'tool_start' | 'tool_result' | 'tool_error' | 'feedback' | 'cancelled' | 'error';
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: any;
  error?: string;
  step?: number;
}

/**
 * WebSocket Hook — 实时对话推送
 *
 * 用法:
 *   const { connected, send, onEvent } = useWebSocket();
 *   onEvent((event) => { ... });
 *   send('chat', { conversationId, modelId, content });
 */
export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventHandlersRef = useRef<((event: AgentEvent) => void)[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      setError(err.message);
      setConnected(false);
    });

    socket.on('agent_event', (event: AgentEvent) => {
      eventHandlersRef.current.forEach(handler => handler(event));
    });

    socket.on('pong', () => {
      // 心跳响应
    });

    socketRef.current = socket;

    // 心跳
    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('ping');
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const send = useCallback((event: string, payload: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
      return true;
    }
    return false;
  }, []);

  const onEvent = useCallback((handler: (event: AgentEvent) => void) => {
    eventHandlersRef.current.push(handler);
    return () => {
      eventHandlersRef.current = eventHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  return { connected, error, send, onEvent };
}
