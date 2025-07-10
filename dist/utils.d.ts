export declare const generateId: () => string;
export declare const getBrowserInfo: () => string | null;
export declare const getDeviceInfo: () => {
    type: "unknown";
    os: string;
    browser: string;
} | {
    type: "mobile" | "tablet" | "desktop";
    os: string;
    browser: string | null;
};
export declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => ((...args: Parameters<T>) => void);
export declare const throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => ((...args: Parameters<T>) => void);
export declare const isElementVisible: (element: Element) => boolean;
export declare const getElementSelector: (element: Element) => string;
export declare const sanitizeData: (data: any, maxDepth?: number) => any;
