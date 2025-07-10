import type { AutoTrackConfig, AutoTrackEvent } from '../types';
export declare class AutoTracker {
    private config;
    private onEvent;
    private listeners;
    private isActive;
    constructor(config: AutoTrackConfig, onEvent: (event: AutoTrackEvent) => void);
    start(): void;
    stop(): void;
    private trackClicks;
    private trackInputs;
    private trackScrolls;
    private trackNavigation;
    private trackPerformance;
    private onNavigationEvent;
    private shouldIgnoreElement;
    private getElementText;
    private getElementAttributes;
    private sanitizeInputValue;
    private getFirstPaint;
    private getFirstContentfulPaint;
}
