import type { ShadowTraceInstance } from '../types';

interface ApiCall {
  url: string;
  params?: any;
  timestamp: number;
  component?: string;
}

interface DetectorOptions {
  windowMs?: number; // Fenêtre de détection en ms
  threshold?: number; // Nombre d'appels pour alerter
}

const DEFAULT_OPTIONS: Required<DetectorOptions> = {
  windowMs: 1000, // 1 seconde
  threshold: 3
};

export class ApiDuplicateDetector {
  private calls: Record<string, number[]> = {};
  private options: Required<DetectorOptions>;
  private logger: ShadowTraceInstance;

  constructor(logger: ShadowTraceInstance, options?: DetectorOptions) {
    this.logger = logger;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  logApiCall(url: string, params?: any, component?: string) {
    const key = this.getKey(url, params);
    const now = Date.now();
    if (!this.calls[key]) {
      this.calls[key] = [];
    }
    this.calls[key].push(now);
    // Nettoyage de l'historique
    this.calls[key] = this.calls[key].filter(ts => now - ts < this.options.windowMs);

    if (this.calls[key].length >= this.options.threshold) {
      this.logger.warn('API call duplicate detected', {
        url,
        params,
        count: this.calls[key].length,
        windowMs: this.options.windowMs,
        component,
        stack: (new Error().stack || '').split('\n').slice(1, 6).join('\n')
      });
      // On évite de spammer en réinitialisant
      this.calls[key] = [];
    }
  }

  private getKey(url: string, params?: any): string {
    let paramsString = '';
    try {
      paramsString = params ? JSON.stringify(params) : '';
    } catch {
      paramsString = '[unserializable]';
    }
    return `${url}|${paramsString}`;
  }
}
