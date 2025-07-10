export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TransportType = 'console' | 'http' | 'localStorage' | 'custom';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  context?: LogContext;
  tags?: string[];
}

export interface LogContext {
  userId?: string;
  sessionId: string;
  page?: string;
  userAgent?: string;
  url?: string;
  referrer?: string;
  viewport?: {
    width: number;
    height: number;
  };
  device?: {
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    os?: string;
    browser?: string;
  };
}

export interface AutoTrackEvent {
  type: 'click' | 'input' | 'scroll' | 'navigation' | 'error' | 'custom' | 'performance' | 'warning';
  element?: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    attributes?: Record<string, string>;
  };
  data?: any;
}

export interface ShadowTraceConfig {
  apiKey?: string;
  environment?: string;
  debug?: boolean;
  autoTrack?: boolean;
  autoTrackConfig?: AutoTrackConfig;
  transports?: TransportType[];
  httpConfig?: HttpTransportConfig;
  level?: LogLevel;
  sampling?: number;
  bufferSize?: number;
  flushInterval?: number;
  context?: Partial<LogContext>;
  filters?: LogFilter[];
  onError?: (error: Error) => void;
}

export interface AutoTrackConfig {
  clicks?: boolean;
  inputs?: boolean;
  scrolls?: boolean;
  navigation?: boolean;
  errors?: boolean;
  performance?: boolean;
  webVitals?: boolean;
  slowPages?: boolean;
  memoryUsage?: boolean;
  consoleErrors?: boolean;
  unhandledPromises?: boolean;
  resourceErrors?: boolean;
  selectors?: {
    ignore?: string[];
    track?: string[];
  };
}

export interface HttpTransportConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  batchSize?: number;
}

export interface LogFilter {
  level?: LogLevel[];
  message?: RegExp;
  context?: (context: LogContext) => boolean;
}

export interface Transport {
  name: string;
  send(entries: LogEntry[]): Promise<void> | void;
  flush?(): Promise<void> | void;
}

export interface ShadowTraceInstance {
  init(): void;
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  track(event: string, data?: any): void;
  setContext(context: Partial<LogContext>): void;
  setUserId(userId: string): void;
  addTransport(transport: Transport): void;
  flush(): Promise<void>;
  destroy(): void;
}

// React types
export interface ShadowTraceProviderProps {
  config: ShadowTraceConfig;
  children: any; // React.ReactNode when React is available
}

export interface UseShadowTraceHook {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  track: (event: string, data?: any) => void;
  setContext: (context: Partial<LogContext>) => void;
  setUserId: (userId: string) => void;
}