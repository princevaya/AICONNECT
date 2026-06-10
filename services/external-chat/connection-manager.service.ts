// services/external-chat/connection-manager.service.ts
// NEW FILE - Centralized connection management

type ConnectionState = {
  isConnected: boolean;
  lastSync: number;
  syncInProgress: boolean;
};

class ConnectionManager {
  private static instance: ConnectionManager;
  private state: ConnectionState = {
    isConnected: false,
    lastSync: 0,
    syncInProgress: false,
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private eventSource: EventSource | null = null;
  private roomSubscriptions: Map<string, Set<(data: unknown) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastRoomCode: string | null = null;

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async initialize(userId: string) {
    if (this.syncInterval) return;
    
    // Single sync interval - 30 seconds, not 10
    this.syncInterval = setInterval(() => {
      this.performBackgroundSync();
    }, 30000);
  }

  private async performBackgroundSync() {
    if (this.state.syncInProgress) return;
    const now = Date.now();
    if (now - this.state.lastSync < 25000) return; // Minimum 25s between syncs
    
    this.state.syncInProgress = true;
    try {
      // Only sync if user is active
      if (document.visibilityState === 'visible') {
        await this.syncData();
      }
      this.state.lastSync = now;
    } finally {
      this.state.syncInProgress = false;
    }
  }

  private async syncData() {
    // Single consolidated sync call
    const response = await fetch('/api/external-chat/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastSync: this.state.lastSync }),
    });
    const data = await response.json();
    return data;
  }

  setupRealtime(roomCode: string, onMessage: (data: unknown) => void) {
    if (this.lastRoomCode === roomCode && this.eventSource?.readyState === EventSource.OPEN) {
      // Already connected to this room
      return () => {};
    }

    this.lastRoomCode = roomCode;
    this.closeRealtime();
    
    let heartbeatMissed = 0;
    const es = new EventSource(`/api/external-chat/realtime/${encodeURIComponent(roomCode)}`);
    this.eventSource = es;

    const heartbeatInterval = setInterval(() => {
      if (es.readyState === EventSource.OPEN) {
        heartbeatMissed = 0;
      } else if (es.readyState === EventSource.CLOSED) {
        heartbeatMissed++;
        if (heartbeatMissed >= 3) {
          clearInterval(heartbeatInterval);
          this.attemptReconnect();
        }
      }
    }, 20000); // 20-second heartbeat, not 15

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      // Don't trigger on every error - let heartbeat handle it
    };

    return () => {
      clearInterval(heartbeatInterval);
      if (this.eventSource === es) {
        this.closeRealtime();
      }
    };
  }

  private attemptReconnect() {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.reconnectAttempts = 0;
      return;
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      if (this.lastRoomCode) {
        this.setupRealtime(this.lastRoomCode, () => {});
      }
    }, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
  }

  private closeRealtime() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.closeRealtime();
  }
}

export const connectionManager = ConnectionManager.getInstance();