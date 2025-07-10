import type { Transport, LogEntry } from '../../types';

export interface LocalStorageTransportConfig {
  key?: string;
  maxEntries?: number;
  compress?: boolean;
}

export class LocalStorageTransport implements Transport {
  name = 'localStorage';
  private config: Required<LocalStorageTransportConfig>;

  constructor(config: LocalStorageTransportConfig = {}) {
    this.config = {
      key: 'shadowtrace_logs',
      maxEntries: 1000,
      compress: false,
      ...config
    };

    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available');
    }
  }

  send(entries: LogEntry[]): void {
    try {
      const existingLogs = this.getLogs();
      const allLogs = [...existingLogs, ...entries];

      // Limiter le nombre d'entrées
      const limitedLogs = allLogs.slice(-this.config.maxEntries);

      this.saveLogs(limitedLogs);
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const data = localStorage.getItem(this.config.key);
      if (!data) {
        return [];
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse logs from localStorage:', error);
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem(this.config.key);
  }

  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  private saveLogs(logs: LogEntry[]): void {
    const data = JSON.stringify(logs);
    localStorage.setItem(this.config.key, data);
  }
}
