import type { Transport, LogEntry } from '../../types';

export interface IndexedDBTransportConfig {
  dbName?: string;
  storeName?: string;
  version?: number;
  maxEntries?: number;
}

export class IndexedDBTransport implements Transport {
  name = 'indexedDB';
  private config: Required<IndexedDBTransportConfig>;
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  constructor(config: IndexedDBTransportConfig = {}) {
    this.config = {
      dbName: 'ShadowTraceLogs',
      storeName: 'logs',
      version: 1,
      maxEntries: 10000,
      ...config
    };

    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available');
    }

    this.init();
  }

  async send(entries: LogEntry[]): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.config.storeName], 'readwrite');
    const store = transaction.objectStore(this.config.storeName);

    const promises = entries.map(entry => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    
    // Nettoyer les anciens logs si nécessaire
    await this.cleanup();
  }

  async getLogs(limit = 100): Promise<LogEntry[]> {
    await this.ensureInitialized();
    
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const logs = request.result.slice(-limit);
        resolve(logs);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearLogs(): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: 'id',
            autoIncrement: false
          });
          
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      
      // Compter les entrées
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        if (count > this.config.maxEntries) {
          // Supprimer les plus anciens
          const index = store.index('timestamp');
          const request = index.openCursor();
          let deletedCount = 0;
          const toDelete = count - this.config.maxEntries;
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            
            if (cursor && deletedCount < toDelete) {
              cursor.delete();
              deletedCount++;
              cursor.continue();
            } else {
              resolve();
            }
          };
          
          request.onerror = () => reject(request.error);
        } else {
          resolve();
        }
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}
