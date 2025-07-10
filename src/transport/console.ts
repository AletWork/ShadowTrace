import type { Transport, LogEntry, LogLevel } from '../../types';

export class ConsoleTransport implements Transport {
  name = 'console';
  private debug: boolean;

  constructor(debug = true) {
    this.debug = debug;
  }

  send(entries: LogEntry[]): void {
    if (!this.debug || typeof console === 'undefined') {
      return;
    }

    entries.forEach(entry => {
      const logMethod = this.getConsoleMethod(entry.level);
      const timestamp = new Date(entry.timestamp).toISOString();
      
      if (entry.data) {
        logMethod(
          `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`,
          entry.data
        );
      } else {
        logMethod(`[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
      }

      // Log du contexte pour le debug
      if (this.debug && entry.level === 'debug' && entry.context) {
        console.groupCollapsed('Context');
        console.table(entry.context);
        console.groupEnd();
      }
    });
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug || console.log;
      case 'info':
        return console.info || console.log;
      case 'warn':
        return console.warn || console.log;
      case 'error':
        return console.error || console.log;
      default:
        return console.log;
    }
  }
}