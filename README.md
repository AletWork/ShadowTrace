# ShadowTrace 🔍

Une bibliothèque de logging frontend puissante pour capturer automatiquement les actions utilisateur, erreurs JavaScript, et événements DOM.

## ✨ Fonctionnalités

- 🎯 **Auto-tracking** - Capture automatique des événements DOM
- 🚨 **Gestion d'erreurs** - Capture automatique des erreurs JavaScript
- 📊 **Actions personnalisées** - Log des actions métier spécifiques
- 🚀 **Multi-transport** - Console, HTTP, localStorage, et plus
- ⚛️ **Compatible React** - Hooks et composants dédiés
- 📱 **Multi-plateforme** - Web, React Native
- 🎛️ **Configurable** - Filtres, niveaux, sampling
- 📦 **Léger** - Bundle optimisé

## 🚀 Installation

```bash
npm install shadowtrace
# ou
yarn add shadowtrace
```

## 🔧 Usage basique

### Vanilla JavaScript

```javascript
import { ShadowTrace } from "shadowtrace";

// Configuration
const logger = new ShadowTrace({
  apiKey: "your-api-key",
  environment: "production",
  autoTrack: true,
  transports: ["console", "http"],
});

// Initialisation
logger.init();

// Log manuel
logger.info("Page loaded", { page: "/home" });
logger.error("Something went wrong", error);
```

### React

```jsx
import { ShadowTraceProvider, useShadowTrace } from "shadowtrace/react";

function App() {
  return (
    <ShadowTraceProvider config={{ apiKey: "your-api-key" }}>
      <MyComponent />
    </ShadowTraceProvider>
  );
}

function MyComponent() {
  const logger = useShadowTrace();

  const handleClick = () => {
    logger.track("button_clicked", { button: "login" });
  };

  return <button onClick={handleClick}>Login</button>;
}
```

## 📖 Documentation complète

Voir la [documentation](./docs) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT
