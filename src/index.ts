import { Logger } from './logger';
import { ConsoleTransport } from './transport/console';
import { HttpTransport } from './transport/http';
import { LocalStorageTransport } from './transport/localStorage';
import { IndexedDBTransport } from './transport/indexedDB';
import { AutoTracker } from './auto-tracker';
import { generateId, getBrowserInfo, getDeviceInfo } from './utils';
import type {
  ShadowTraceConfig,
  ShadowTraceInstance,
  LogLevel,
  LogContext,
  Transport,
  AutoTrackConfig,
  TransportType
} from '../types/index';

export class ShadowTrace implements ShadowTraceInstance {
  private logger: Logger;
  private autoTracker?: AutoTracker;
  private config: Required<ShadowTraceConfig>;
  private context: LogContext;
  private isInitialized = false;

  constructor(config: ShadowTraceConfig = {}) {
    // Configuration par défaut
    this.config = {
      apiKey: config.apiKey || '',
      environment: config.environment || 'development',
      debug: config.debug ?? true,
      autoTrack: config.autoTrack ?? true,
      autoTrackConfig: config.autoTrackConfig || {
        clicks: true,
        inputs: true,
        scrolls: false,
        navigation: true,
        errors: true,
        performance: false,
        selectors: {
          ignore: ['[data-shadow-ignore]', '.shadow-ignore'],
          track: []
        } as { ignore?: string[]; track?: string[] }
      },
      transports: config.transports || ['console'],
      httpConfig: config.httpConfig || {
        endpoint: '/api/logs',
        headers: {},
        timeout: 5000,
        retries: 3,
        batchSize: 10
      },
      level: config.level || 'debug',
      sampling: config.sampling ?? 1,
      bufferSize: config.bufferSize || 100,
      flushInterval: config.flushInterval || 10000,
      context: config.context || {},
      filters: config.filters || [],
      onError: config.onError || (() => {})
    };

    // Contexte par défaut
    this.context = {
      sessionId: generateId(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : { width: 0, height: 0 },
      device: (() => {
        const deviceInfo = getDeviceInfo();
        return {
          ...deviceInfo,
          browser: deviceInfo.browser === null ? undefined : deviceInfo.browser
        };
      })(),
      ...this.config.context
    };

    // Initialisation du logger
    this.logger = new Logger({
      level: this.config.level,
      context: this.context,
      bufferSize: this.config.bufferSize,
      flushInterval: this.config.flushInterval,
      filters: this.config.filters,
      sampling: this.config.sampling,
      onError: this.config.onError
    });

    // Ajout des transports
    this.setupTransports();
  }

  init(): void {
    if (this.isInitialized) {
      return;
    }

    // Initialisation de l'auto-tracking
    if (this.config.autoTrack && typeof window !== 'undefined') {
      this.autoTracker = new AutoTracker(this.config.autoTrackConfig, (event) => {
        this.track(event.type, event);
      });
      this.autoTracker.start();
    }

    // Capture des erreurs globales
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandling();
    }

    this.isInitialized = true;
    this.info('ShadowTrace initialized', { 
      config: { 
        environment: this.config.environment,
        autoTrack: this.config.autoTrack,
        transports: this.config.transports 
      } 
    });
  }

  debug(message: string, data?: any): void {
    this.logger.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.logger.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.logger.log('error', message, data);
  }

  track(event: string, data?: any): void {
    this.logger.log('info', `Event: ${event}`, { 
      event, 
      ...data,
      _type: 'track'
    });
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
    this.logger.updateContext(this.context);
  }

  setUserId(userId: string): void {
    this.setContext({ userId });
  }

  addTransport(transport: Transport): void {
    this.logger.addTransport(transport);
  }

  async flush(): Promise<void> {
    await this.logger.flush();
  }

  destroy(): void {
    if (this.autoTracker) {
      this.autoTracker.stop();
    }
    this.logger.destroy();
    this.isInitialized = false;
  }

  private setupTransports(): void {
    (this.config.transports as TransportType[]).forEach((transportType: TransportType) => {
      try {
        switch (transportType) {
          case 'console':
            this.logger.addTransport(new ConsoleTransport(this.config.debug));
            break;
          case 'http':
            if (this.config.httpConfig) {
              this.logger.addTransport(new HttpTransport(this.config.httpConfig));
            }
            break;
          case 'localStorage':
            if (typeof localStorage !== 'undefined') {
              this.logger.addTransport(new LocalStorageTransport());
            }
            break;
        }
      } catch (error) {
        console.warn(`Failed to setup transport: ${transportType}`, error);
      }
    });
  }

  private setupGlobalErrorHandling(): void {
    // Erreurs JavaScript
    window.addEventListener('error', (event) => {
      this.error('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
        _type: 'javascript_error'
      });
    });

    // Promesses rejetées
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
        _type: 'promise_rejection'
      });
    });

    // Erreurs de ressources
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.error('Resource Error', {
          element: (event.target as any)?.tagName,
          source: (event.target as any)?.src || (event.target as any)?.href,
          _type: 'resource_error'
        });
      }
    }, true);
  }
}

// Instance globale par défaut
let defaultInstance: ShadowTrace | null = null;

export const createLogger = (config?: ShadowTraceConfig): ShadowTrace => {
  return new ShadowTrace(config);
};

export const getDefaultLogger = (): ShadowTrace => {
  if (!defaultInstance) {
    defaultInstance = new ShadowTrace();
  }
  return defaultInstance;
};

// API simplifiée pour usage direct
export const init = (config?: ShadowTraceConfig): void => {
  if (defaultInstance) {
    defaultInstance.destroy();
  }
  defaultInstance = new ShadowTrace(config);
  defaultInstance.init();
};

export const debug = (message: string, data?: any): void => {
  getDefaultLogger().debug(message, data);
};

export const info = (message: string, data?: any): void => {
  getDefaultLogger().info(message, data);
};

export const warn = (message: string, data?: any): void => {
  getDefaultLogger().warn(message, data);
};

export const error = (message: string, data?: any): void => {
  getDefaultLogger().error(message, data);
};

export const track = (event: string, data?: any): void => {
  getDefaultLogger().track(event, data);
};

// Exports
export { Logger } from './logger';
export { ConsoleTransport } from './transport/console';
export { HttpTransport } from './transport/http';
export { LocalStorageTransport } from './transport/localStorage';
export { IndexedDBTransport } from './transport/indexedDB';