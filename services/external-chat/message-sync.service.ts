// services/external-chat/message-sync.service.ts
type MessageSyncState = {
  lastSyncTimestamp: number;
  syncInProgress: boolean;
  pendingRefresh: boolean;
  refreshTimeout: NodeJS.Timeout | null;
  pendingCallbacks: Array<() => Promise<void>>;
};

class MessageSyncService {
  private static instance: MessageSyncService;
  private state: MessageSyncState = {
    lastSyncTimestamp: 0,
    syncInProgress: false,
    pendingRefresh: false,
    refreshTimeout: null,
    pendingCallbacks: [],
  };

  static getInstance(): MessageSyncService {
    if (!MessageSyncService.instance) {
      MessageSyncService.instance = new MessageSyncService();
    }
    return MessageSyncService.instance;
  }

  scheduleRefresh(callback: () => Promise<void>, options?: { immediate?: boolean; priority?: 'high' | 'low' }) {
    // Clear any pending timeout
    if (this.state.refreshTimeout) {
      clearTimeout(this.state.refreshTimeout);
      this.state.refreshTimeout = null;
    }

    // High priority - execute immediately
    if (options?.priority === 'high') {
      if (!this.state.syncInProgress) {
        this.executeCallback(callback);
      } else {
        this.state.pendingCallbacks.push(callback);
      }
      return;
    }

    // Low priority - debounce
    const delay = options?.immediate ? 0 : 2000;
    this.state.refreshTimeout = setTimeout(() => {
      if (!this.state.syncInProgress) {
        this.executeCallback(callback);
      } else {
        this.state.pendingCallbacks.push(callback);
      }
      this.state.refreshTimeout = null;
    }, delay);
  }

  private async executeCallback(callback: () => Promise<void>) {
    this.state.syncInProgress = true;
    try {
      await callback();
      this.state.lastSyncTimestamp = Date.now();
    } finally {
      this.state.syncInProgress = false;
      // Process pending callbacks
      if (this.state.pendingCallbacks.length > 0) {
        const next = this.state.pendingCallbacks.shift();
        if (next) this.executeCallback(next);
      }
    }
  }

  shouldSync(minIntervalMs: number = 5000): boolean {
    return Date.now() - this.state.lastSyncTimestamp >= minIntervalMs;
  }

  reset() {
    if (this.state.refreshTimeout) {
      clearTimeout(this.state.refreshTimeout);
      this.state.refreshTimeout = null;
    }
    this.state = {
      lastSyncTimestamp: 0,
      syncInProgress: false,
      pendingRefresh: false,
      refreshTimeout: null,
      pendingCallbacks: [],
    };
  }
}

export const messageSyncService = MessageSyncService.getInstance();