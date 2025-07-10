import React, { createContext, useContext, useEffect, useRef } from "react";
import { ShadowTrace } from "./index";
import type {
  ShadowTraceConfig,
  ShadowTraceProviderProps,
  UseShadowTraceHook,
} from "../types";

const ShadowTraceContext = createContext<ShadowTrace | null>(null);

export function ShadowTraceProvider({
  config,
  children,
}: ShadowTraceProviderProps) {
  const loggerRef = useRef<ShadowTrace | null>(null);

  useEffect(() => {
    // Créer et initialiser le logger
    loggerRef.current = new ShadowTrace(config);
    loggerRef.current.init();

    // Cleanup à la destruction
    return () => {
      if (loggerRef.current) {
        loggerRef.current.destroy();
      }
    };
  }, []);

  return (
    <ShadowTraceContext.Provider value={loggerRef.current}>
      {children}
    </ShadowTraceContext.Provider>
  );
}

export function useShadowTrace(): UseShadowTraceHook {
  const logger = useContext(ShadowTraceContext);

  if (!logger) {
    throw new Error("useShadowTrace must be used within a ShadowTraceProvider");
  }

  return {
    debug: (message: string, data?: any) => logger.debug(message, data),
    info: (message: string, data?: any) => logger.info(message, data),
    warn: (message: string, data?: any) => logger.warn(message, data),
    error: (message: string, data?: any) => logger.error(message, data),
    track: (event: string, data?: any) => logger.track(event, data),
    setContext: (context) => logger.setContext(context),
    setUserId: (userId) => logger.setUserId(userId),
  };
}

// Hook pour tracker automatiquement le cycle de vie d'un composant
export function useComponentLifecycle(componentName: string) {
  const logger = useShadowTrace();

  useEffect(() => {
    logger.debug(`Component mounted: ${componentName}`);

    return () => {
      logger.debug(`Component unmounted: ${componentName}`);
    };
  }, [componentName, logger]);
}

// Hook pour tracker les erreurs dans un composant
export function useErrorTracking(componentName: string) {
  const logger = useShadowTrace();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logger.error(`Error in ${componentName}`, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [componentName, logger]);
}

// HOC pour wrapper un composant avec le logging automatique
export function withShadowTrace<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Component";

  const ShadowTraceWrapper = (props: P) => {
    useComponentLifecycle(displayName);
    useErrorTracking(displayName);

    return <WrappedComponent {...props} />;
  };

  ShadowTraceWrapper.displayName = `withShadowTrace(${displayName})`;
  return ShadowTraceWrapper;
}

// Composant pour tracker les clics automatiquement
interface TrackClickProps {
  eventName: string;
  eventData?: any;
  children: React.ReactElement<any>;
}

export function TrackClick({
  eventName,
  eventData,
  children,
}: TrackClickProps) {
  const logger = useShadowTrace();

  const handleClick = (originalOnClick?: () => void) => {
    return (event: React.MouseEvent) => {
      // Logger l'événement
      logger.track(eventName, {
        ...eventData,
        timestamp: Date.now(),
        target: {
          tagName: (event.target as HTMLElement).tagName,
          id: (event.target as HTMLElement).id,
          className: (event.target as HTMLElement).className,
        },
      });

      // Exécuter le onClick original s'il existe
      if (originalOnClick) {
        originalOnClick();
      }
    };
  };

  return React.cloneElement(children, {
    onClick: handleClick((children.props as any).onClick),
  });
}

// Composant pour tracker les formulaires
interface TrackFormProps {
  formName: string;
  children: React.ReactElement<any, any>;
}

export function TrackForm({ formName, children }: TrackFormProps) {
  const logger = useShadowTrace();

  const handleSubmit = (
    originalOnSubmit?: (event: React.FormEvent) => void
  ) => {
    return (event: React.FormEvent<HTMLFormElement>) => {
      const formData = new FormData(event.currentTarget);
      const data: Record<string, any> = {};

      // Collecter les données du formulaire (sans les valeurs sensibles)
      formData.forEach((value, key) => {
        if (!key.toLowerCase().includes("password")) {
          data[key] = value.toString().substring(0, 100);
        }
      });

      logger.track("form_submit", {
        formName,
        fields: Object.keys(data),
        timestamp: Date.now(),
      });

      if (originalOnSubmit) {
        originalOnSubmit(event);
      }
    };
  };

  return React.cloneElement(children, {
    onSubmit: handleSubmit(children.props.onSubmit),
  });
}
