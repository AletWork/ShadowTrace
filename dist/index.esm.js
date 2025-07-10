const generateId = () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};
const getBrowserInfo = () => {
    if (typeof navigator === 'undefined')
        return null;
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    if (userAgent.indexOf('Chrome') > -1)
        browser = 'Chrome';
    else if (userAgent.indexOf('Firefox') > -1)
        browser = 'Firefox';
    else if (userAgent.indexOf('Safari') > -1)
        browser = 'Safari';
    else if (userAgent.indexOf('Edge') > -1)
        browser = 'Edge';
    else if (userAgent.indexOf('Opera') > -1)
        browser = 'Opera';
    return browser;
};
const getDeviceInfo = () => {
    if (typeof navigator === 'undefined') {
        return { type: 'unknown', os: 'unknown', browser: 'unknown' };
    }
    const userAgent = navigator.userAgent;
    let type = 'desktop';
    let os = 'Unknown';
    // Détection du type d'appareil
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (/iPad/i.test(userAgent)) {
            type = 'tablet';
        }
        else {
            type = 'mobile';
        }
    }
    // Détection de l'OS
    if (userAgent.indexOf('Windows') > -1)
        os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1)
        os = 'macOS';
    else if (userAgent.indexOf('Linux') > -1)
        os = 'Linux';
    else if (userAgent.indexOf('Android') > -1)
        os = 'Android';
    else if (userAgent.indexOf('iOS') > -1)
        os = 'iOS';
    return {
        type,
        os,
        browser: getBrowserInfo()
    };
};
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};
const getElementSelector = (element) => {
    if (element.id) {
        return `#${element.id}`;
    }
    if (element.className) {
        const classes = element.className.split(' ').filter(Boolean);
        if (classes.length > 0) {
            return `.${classes.join('.')}`;
        }
    }
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;
    if (!parent) {
        return tagName;
    }
    const siblings = (parent.children ? Array.prototype.slice.call(parent.children) : [])
        .filter((child) => child.tagName === element.tagName);
    if (siblings.length === 1) {
        return `${getElementSelector(parent)} > ${tagName}`;
    }
    const index = siblings.indexOf(element) + 1;
    return `${getElementSelector(parent)} > ${tagName}:nth-child(${index})`;
};
const sanitizeData = (data, maxDepth = 3) => {
    if (maxDepth <= 0) {
        return '[Max Depth Reached]';
    }
    if (data === null || data === undefined) {
        return data;
    }
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    if (data instanceof Error) {
        return {
            name: data.name,
            message: data.message,
            stack: data.stack
        };
    }
    if (Array.isArray(data)) {
        return data.slice(0, 100).map(item => sanitizeData(item, maxDepth - 1));
    }
    if (typeof data === 'object') {
        const sanitized = {};
        let count = 0;
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (count >= 50)
                    break; // Limite le nombre de propriétés
                try {
                    sanitized[key] = sanitizeData(data[key], maxDepth - 1);
                    count++;
                }
                catch (error) {
                    sanitized[key] = '[Circular Reference]';
                }
            }
        }
        return sanitized;
    }
    return '[Unsupported Type]';
};

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
class Logger {
    constructor(config) {
        this.transports = [];
        this.buffer = [];
        this.config = config;
        this.context = config.context;
        this.startFlushTimer();
    }
    log(level, message, data) {
        try {
            // Vérification du niveau de log
            if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
                return;
            }
            // Sampling
            if (Math.random() > this.config.sampling) {
                return;
            }
            // Création de l'entrée de log
            const entry = {
                id: generateId(),
                timestamp: Date.now(),
                level,
                message,
                data: data ? sanitizeData(data) : undefined,
                context: Object.assign({}, this.context)
            };
            // Application des filtres
            if (!this.shouldLog(entry)) {
                return;
            }
            // Ajout au buffer
            this.addToBuffer(entry);
            // Flush immédiat pour les erreurs
            if (level === 'error') {
                this.flush();
            }
        }
        catch (error) {
            this.config.onError(error);
        }
    }
    addTransport(transport) {
        this.transports.push(transport);
    }
    updateContext(context) {
        this.context = context;
    }
    async flush() {
        if (this.buffer.length === 0) {
            return;
        }
        const entries = [...this.buffer];
        this.buffer = [];
        const promises = this.transports.map(async (transport) => {
            try {
                await transport.send(entries);
            }
            catch (error) {
                this.config.onError(error);
            }
        });
        await Promise.all(promises);
    }
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flush();
        this.transports = [];
        this.buffer = [];
    }
    shouldLog(entry) {
        return this.config.filters.every(filter => {
            // Filtrage par niveau
            if (filter.level && !filter.level.includes(entry.level)) {
                return false;
            }
            // Filtrage par message
            if (filter.message && !filter.message.test(entry.message)) {
                return false;
            }
            // Filtrage par contexte
            if (filter.context && entry.context && !filter.context(entry.context)) {
                return false;
            }
            return true;
        });
    }
    addToBuffer(entry) {
        this.buffer.push(entry);
        // Limitation de la taille du buffer
        if (this.buffer.length > this.config.bufferSize) {
            this.buffer = this.buffer.slice(-this.config.bufferSize);
        }
    }
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.config.flushInterval);
    }
}

class ConsoleTransport {
    constructor(debug = true) {
        this.name = 'console';
        this.debug = debug;
    }
    send(entries) {
        if (!this.debug || typeof console === 'undefined') {
            return;
        }
        entries.forEach(entry => {
            const logMethod = this.getConsoleMethod(entry.level);
            const timestamp = new Date(entry.timestamp).toISOString();
            if (entry.data) {
                logMethod(`[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`, entry.data);
            }
            else {
                logMethod(`[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
            }
            // Log du contexte pour le debug
            if (this.debug && entry.level === 'debug' && entry.context) {
                console.groupCollapsed('Context');
                console.table(entry.context);
                console.groupEnd();
            }
        });
    }
    getConsoleMethod(level) {
        switch (level) {
            case 'debug':
                return console.debug || console.log;
            case 'info':
                return console.info || console.log;
            case 'warn':
                return console.warn || console.log;
            case 'error':
                return console.error || console.log;
            default:
                return console.log;
        }
    }
}

class HttpTransport {
    constructor(config) {
        this.name = 'http';
        this.queue = [];
        this.isProcessing = false;
        this.config = Object.assign({ timeout: 5000, retries: 3, batchSize: 10, headers: {
                'Content-Type': 'application/json',
            } }, config);
    }
    async send(entries) {
        this.queue.push(...entries);
        if (!this.isProcessing) {
            await this.processQueue();
        }
    }
    async flush() {
        await this.processQueue();
    }
    async processQueue() {
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
    async sendBatch(entries) {
        const payload = {
            entries,
            timestamp: Date.now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        };
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                await this.makeRequest(payload);
                return; // Succès, on sort de la boucle
            }
            catch (error) {
                lastError = error;
                if (attempt < this.config.retries) {
                    // Attendre avant de retry avec backoff exponentiel
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        // Si on arrive ici, toutes les tentatives ont échoué
        console.error('Failed to send logs after retries:', lastError);
    }
    async makeRequest(payload) {
        if (typeof fetch !== 'undefined') {
            return this.fetchRequest(payload);
        }
        else if (typeof XMLHttpRequest !== 'undefined') {
            return this.xhrRequest(payload);
        }
        else {
            throw new Error('No HTTP client available');
        }
    }
    async fetchRequest(payload) {
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async xhrRequest(payload) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = this.config.timeout;
            xhr.ontimeout = () => reject(new Error('Request timeout'));
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                }
                else {
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class LocalStorageTransport {
    constructor(config = {}) {
        this.name = 'localStorage';
        this.config = Object.assign({ key: 'shadowtrace_logs', maxEntries: 1000, compress: false }, config);
        if (typeof localStorage === 'undefined') {
            throw new Error('localStorage is not available');
        }
    }
    send(entries) {
        try {
            const existingLogs = this.getLogs();
            const allLogs = [...existingLogs, ...entries];
            // Limiter le nombre d'entrées
            const limitedLogs = allLogs.slice(-this.config.maxEntries);
            this.saveLogs(limitedLogs);
        }
        catch (error) {
            console.error('Failed to save logs to localStorage:', error);
        }
    }
    getLogs() {
        try {
            const data = localStorage.getItem(this.config.key);
            if (!data) {
                return [];
            }
            return JSON.parse(data);
        }
        catch (error) {
            console.error('Failed to parse logs from localStorage:', error);
            return [];
        }
    }
    clearLogs() {
        localStorage.removeItem(this.config.key);
    }
    exportLogs() {
        const logs = this.getLogs();
        return JSON.stringify(logs, null, 2);
    }
    saveLogs(logs) {
        const data = JSON.stringify(logs);
        localStorage.setItem(this.config.key, data);
    }
}

class AutoTracker {
    constructor(config, onEvent) {
        this.listeners = [];
        this.isActive = false;
        this.config = Object.assign({ clicks: true, inputs: true, scrolls: false, navigation: true, errors: true, performance: false, selectors: {
                ignore: ['[data-shadow-ignore]', '.shadow-ignore'],
                track: []
            } }, config);
        this.onEvent = onEvent;
    }
    start() {
        if (this.isActive || typeof window === 'undefined') {
            return;
        }
        this.isActive = true;
        if (this.config.clicks) {
            this.trackClicks();
        }
        if (this.config.inputs) {
            this.trackInputs();
        }
        if (this.config.scrolls) {
            this.trackScrolls();
        }
        if (this.config.navigation) {
            this.trackNavigation();
        }
        if (this.config.performance) {
            this.trackPerformance();
        }
    }
    stop() {
        if (!this.isActive) {
            return;
        }
        this.isActive = false;
        this.listeners.forEach(cleanup => cleanup());
        this.listeners = [];
    }
    trackClicks() {
        const handleClick = (event) => {
            const target = event.target;
            if (!target || this.shouldIgnoreElement(target)) {
                return;
            }
            const eventData = {
                type: 'click',
                element: {
                    tagName: target.tagName,
                    id: target.id || undefined,
                    className: target.className || undefined,
                    text: this.getElementText(target),
                    attributes: this.getElementAttributes(target)
                },
                data: {
                    x: event.clientX,
                    y: event.clientY,
                    button: event.button,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey,
                    selector: getElementSelector(target)
                }
            };
            this.onEvent(eventData);
        };
        document.addEventListener('click', handleClick, true);
        this.listeners.push(() => {
            document.removeEventListener('click', handleClick, true);
        });
    }
    trackInputs() {
        const handleInput = debounce((event) => {
            const target = event.target;
            if (!target || this.shouldIgnoreElement(target)) {
                return;
            }
            const eventData = {
                type: 'input',
                element: {
                    tagName: target.tagName,
                    id: target.id || undefined,
                    className: target.className || undefined,
                    attributes: this.getElementAttributes(target)
                },
                data: {
                    type: target.type,
                    value: this.sanitizeInputValue(target),
                    selector: getElementSelector(target)
                }
            };
            this.onEvent(eventData);
        }, 500);
        document.addEventListener('input', handleInput, true);
        document.addEventListener('change', handleInput, true);
        this.listeners.push(() => {
            document.removeEventListener('input', handleInput, true);
            document.removeEventListener('change', handleInput, true);
        });
    }
    trackScrolls() {
        const handleScroll = throttle(() => {
            const eventData = {
                type: 'scroll',
                data: {
                    scrollX: window.scrollX,
                    scrollY: window.scrollY,
                    scrollHeight: document.documentElement.scrollHeight,
                    clientHeight: window.innerHeight,
                    scrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
                }
            };
            this.onEvent(eventData);
        }, 1000);
        window.addEventListener('scroll', handleScroll, { passive: true });
        this.listeners.push(() => {
            window.removeEventListener('scroll', handleScroll);
        });
    }
    trackNavigation() {
        // Navigation via History API
        const self = this;
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function (state, title, url) {
            originalPushState.call(history, state, title, url);
            self.onNavigationEvent('pushstate', url);
        };
        history.replaceState = function (state, title, url) {
            originalReplaceState.call(history, state, title, url);
            self.onNavigationEvent('replacestate', url);
        };
        // Navigation via popstate
        const handlePopState = (event) => {
            this.onNavigationEvent('popstate', window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        this.listeners.push(() => {
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
            window.removeEventListener('popstate', handlePopState);
        });
    }
    trackPerformance() {
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            // Page Load Performance
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        const eventData = {
                            type: 'custom',
                            data: {
                                event: 'page_load_performance',
                                loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                                firstPaint: this.getFirstPaint(),
                                firstContentfulPaint: this.getFirstContentfulPaint()
                            }
                        };
                        this.onEvent(eventData);
                    }
                }, 0);
            });
        }
    }
    onNavigationEvent(type, url) {
        const eventData = {
            type: 'navigation',
            data: {
                type,
                url: url || window.location.href,
                referrer: document.referrer,
                timestamp: Date.now()
            }
        };
        this.onEvent(eventData);
    }
    shouldIgnoreElement(element) {
        // Vérifier les sélecteurs à ignorer
        if (this.config.selectors.ignore) {
            for (const selector of this.config.selectors.ignore) {
                if (element.matches && element.matches(selector)) {
                    return true;
                }
            }
        }
        // Si des sélecteurs de tracking sont spécifiés, ne tracker que ceux-là
        if (this.config.selectors.track && this.config.selectors.track.length > 0) {
            for (const selector of this.config.selectors.track) {
                if (element.matches && element.matches(selector)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    getElementText(element) {
        const text = element.textContent || '';
        return text.trim().substring(0, 100); // Limiter la longueur
    }
    getElementAttributes(element) {
        const attributes = {};
        const importantAttrs = ['id', 'class', 'name', 'type', 'href', 'src', 'alt', 'title'];
        importantAttrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) {
                attributes[attr] = value;
            }
        });
        return attributes;
    }
    sanitizeInputValue(input) {
        // Ne pas logger les valeurs sensibles
        const sensitiveTypes = ['password', 'email', 'tel', 'credit-card'];
        const sensitiveNames = ['password', 'email', 'phone', 'credit', 'card', 'ssn'];
        if (sensitiveTypes.includes(input.type.toLowerCase())) {
            return '[REDACTED]';
        }
        const name = (input.name || input.id || '').toLowerCase();
        if (sensitiveNames.some(sensitive => name.includes(sensitive))) {
            return '[REDACTED]';
        }
        // Limiter la longueur
        return input.value.substring(0, 100);
    }
    getFirstPaint() {
        const entries = performance.getEntriesByType('paint');
        const firstPaint = entries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }
    getFirstContentfulPaint() {
        const entries = performance.getEntriesByType('paint');
        const firstContentfulPaint = entries.find(entry => entry.name === 'first-contentful-paint');
        return firstContentfulPaint ? firstContentfulPaint.startTime : null;
    }
}

class IndexedDBTransport {
    constructor(config = {}) {
        this.name = 'indexedDB';
        this.db = null;
        this.isInitialized = false;
        this.config = Object.assign({ dbName: 'ShadowTraceLogs', storeName: 'logs', version: 1, maxEntries: 10000 }, config);
        if (typeof indexedDB === 'undefined') {
            throw new Error('IndexedDB is not available');
        }
        this.init();
    }
    async send(entries) {
        await this.ensureInitialized();
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const promises = entries.map(entry => {
            return new Promise((resolve, reject) => {
                const request = store.add(entry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
        await Promise.all(promises);
        // Nettoyer les anciens logs si nécessaire
        await this.cleanup();
    }
    async getLogs(limit = 100) {
        await this.ensureInitialized();
        if (!this.db) {
            return [];
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.config.storeName], 'readonly');
            const store = transaction.objectStore(this.config.storeName);
            const request = store.getAll();
            request.onsuccess = () => {
                const logs = request.result.slice(-limit);
                resolve(logs);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async clearLogs() {
        await this.ensureInitialized();
        if (!this.db) {
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
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
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }
    async cleanup() {
        if (!this.db) {
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.config.storeName], 'readwrite');
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
                        const cursor = event.target.result;
                        if (cursor && deletedCount < toDelete) {
                            cursor.delete();
                            deletedCount++;
                            cursor.continue();
                        }
                        else {
                            resolve();
                        }
                    };
                    request.onerror = () => reject(request.error);
                }
                else {
                    resolve();
                }
            };
            countRequest.onerror = () => reject(countRequest.error);
        });
    }
}

class ShadowTrace {
    constructor(config = {}) {
        var _a, _b, _c;
        this.isInitialized = false;
        // Configuration par défaut
        this.config = {
            apiKey: config.apiKey || '',
            environment: config.environment || 'development',
            debug: (_a = config.debug) !== null && _a !== void 0 ? _a : true,
            autoTrack: (_b = config.autoTrack) !== null && _b !== void 0 ? _b : true,
            autoTrackConfig: config.autoTrackConfig || {
                clicks: true,
                inputs: true,
                scrolls: false,
                navigation: true,
                errors: true,
                performance: false,
                selectors: {
                    ignore: ['[data-shadow-ignore]', '.shadow-ignore'],
                    track: []
                }
            },
            transports: config.transports || ['console'],
            httpConfig: config.httpConfig || {
                endpoint: '/api/logs',
                headers: {},
                timeout: 5000,
                retries: 3,
                batchSize: 10
            },
            level: config.level || 'debug',
            sampling: (_c = config.sampling) !== null && _c !== void 0 ? _c : 1,
            bufferSize: config.bufferSize || 100,
            flushInterval: config.flushInterval || 10000,
            context: config.context || {},
            filters: config.filters || [],
            onError: config.onError || (() => { })
        };
        // Contexte par défaut
        this.context = Object.assign({ sessionId: generateId(), url: typeof window !== 'undefined' ? window.location.href : '', referrer: typeof document !== 'undefined' ? document.referrer : '', userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '', viewport: typeof window !== 'undefined' ? {
                width: window.innerWidth,
                height: window.innerHeight
            } : { width: 0, height: 0 }, device: (() => {
                const deviceInfo = getDeviceInfo();
                return Object.assign(Object.assign({}, deviceInfo), { browser: deviceInfo.browser === null ? undefined : deviceInfo.browser });
            })() }, this.config.context);
        // Initialisation du logger
        this.logger = new Logger({
            level: this.config.level,
            context: this.context,
            bufferSize: this.config.bufferSize,
            flushInterval: this.config.flushInterval,
            filters: this.config.filters,
            sampling: this.config.sampling,
            onError: this.config.onError
        });
        // Ajout des transports
        this.setupTransports();
    }
    init() {
        if (this.isInitialized) {
            return;
        }
        // Initialisation de l'auto-tracking
        if (this.config.autoTrack && typeof window !== 'undefined') {
            this.autoTracker = new AutoTracker(this.config.autoTrackConfig, (event) => {
                this.track(event.type, event);
            });
            this.autoTracker.start();
        }
        // Capture des erreurs globales
        if (typeof window !== 'undefined') {
            this.setupGlobalErrorHandling();
        }
        this.isInitialized = true;
        this.info('ShadowTrace initialized', {
            config: {
                environment: this.config.environment,
                autoTrack: this.config.autoTrack,
                transports: this.config.transports
            }
        });
    }
    debug(message, data) {
        this.logger.log('debug', message, data);
    }
    info(message, data) {
        this.logger.log('info', message, data);
    }
    warn(message, data) {
        this.logger.log('warn', message, data);
    }
    error(message, data) {
        this.logger.log('error', message, data);
    }
    track(event, data) {
        this.logger.log('info', `Event: ${event}`, Object.assign(Object.assign({ event }, data), { _type: 'track' }));
    }
    setContext(context) {
        this.context = Object.assign(Object.assign({}, this.context), context);
        this.logger.updateContext(this.context);
    }
    setUserId(userId) {
        this.setContext({ userId });
    }
    addTransport(transport) {
        this.logger.addTransport(transport);
    }
    async flush() {
        await this.logger.flush();
    }
    destroy() {
        if (this.autoTracker) {
            this.autoTracker.stop();
        }
        this.logger.destroy();
        this.isInitialized = false;
    }
    setupTransports() {
        this.config.transports.forEach((transportType) => {
            try {
                switch (transportType) {
                    case 'console':
                        this.logger.addTransport(new ConsoleTransport(this.config.debug));
                        break;
                    case 'http':
                        if (this.config.httpConfig) {
                            this.logger.addTransport(new HttpTransport(this.config.httpConfig));
                        }
                        break;
                    case 'localStorage':
                        if (typeof localStorage !== 'undefined') {
                            this.logger.addTransport(new LocalStorageTransport());
                        }
                        break;
                }
            }
            catch (error) {
                console.warn(`Failed to setup transport: ${transportType}`, error);
            }
        });
    }
    setupGlobalErrorHandling() {
        // Erreurs JavaScript
        window.addEventListener('error', (event) => {
            var _a;
            this.error('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: (_a = event.error) === null || _a === void 0 ? void 0 : _a.stack,
                _type: 'javascript_error'
            });
        });
        // Promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled Promise Rejection', {
                reason: event.reason,
                promise: event.promise,
                _type: 'promise_rejection'
            });
        });
        // Erreurs de ressources
        window.addEventListener('error', (event) => {
            var _a, _b, _c;
            if (event.target !== window) {
                this.error('Resource Error', {
                    element: (_a = event.target) === null || _a === void 0 ? void 0 : _a.tagName,
                    source: ((_b = event.target) === null || _b === void 0 ? void 0 : _b.src) || ((_c = event.target) === null || _c === void 0 ? void 0 : _c.href),
                    _type: 'resource_error'
                });
            }
        }, true);
    }
}
// Instance globale par défaut
let defaultInstance = null;
const createLogger = (config) => {
    return new ShadowTrace(config);
};
const getDefaultLogger = () => {
    if (!defaultInstance) {
        defaultInstance = new ShadowTrace();
    }
    return defaultInstance;
};
// API simplifiée pour usage direct
const init = (config) => {
    if (defaultInstance) {
        defaultInstance.destroy();
    }
    defaultInstance = new ShadowTrace(config);
    defaultInstance.init();
};
const debug = (message, data) => {
    getDefaultLogger().debug(message, data);
};
const info = (message, data) => {
    getDefaultLogger().info(message, data);
};
const warn = (message, data) => {
    getDefaultLogger().warn(message, data);
};
const error = (message, data) => {
    getDefaultLogger().error(message, data);
};
const track = (event, data) => {
    getDefaultLogger().track(event, data);
};

export { ConsoleTransport, HttpTransport, IndexedDBTransport, LocalStorageTransport, Logger, ShadowTrace, createLogger, debug, error, getDefaultLogger, info, init, track, warn };
//# sourceMappingURL=index.esm.js.map
