import { generateId, sanitizeData } from './utils';
import type {
  LogLevel,
  LogEntry,
  LogContext,
  Transport,
  LogFilter
} from '../types';

interface LoggerConfig {
  level: LogLevel;
  context: LogContext;
  bufferSize: number;
  flushInterval: number;
  filters: LogFilter[];
  sampling: number;
  onError: (error: Error) => void;
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class Logger {
  private config: LoggerConfig;
  private transports: Transport[] = [];
  private buffer: LogEntry[] = [];
  private flushTimer: any;
  private context: LogContext;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.context = config.context;
    this.startFlushTimer();
  }

  log(level: LogLevel, message: string, data?: any): void {
    try {
      // Vérification du niveau de log
      if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
        return;
      }

      // Sampling
      if (Math.random() > this.config.sampling) {
        return;
      }

      // Création de l'entrée de log
      const entry: LogEntry = {
        id: generateId(),
        timestamp: Date.now(),
        level,
        message,
        data: data ? sanitizeData(data) : undefined,
        context: { ...this.context }
      };

      // Application des filtres
      if (!this.shouldLog(entry)) {
        return;
      }

      // Ajout au buffer
      this.addToBuffer(entry);

      // Flush immédiat pour les erreurs
      if (level === 'error') {
        this.flush();
      }
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  updateContext(context: LogContext): void {
    this.context = context;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    const promises = this.transports.map(async (transport) => {
      try {
        await transport.send(entries);
      } catch (error) {
        this.config.onError(error as Error);
      }
    });

    await Promise.all(promises);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
    this.transports = [];
    this.buffer = [];
  }

  private shouldLog(entry: LogEntry): boolean {
    return this.config.filters.every(filter => {
      // Filtrage par niveau
      if (filter.level && !filter.level.includes(entry.level)) {
        return false;
      }

      // Filtrage par message
      if (filter.message && !filter.message.test(entry.message)) {
        return false;
      }

      // Filtrage par contexte
      if (filter.context && entry.context && !filter.context(entry.context)) {
        return false;
      }

      return true;
    });
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);

    // Limitation de la taille du buffer
    if (this.buffer.length > this.config.bufferSize) {
      this.buffer = this.buffer.slice(-this.config.bufferSize);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
}