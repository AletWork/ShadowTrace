# ShadowTrace Examples

## Installation

```bash
npm install shadowtrace
```

## Vanilla JavaScript

### Configuration basique

```javascript
import { init, track, info, error } from "shadowtrace";

// Configuration
init({
  environment: "production",
  autoTrack: true,
  transports: ["console", "http"],
  httpConfig: {
    endpoint: "https://api.example.com/logs",
    headers: {
      Authorization: "Bearer your-token",
    },
  },
  level: "info",
  sampling: 0.1, // 10% sampling
});

// Usage
info("App started");
track("user_action", { action: "button_click", button: "login" });
```

### Configuration avancée

```javascript
import { ShadowTrace } from "shadowtrace";

const logger = new ShadowTrace({
  environment: "production",
  autoTrack: true,
  autoTrackConfig: {
    clicks: true,
    inputs: true,
    scrolls: true,
    navigation: true,
    errors: true,
    performance: true,
    selectors: {
      ignore: [".ignore-tracking", "[data-no-track]"],
      track: [".track-this", "#important-button"],
    },
  },
  transports: ["console", "http", "localStorage"],
  filters: [
    {
      level: ["error", "warn"],
      message: /critical|important/i,
    },
    {
      context: (ctx) => ctx.userId === "admin",
    },
  ],
  onError: (error) => {
    console.error("Logger error:", error);
  },
});

logger.init();

// Ajouter du contexte
logger.setUserId("user123");
logger.setContext({
  feature: "checkout",
  experiment: "variant_a",
});

// Logging manuel
logger.info("User started checkout process", {
  cart: {
    items: 3,
    total: 99.99,
  },
});
```

## React

### Provider Setup

```jsx
import React from "react";
import { ShadowTraceProvider } from "shadowtrace/react";

function App() {
  return (
    <ShadowTraceProvider
      config={{
        environment: "production",
        autoTrack: true,
        transports: ["console", "http"],
        httpConfig: {
          endpoint: "/api/logs",
        },
      }}
    >
      <AppContent />
    </ShadowTraceProvider>
  );
}
```

### Hook Usage

```jsx
import { useShadowTrace } from "shadowtrace/react";

function LoginForm() {
  const logger = useShadowTrace();

  const handleLogin = async (credentials) => {
    logger.info("Login attempt started");

    try {
      const user = await login(credentials);
      logger.setUserId(user.id);
      logger.track("login_success", { method: "email" });
    } catch (error) {
      logger.error("Login failed", { error: error.message });
    }
  };

  return <form onSubmit={handleLogin}>{/* form content */}</form>;
}
```

### Auto-tracking Components

```jsx
import { TrackClick, TrackForm } from "shadowtrace/react";

function ShoppingCart() {
  return (
    <div>
      <TrackClick eventName="checkout_started" eventData={{ source: "cart" }}>
        <button>Checkout</button>
      </TrackClick>

      <TrackForm formName="shipping_info">
        <form>
          <input name="address" placeholder="Address" />
          <button type="submit">Save</button>
        </form>
      </TrackForm>
    </div>
  );
}
```

### HOC Usage

```jsx
import { withShadowTrace } from "shadowtrace/react";

const ProductPage = ({ productId }) => {
  return <div>Product {productId}</div>;
};

export default withShadowTrace(ProductPage, "ProductPage");
```

## Error Tracking

### JavaScript Errors

```javascript
// Automatic capture
window.onerror = (message, source, lineno, colno, error) => {
  // Automatically logged by ShadowTrace
};

// Manual error logging
try {
  riskyOperation();
} catch (error) {
  logger.error("Operation failed", {
    operation: "payment_processing",
    error: error.message,
    stack: error.stack,
  });
}
```

### React Error Boundaries

```jsx
import { useShadowTrace } from "shadowtrace/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Send to ShadowTrace
    this.props.logger.error("React Error Boundary", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

## Performance Tracking

```javascript
// Automatic performance metrics
logger.track("page_load", {
  loadTime:
    performance.timing.loadEventEnd - performance.timing.navigationStart,
  domReady:
    performance.timing.domContentLoadedEventEnd -
    performance.timing.navigationStart,
});

// Custom performance markers
performance.mark("feature-start");
// ... some code
performance.mark("feature-end");
performance.measure("feature-duration", "feature-start", "feature-end");

logger.track("feature_performance", {
  duration: performance.getEntriesByName("feature-duration")[0].duration,
});
```

## Custom Transports

```javascript
import { Transport } from "shadowtrace";

class WebSocketTransport {
  constructor(wsUrl) {
    this.name = "websocket";
    this.ws = new WebSocket(wsUrl);
  }

  send(entries) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(entries));
    }
  }
}

// Usage
const logger = new ShadowTrace();
logger.addTransport(new WebSocketTransport("ws://localhost:8080"));
```

## Analytics Integration

```javascript
// Google Analytics
logger.track("page_view", {
  page: "/products",
  userId: user.id,
});

// Custom analytics
logger.track("conversion", {
  event: "purchase",
  value: 99.99,
  currency: "USD",
  items: ["product1", "product2"],
});
```

## Debugging

```javascript
// Enable debug mode
const logger = new ShadowTrace({
  debug: true,
  level: "debug",
});

// View logs in localStorage
const logs = JSON.parse(localStorage.getItem("shadowtrace_logs"));
console.table(logs);
```
