import type { Transport, LogEntry } from '../../types';
export declare class ConsoleTransport implements Transport {
    name: string;
    private debug;
    constructor(debug?: boolean);
    send(entries: LogEntry[]): void;
    private getConsoleMethod;
}
