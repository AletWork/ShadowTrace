import type { LogLevel, LogContext, Transport, LogFilter } from '../types';
interface LoggerConfig {
    level: LogLevel;
    context: LogContext;
    bufferSize: number;
    flushInterval: number;
    filters: LogFilter[];
    sampling: number;
    onError: (error: Error) => void;
}
export declare class Logger {
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
export {};
