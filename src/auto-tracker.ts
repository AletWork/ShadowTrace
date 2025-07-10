import { debounce, throttle, getElementSelector } from './utils';
import type { AutoTrackConfig, AutoTrackEvent } from '../types';

export class AutoTracker {
  private config: Required<AutoTrackConfig>;
  private onEvent: (event: AutoTrackEvent) => void;
  private listeners: Array<() => void> = [];
  private isActive = false;

  constructor(config: AutoTrackConfig, onEvent: (event: AutoTrackEvent) => void) {
    this.config = {
      clicks: true,
      inputs: true,
      scrolls: false,
      navigation: true,
      errors: true,
      performance: false,
      selectors: {
        ignore: ['[data-shadow-ignore]', '.shadow-ignore'],
        track: []
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
}
