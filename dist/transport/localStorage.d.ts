import type { Transport, LogEntry } from '../../types';
export interface LocalStorageTransportConfig {
    key?: string;
    maxEntries?: number;
    compress?: boolean;
}
export declare class LocalStorageTransport implements Transport {
    name: string;
    private config;
    constructor(config?: LocalStorageTransportConfig);
    send(entries: LogEntry[]): void;
    getLogs(): LogEntry[];
    clearLogs(): void;
    exportLogs(): string;
    private saveLogs;
}
