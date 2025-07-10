import { debounce, throttle, getElementSelector } from './utils';
import type { AutoTrackConfig, AutoTrackEvent } from '../types';

export class AutoTracker {
  private config: any; // Simplifions temporairement le typage
  private onEvent: (event: AutoTrackEvent) => void;
  private listeners: Array<() => void> = [];
  private isActive = false;
  private performanceObserver?: PerformanceObserver;
  private mutationObserver?: MutationObserver;

  constructor(config: AutoTrackConfig, onEvent: (event: AutoTrackEvent) => void) {
    this.config = {
      clicks: true,
      inputs: true,
      scrolls: false,
      navigation: true,
      errors: true,
      performance: false,
      webVitals: true,
      slowPages: true,
      memoryUsage: false,
      consoleErrors: true,
      unhandledPromises: true,
      resourceErrors: true,
      selectors: {
        ignore: config.selectors?.ignore || ['[data-shadow-ignore]', '.shadow-ignore'],
        track: config.selectors?.track || []
      },
      ...config
    };
    this.onEvent = onEvent;
  }

  start(): void {
    if (this.isActive || typeof window === 'undefined') {
      return;
    }

    this.isActive = true;

    // Tracking existant
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

    if (this.config.errors) {
      this.trackErrors();
    }

    if (this.config.performance) {
      this.trackPerformance();
      
      if (this.config.webVitals !== false) {
        this.trackWebVitals();
      }
      
      if (this.config.slowPages !== false) {
        this.trackSlowPages();
      }
      
      if (this.config.resourceErrors !== false) {
        this.trackResourceErrors();
      }
    }

    // Nouveaux trackings
    if (this.config.consoleErrors !== false) {
      this.trackConsoleErrors();
    }
    
    if (this.config.unhandledPromises !== false) {
      this.trackUnhandledPromises();
    }
    
    this.trackPageVisibility();
    
    if (this.config.memoryUsage) {
      this.trackMemoryUsage();
    }
  }

  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }

  private trackClicks(): void {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (!target || this.shouldIgnoreElement(target)) {
        return;
      }

      const eventData: AutoTrackEvent = {
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

  private trackInputs(): void {
    const handleInput = debounce((event: Event) => {
      const target = event.target as HTMLInputElement;
      
      if (!target || this.shouldIgnoreElement(target)) {
        return;
      }

      const eventData: AutoTrackEvent = {
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

  private trackScrolls(): void {
    const handleScroll = throttle(() => {
      const eventData: AutoTrackEvent = {
        type: 'scroll',
        data: {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: window.innerHeight,
          scrollPercentage: Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          )
        }
      };

      this.onEvent(eventData);
    }, 1000);

    window.addEventListener('scroll', handleScroll, { passive: true });
    this.listeners.push(() => {
      window.removeEventListener('scroll', handleScroll);
    });
  }

  private trackNavigation(): void {
    // Navigation via History API
    const self = this;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(state: any, title: any, url?: any) {
      originalPushState.call(history, state, title, url);
      self.onNavigationEvent('pushstate', url);
    };

    history.replaceState = function(state: any, title: any, url?: any) {
      originalReplaceState.call(history, state, title, url);
      self.onNavigationEvent('replacestate', url);
    };

    // Navigation via popstate
    const handlePopState = (event: PopStateEvent) => {
      this.onNavigationEvent('popstate', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    this.listeners.push(() => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    });
  }

  private trackErrors(): void {
    // Erreurs JavaScript globales
    const handleError = (event: ErrorEvent) => {
      this.onEvent({
        type: 'error',
        data: {
          type: 'javascript_error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack,
          timestamp: Date.now()
        }
      });
    };

    window.addEventListener('error', handleError);
    this.listeners.push(() => {
      window.removeEventListener('error', handleError);
    });
  }

  private trackPerformance(): void {
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      // Page Load Performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            const eventData: AutoTrackEvent = {
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

  private trackConsoleErrors(): void {
    // Capture des console.error
    const originalError = console.error;
    console.error = (...args: any[]) => {
      this.onEvent({
        type: 'error',
        data: {
          type: 'console_error',
          message: args.map(arg => String(arg)).join(' '),
          args: args.slice(0, 5), // Limite pour éviter des données trop lourdes
          timestamp: Date.now()
        }
      });
      originalError.apply(console, args);
    };

    // Capture des console.warn
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      this.onEvent({
        type: 'error',
        data: {
          type: 'console_warning',
          message: args.map(arg => String(arg)).join(' '),
          args: args.slice(0, 5),
          timestamp: Date.now()
        }
      });
      originalWarn.apply(console, args);
    };

    this.listeners.push(() => {
      console.error = originalError;
      console.warn = originalWarn;
    });
  }

  private trackUnhandledPromises(): void {
    const handleRejection = (event: PromiseRejectionEvent) => {
      this.onEvent({
        type: 'error',
        data: {
          type: 'unhandled_promise_rejection',
          reason: String(event.reason),
          promise: event.promise,
          timestamp: Date.now()
        }
      });
    };

    window.addEventListener('unhandledrejection', handleRejection);
    this.listeners.push(() => {
      window.removeEventListener('unhandledrejection', handleRejection);
    });
  }

  private trackWebVitals(): void {
    // Mesure des Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          this.onEvent({
            type: 'custom',
            data: {
              type: 'web_vital',
              metric: 'LCP',
              value: Math.round((lastEntry as any).renderTime || (lastEntry as any).loadTime),
              rating: this.getWebVitalRating((lastEntry as any).renderTime || (lastEntry as any).loadTime, 'LCP'),
              timestamp: Date.now()
            }
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.onEvent({
              type: 'custom',
              data: {
                type: 'web_vital',
                metric: 'FID',
                value: Math.round((entry as any).processingStart - (entry as any).startTime),
                rating: this.getWebVitalRating((entry as any).processingStart - (entry as any).startTime, 'FID'),
                timestamp: Date.now()
              }
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          
          this.onEvent({
            type: 'custom',
            data: {
              type: 'web_vital',
              metric: 'CLS',
              value: Math.round(clsValue * 1000) / 1000,
              rating: this.getWebVitalRating(clsValue, 'CLS'),
              timestamp: Date.now()
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        this.listeners.push(() => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        });
      } catch (e) {
        console.warn('Performance Observer not supported for Web Vitals');
      }
    }
  }

  private trackSlowPages(): void {
    // Détection des pages lentes
    const startTime = performance.now();
    
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      
      if (loadTime > 3000) { // Seuil de 3 secondes
        this.onEvent({
          type: 'custom',
          data: {
            type: 'slow_page',
            loadTime: Math.round(loadTime),
            url: window.location.href,
            timestamp: Date.now(),
            resources: this.getSlowResources()
          }
        });
      }
    });

    // Détection des interactions lentes
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if ((entry as any).duration > 100) { // Seuil de 100ms
              this.onEvent({
                type: 'custom',
                data: {
                  type: 'slow_interaction',
                  duration: Math.round((entry as any).duration),
                  interactionType: (entry as any).name,
                  timestamp: Date.now()
                }
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
        this.listeners.push(() => observer.disconnect());
      } catch (e) {
        console.warn('Performance Observer not supported for slow interactions');
      }
    }
  }

  private trackPageVisibility(): void {
    let visibilityStart = Date.now();
    
    const handleVisibilityChange = () => {
      const now = Date.now();
      const timeSpent = now - visibilityStart;
      
      this.onEvent({
        type: 'custom',
        data: {
          type: 'page_visibility',
          visible: !document.hidden,
          timeSpent: Math.round(timeSpent),
          timestamp: now
        }
      });
      
      visibilityStart = now;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.listeners.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  private trackMemoryUsage(): void {
    // Suivi de l'utilisation mémoire (si disponible)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = memory;
        
        const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;
        
        if (usagePercent > 80) { // Seuil de 80%
          this.onEvent({
            type: 'custom',
            data: {
              type: 'high_memory_usage',
              usedJSHeapSize: Math.round(usedJSHeapSize / 1024 / 1024), // MB
              totalJSHeapSize: Math.round(totalJSHeapSize / 1024 / 1024),
              jsHeapSizeLimit: Math.round(jsHeapSizeLimit / 1024 / 1024),
              usagePercent: Math.round(usagePercent),
              timestamp: Date.now()
            }
          });
        }
      };

      // Vérifier toutes les 30 secondes
      const interval = setInterval(checkMemory, 30000);
      this.listeners.push(() => clearInterval(interval));
    }
  }

  private getWebVitalRating(value: number, metric: string): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      'LCP': { good: 2500, poor: 4000 },
      'FID': { good: 100, poor: 300 },
      'CLS': { good: 0.1, poor: 0.25 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private getSlowResources(): any[] {
    if (!performance.getEntriesByType) return [];
    
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter(resource => resource.duration > 1000) // Plus de 1 seconde
      .slice(0, 10) // Top 10 des ressources lentes
      .map(resource => ({
        name: resource.name,
        duration: Math.round(resource.duration),
        size: (resource as any).transferSize || 0,
        type: (resource as any).initiatorType
      }));
  }

  private onNavigationEvent(type: string, url: string | null): void {
    const eventData: AutoTrackEvent = {
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

  private shouldIgnoreElement(element: Element): boolean {
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

  private getElementText(element: Element): string {
    const text = element.textContent || '';
    return text.trim().substring(0, 100); // Limiter la longueur
  }

  private getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    const importantAttrs = ['id', 'class', 'name', 'type', 'href', 'src', 'alt', 'title'];
    
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    });

    return attributes;
  }

  private sanitizeInputValue(input: HTMLInputElement): string {
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

  private getFirstPaint(): number | null {
    const entries = performance.getEntriesByType('paint');
    const firstPaint = entries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  private getFirstContentfulPaint(): number | null {
    const entries = performance.getEntriesByType('paint');
    const firstContentfulPaint = entries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : null;
  }

  private trackResourceErrors(): void {
    // Erreurs de chargement de ressources
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        this.onEvent({
          type: 'error',
          data: {
            type: 'resource_error',
            element: target.tagName,
            source: (target as any).src || (target as any).href,
            timestamp: Date.now()
          }
        });
      }
    };

    // Utiliser capture phase pour attraper les erreurs de ressources
    window.addEventListener('error', handleResourceError, true);
    this.listeners.push(() => {
      window.removeEventListener('error', handleResourceError, true);
    });
  }
}
