import type { Transport, LogEntry, HttpTransportConfig } from '../../types';

export class HttpTransport implements Transport {
  name = 'http';
  private config: HttpTransportConfig;
  private queue: LogEntry[] = [];
  private isProcessing = false;

  constructor(config: HttpTransportConfig) {
    this.config = {
      timeout: 5000,
      retries: 3,
      batchSize: 10,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config
    };
  }

  async send(entries: LogEntry[]): Promise<void> {
    this.queue.push(...entries);
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async flush(): Promise<void> {
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.config.batchSize);
      await this.sendBatch(batch);
    }

    this.isProcessing = false;
  }

  private async sendBatch(entries: LogEntry[]): Promise<void> {
    const payload = {
      entries,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries!; attempt++) {
      try {
        await this.makeRequest(payload);
        return; // Succès, on sort de la boucle
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries!) {
          // Attendre avant de retry avec backoff exponentiel
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // Si on arrive ici, toutes les tentatives ont échoué
    console.error('Failed to send logs after retries:', lastError);
  }

  private async makeRequest(payload: any): Promise<void> {
    if (typeof fetch !== 'undefined') {
      return this.fetchRequest(payload);
    } else if (typeof XMLHttpRequest !== 'undefined') {
      return this.xhrRequest(payload);
    } else {
      throw new Error('No HTTP client available');
    }
  }

  private async fetchRequest(payload: any): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async xhrRequest(payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.timeout = this.config.timeout!;
      xhr.ontimeout = () => reject(new Error('Request timeout'));
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      };

      xhr.open('POST', this.config.endpoint);
      
      // Set headers
      if (this.config.headers) {
        for (const key in this.config.headers) {
          if (this.config.headers.hasOwnProperty(key)) {
            xhr.setRequestHeader(key, this.config.headers[key]);
          }
        }
      }

      xhr.send(JSON.stringify(payload));
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}