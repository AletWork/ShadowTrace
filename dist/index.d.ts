import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type TransportType = 'console' | 'http' | 'localStorage' | 'custom';

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  context?: LogContext;
  tags?: string[];
}

interface LogContext {
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

interface ShadowTraceConfig {
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

interface AutoTrackConfig {
  clicks?: boolean;
  inputs?: boolean;
  scrolls?: boolean;
  navigation?: boolean;
  errors?: boolean;
  performance?: boolean;
  selectors?: {
    ignore?: string[];
    track?: string[];
  };
}

interface HttpTransportConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  batchSize?: number;
}

interface LogFilter {
  level?: LogLevel[];
  message?: RegExp;
  context?: (context: LogContext) => boolean;
}

interface Transport {
  name: string;
  send(entries: LogEntry[]): Promise<void> | void;
  flush?(): Promise<void> | void;
}

interface ShadowTraceInstance {
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
interface ShadowTraceProviderProps {
  config: ShadowTraceConfig;
  children: any; // React.ReactNode when React is available
}

interface UseShadowTraceHook {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  track: (event: string, data?: any) => void;
  setContext: (context: Partial<LogContext>) => void;
  setUserId: (userId: string) => void;
}

interface LoggerConfig {
    level: LogLevel;
    context: LogContext;
    bufferSize: number;
    flushInterval: number;
    filters: LogFilter[];
    sampling: number;
    onError: (error: Error) => void;
}
declare class Logger {
    private config;
    private transports;
    private buffer;
    private flushTimer;
    private context;
    constructor(config: LoggerConfig);
    log(level: LogLevel, message: string, data?: any): void;
    addTransport(transport: Transport): void;
    updateContext(context: LogContext): void;
    flush(): Promise<void>;
    destroy(): void;
    private shouldLog;
    private addToBuffer;
    private startFlushTimer;
}

declare class ConsoleTransport implements Transport {
    name: string;
    private debug;
    constructor(debug?: boolean);
    send(entries: LogEntry[]): void;
    private getConsoleMethod;
}

declare class HttpTransport implements Transport {
    name: string;
    private config;
    private queue;
    private isProcessing;
    constructor(config: HttpTransportConfig);
    send(entries: LogEntry[]): Promise<void>;
    flush(): Promise<void>;
    private processQueue;
    private sendBatch;
    private makeRequest;
    private fetchRequest;
    private xhrRequest;
    private delay;
}

interface LocalStorageTransportConfig {
    key?: string;
    maxEntries?: number;
    compress?: boolean;
}
declare class LocalStorageTransport implements Transport {
    name: string;
    private config;
    constructor(config?: LocalStorageTransportConfig);
    send(entries: LogEntry[]): void;
    getLogs(): LogEntry[];
    clearLogs(): void;
    exportLogs(): string;
    private saveLogs;
}

interface IndexedDBTransportConfig {
    dbName?: string;
    storeName?: string;
    version?: number;
    maxEntries?: number;
}
declare class IndexedDBTransport implements Transport {
    name: string;
    private config;
    private db;
    private isInitialized;
    constructor(config?: IndexedDBTransportConfig);
    send(entries: LogEntry[]): Promise<void>;
    getLogs(limit?: number): Promise<LogEntry[]>;
    clearLogs(): Promise<void>;
    private init;
    private ensureInitialized;
    private cleanup;
}

declare function ShadowTraceProvider({ config, children, }: ShadowTraceProviderProps): react_jsx_runtime.JSX.Element;
declare function useShadowTrace(): UseShadowTraceHook;
declare function useComponentLifecycle(componentName: string): void;
declare function useErrorTracking(componentName: string): void;
declare function withShadowTrace<P extends object>(WrappedComponent: React.ComponentType<P>, componentName?: string): {
    (props: P): react_jsx_runtime.JSX.Element;
    displayName: string;
};
interface TrackClickProps {
    eventName: string;
    eventData?: any;
    children: React.ReactElement<any>;
}
declare function TrackClick({ eventName, eventData, children, }: TrackClickProps): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
interface TrackFormProps {
    formName: string;
    children: React.ReactElement<any, any>;
}
declare function TrackForm({ formName, children }: TrackFormProps): React.FunctionComponentElement<any>;

declare class ShadowTrace implements ShadowTraceInstance {
    private logger;
    private autoTracker?;
    private config;
    private context;
    private isInitialized;
    constructor(config?: ShadowTraceConfig);
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
    private setupTransports;
    private setupGlobalErrorHandling;
}
declare const createLogger: (config?: ShadowTraceConfig) => ShadowTrace;
declare const getDefaultLogger: () => ShadowTrace;
declare const init: (config?: ShadowTraceConfig) => void;
declare const debug: (message: string, data?: any) => void;
declare const info: (message: string, data?: any) => void;
declare const warn: (message: string, data?: any) => void;
declare const error: (message: string, data?: any) => void;
declare const track: (event: string, data?: any) => void;

export { ConsoleTransport, HttpTransport, IndexedDBTransport, LocalStorageTransport, Logger, ShadowTrace, ShadowTraceProvider, TrackClick, TrackForm, createLogger, debug, error, getDefaultLogger, info, init, track, useComponentLifecycle, useErrorTracking, useShadowTrace, warn, withShadowTrace };
