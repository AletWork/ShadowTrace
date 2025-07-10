import type { ShadowTraceInstance } from '../types';
interface DetectorOptions {
    windowMs?: number;
    threshold?: number;
}
export declare class ApiDuplicateDetector {
    private calls;
    private options;
    private logger;
    constructor(logger: ShadowTraceInstance, options?: DetectorOptions);
    logApiCall(url: string, params?: any, component?: string): void;
    private getKey;
}
export {};
