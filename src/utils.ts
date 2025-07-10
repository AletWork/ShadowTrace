export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const getBrowserInfo = () => {
  if (typeof navigator === 'undefined') return null;
  
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  
  if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
  else if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
  else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';
  else if (userAgent.indexOf('Opera') > -1) browser = 'Opera';
  
  return browser;
};

export const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') {
    return { type: 'unknown' as const, os: 'unknown', browser: 'unknown' };
  }
  
  const userAgent = navigator.userAgent;
  let type: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'desktop';
  let os = 'Unknown';
  
  // Détection du type d'appareil
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    if (/iPad/i.test(userAgent)) {
      type = 'tablet';
    } else {
      type = 'mobile';
    }
  }
  
  // Détection de l'OS
  if (userAgent.indexOf('Windows') > -1) os = 'Windows';
  else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
  else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
  else if (userAgent.indexOf('Android') > -1) os = 'Android';
  else if (userAgent.indexOf('iOS') > -1) os = 'iOS';
  
  return {
    type,
    os,
    browser: getBrowserInfo()
  };
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: any;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const isElementVisible = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export const getElementSelector = (element: Element): string => {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    // Handle both string and SVGAnimatedString cases
    let className = '';
    if (typeof element.className === 'string') {
      className = element.className;
    } else if (element.className && typeof element.className === 'object') {
      // For SVG elements, className is an SVGAnimatedString
      className = (element.className as any).baseVal || (element.className as any).animVal || '';
    }
    
    if (className) {
      const classes = className.split(' ').filter(Boolean);
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }
  }
  
  const tagName = element.tagName.toLowerCase();
  const parent = element.parentElement;
  
  if (!parent) {
    return tagName;
  }
  
  const siblings = (parent.children ? Array.prototype.slice.call(parent.children) : [])
    .filter((child: any) => child.tagName === element.tagName);
  if (siblings.length === 1) {
    return `${getElementSelector(parent)} > ${tagName}`;
  }
  
  const index = siblings.indexOf(element) + 1;
  return `${getElementSelector(parent)} > ${tagName}:nth-child(${index})`;
};

export const sanitizeData = (data: any, maxDepth = 3): any => {
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
    const sanitized: any = {};
    let count = 0;
    
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if (count >= 50) break; // Limite le nombre de propriétés
        
        try {
          sanitized[key] = sanitizeData(data[key], maxDepth - 1);
          count++;
        } catch (error) {
          sanitized[key] = '[Circular Reference]';
        }
      }
    }
    
    return sanitized;
  }
  
  return '[Unsupported Type]';
};
