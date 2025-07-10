import type { Transport, LogEntry } from '../../types';
export interface IndexedDBTransportConfig {
    dbName?: string;
    storeName?: string;
    version?: number;
    maxEntries?: number;
}
export declare class IndexedDBTransport implements Transport {
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
