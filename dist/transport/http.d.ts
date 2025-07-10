import type { Transport, LogEntry, HttpTransportConfig } from '../../types';
export declare class HttpTransport implements Transport {
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
