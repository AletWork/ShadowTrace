# ShadowTrace - Documentation Technique

## Architecture

ShadowTrace est une bibliothèque de logging frontend modulaire composée de plusieurs couches :

### 1. Core Logger (`src/logger.ts`)

- Gestion centralisée des logs
- Buffering et batch processing
- Filtrage et sampling
- Gestion des transports multiples

### 2. Auto-Tracker (`src/auto-tracker.ts`)

- Capture automatique des événements DOM
- Tracking des interactions utilisateur
- Monitoring des performances
- Détection d'erreurs

### 3. Transports

- **Console** : Affichage dans la console du navigateur
- **HTTP** : Envoi vers un endpoint API
- **LocalStorage** : Stockage local persistant
- **IndexedDB** : Base de données client avancée

### 4. Intégration React (`src/react.tsx`)

- Provider/Context pattern
- Hooks personnalisés
- HOCs pour auto-tracking
- Composants wrapper

## Configuration

```typescript
interface ShadowTraceConfig {
  // Identification
  apiKey?: string;
  environment?: string;

  // Comportement
  debug?: boolean;
  autoTrack?: boolean;
  level?: LogLevel;
  sampling?: number;

  // Auto-tracking
  autoTrackConfig?: {
    clicks?: boolean;
    inputs?: boolean;
    scrolls?: boolean;
    navigation?: boolean;
    errors?: boolean;
    performance?: boolean;
    selectors?: {
      ignore?: string[];
      track?: string[];
    };
  };

  // Transports
  transports?: TransportType[];
  httpConfig?: HttpTransportConfig;

  // Performance
  bufferSize?: number;
  flushInterval?: number;

  // Contexte
  context?: Partial<LogContext>;
  filters?: LogFilter[];
  onError?: (error: Error) => void;
}
```

## API Reference

### Classes principales

#### ShadowTrace

```typescript
class ShadowTrace {
  constructor(config?: ShadowTraceConfig);
  init(): void;
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  track(event: string, data?: any): void;
  setContext(context: Partial<LogContext>): void;
  setUserId(userId: string): void;
  addTransport(transport: Transport): void;
  flush(): Promise<void>;
  destroy(): void;
}
```

#### Logger

```typescript
class Logger {
  constructor(config: LoggerConfig);
  log(level: LogLevel, message: string, data?: any): void;
  addTransport(transport: Transport): void;
  updateContext(context: LogContext): void;
  flush(): Promise<void>;
  destroy(): void;
}
```

#### AutoTracker

```typescript
class AutoTracker {
  constructor(
    config: AutoTrackConfig,
    onEvent: (event: AutoTrackEvent) => void
  );
  start(): void;
  stop(): void;
}
```

### Transports

#### ConsoleTransport

```typescript
class ConsoleTransport implements Transport {
  constructor(debug?: boolean);
  send(entries: LogEntry[]): void;
}
```

#### HttpTransport

```typescript
class HttpTransport implements Transport {
  constructor(config: HttpTransportConfig);
  send(entries: LogEntry[]): Promise<void>;
  flush(): Promise<void>;
}
```

#### LocalStorageTransport

```typescript
class LocalStorageTransport implements Transport {
  constructor(config?: LocalStorageTransportConfig);
  send(entries: LogEntry[]): void;
  getLogs(): LogEntry[];
  clearLogs(): void;
  exportLogs(): string;
}
```

### React Integration

#### Hooks

```typescript
function useShadowTrace(): UseShadowTraceHook;
function useComponentLifecycle(componentName: string): void;
function useErrorTracking(componentName: string): void;
```

#### Composants

```typescript
function ShadowTraceProvider({
  config,
  children,
}: ShadowTraceProviderProps): JSX.Element;
function TrackClick({
  eventName,
  eventData,
  children,
}: TrackClickProps): JSX.Element;
function TrackForm({ formName, children }: TrackFormProps): JSX.Element;
function withShadowTrace<P>(
  WrappedComponent: ComponentType<P>,
  componentName?: string
): ComponentType<P>;
```

## Types de données

### LogEntry

```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  context?: LogContext;
  tags?: string[];
}
```

### LogContext

```typescript
interface LogContext {
  userId?: string;
  sessionId: string;
  page?: string;
  userAgent?: string;
  url?: string;
  referrer?: string;
  viewport?: { width: number; height: number };
  device?: {
    type: "mobile" | "tablet" | "desktop" | "unknown";
    os?: string;
    browser?: string;
  };
}
```

### AutoTrackEvent

```typescript
interface AutoTrackEvent {
  type: "click" | "input" | "scroll" | "navigation" | "error" | "custom";
  element?: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    attributes?: Record<string, string>;
  };
  data?: any;
}
```

## Sécurité et Confidentialité

### Données sensibles

- Les mots de passe sont automatiquement masqués
- Les champs email/téléphone peuvent être filtrés
- Troncature automatique des valeurs longues
- Sanitisation des références circulaires

### Sampling et Performance

- Sampling configurable pour réduire le volume
- Buffering pour minimiser les appels réseau
- Debouncing sur les événements fréquents
- Lazy loading des transports

### Filtrage

```typescript
const filters: LogFilter[] = [
  // Par niveau
  { level: ["error", "warn"] },

  // Par message
  { message: /critical|important/i },

  // Par contexte
  { context: (ctx) => ctx.userId === "admin" },
];
```

## Intégration Serveur

### Endpoint de réception

```javascript
// Express.js exemple
app.post("/api/logs", (req, res) => {
  const { entries, timestamp, userAgent } = req.body;

  entries.forEach((entry) => {
    // Validation
    if (!entry.timestamp || !entry.level || !entry.message) {
      return;
    }

    // Stockage en base
    logDatabase.insert({
      ...entry,
      serverTimestamp: Date.now(),
      ip: req.ip,
      userAgent,
    });
  });

  res.json({ success: true });
});
```

### Format de données

```json
{
  "entries": [
    {
      "id": "abc123def456",
      "timestamp": 1672531200000,
      "level": "info",
      "message": "User action",
      "data": {
        "event": "button_click",
        "button": "login"
      },
      "context": {
        "sessionId": "sess_123",
        "userId": "user_456",
        "url": "https://example.com/login",
        "userAgent": "Mozilla/5.0...",
        "device": {
          "type": "desktop",
          "os": "macOS",
          "browser": "Chrome"
        }
      }
    }
  ],
  "timestamp": 1672531200000,
  "userAgent": "Mozilla/5.0..."
}
```

## Performance et Optimisations

### Métriques automatiques

- **First Paint** : Temps du premier rendu
- **First Contentful Paint** : Premier contenu visible
- **Load Time** : Temps de chargement total
- **DOM Ready** : Temps de construction du DOM

### Optimisations

1. **Batch processing** : Regroupement des logs
2. **Compression** : Réduction de la taille des données
3. **Retry logic** : Gestion des échecs réseau
4. **Circuit breaker** : Protection contre les surcharges
5. **Memory management** : Limitation du buffer

### Configuration pour production

```typescript
const productionConfig = {
  environment: "production",
  debug: false,
  level: "warn", // Logs moins verbeux
  sampling: 0.1, // 10% d'échantillonnage
  bufferSize: 50,
  flushInterval: 30000, // 30 secondes
  autoTrackConfig: {
    clicks: true,
    inputs: false, // Moins intrusif
    scrolls: false,
    navigation: true,
    errors: true,
    performance: true,
  },
};
```

## Debugging et Troubleshooting

### Mode debug

```typescript
const debugConfig = {
  debug: true,
  level: "debug",
  sampling: 1,
  onError: (error) => {
    console.error("ShadowTrace Error:", error);
    // Envoi vers service de monitoring
  },
};
```

### Inspection des logs

```javascript
// Accès aux logs LocalStorage
const logs = localStorage.getItem("shadowtrace_logs");
console.table(JSON.parse(logs));

// Export programmatique
logger.exportLogs().then((data) => {
  console.log("Exported logs:", data);
});
```

### Métriques de santé

- Taux d'erreur des transports
- Latence d'envoi des logs
- Taille du buffer
- Fréquence de flush

## Extensibilité

### Transport personnalisé

```typescript
class CustomTransport implements Transport {
  name = "custom";

  async send(entries: LogEntry[]): Promise<void> {
    // Logique personnalisée
    await this.sendToCustomEndpoint(entries);
  }

  async flush(): Promise<void> {
    // Nettoyage si nécessaire
  }
}

logger.addTransport(new CustomTransport());
```

### Filtres avancés

```typescript
const customFilter: LogFilter = {
  context: (ctx) => {
    // Logique métier complexe
    return ctx.userId && ctx.userId.startsWith("premium_");
  },
};
```

### Plugins

```typescript
interface ShadowTracePlugin {
  name: string;
  init(logger: ShadowTrace): void;
  destroy?(): void;
}

class AnalyticsPlugin implements ShadowTracePlugin {
  name = "analytics";

  init(logger: ShadowTrace) {
    // Intégration avec Google Analytics
    logger.addTransport(new GoogleAnalyticsTransport());
  }
}
```

## Roadmap

### Version 1.1

- [ ] Transport WebSocket
- [ ] Compression gzip
- [ ] Métriques avancées
- [ ] Plugin system

### Version 1.2

- [ ] Support React Native
- [ ] TypeScript strict mode
- [ ] Performance optimizations
- [ ] Advanced filtering

### Version 2.0

- [ ] Machine learning insights
- [ ] Real-time dashboard
- [ ] A/B testing integration
- [ ] GDPR compliance tools
