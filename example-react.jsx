import React, { useState } from 'react';
import { ShadowTraceProvider, useShadowTrace, TrackClick, TrackForm, withShadowTrace } from 'shadowtrace/react';

// Configuration du logger
const loggerConfig = {
  environment: 'development',
  debug: true,
  autoTrack: true,
  autoTrackConfig: {
    clicks: true,
    inputs: true,
    scrolls: true,
    navigation: true,
    errors: true,
    performance: true
  },
  transports: ['console', 'localStorage'],
  level: 'debug'
};

// Composant principal avec HOC
const ProductCard = ({ product }) => {
  const logger = useShadowTrace();
  
  const handleAddToCart = () => {
    logger.track('add_to_cart', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category
    });
  };
  
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>Prix: {product.price}€</p>
      
      <TrackClick 
        eventName="product_view_details" 
        eventData={{ productId: product.id }}
      >
        <button>Voir détails</button>
      </TrackClick>
      
      <button onClick={handleAddToCart}>
        Ajouter au panier
      </button>
    </div>
  );
};

const TrackedProductCard = withShadowTrace(ProductCard, 'ProductCard');

// Formulaire de contact avec tracking
const ContactForm = () => {
  const logger = useShadowTrace();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    logger.track('form_contact_submit', {
      hasName: !!formData.name,
      hasEmail: !!formData.email,
      messageLength: formData.message.length
    });

    logger.info('Formulaire de contact soumis');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Log des interactions utilisateur
    logger.track('form_field_interaction', {
      field,
      valueLength: value.length,
      formCompletion: Object.values({...formData, [field]: value})
        .filter(Boolean).length / 3
    });
  };

  return (
    <TrackForm formName="contact">
      <form onSubmit={handleSubmit} className="contact-form">
        <h2>Contactez-nous</h2>
        
        <input
          type="text"
          placeholder="Votre nom"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
        
        <input
          type="email"
          placeholder="Votre email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          required
        />
        
        <textarea
          placeholder="Votre message"
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          rows="4"
          required
        />
        
        <button type="submit">Envoyer</button>
      </form>
    </TrackForm>
  );
};

// Composant de navigation
const Navigation = () => {
  const logger = useShadowTrace();
  
  const handleNavigation = (section) => {
    logger.track('navigation_click', {
      section,
      timestamp: Date.now()
    });
  };
  
  return (
    <nav className="navigation">
      <TrackClick eventName="logo_click">
        <div className="logo">ShadowTrace Demo</div>
      </TrackClick>
      
      <ul>
        <li>
          <TrackClick 
            eventName="nav_click" 
            eventData={{ section: 'products' }}
          >
            <a href="#products">Produits</a>
          </TrackClick>
        </li>
        <li>
          <TrackClick 
            eventName="nav_click" 
            eventData={{ section: 'about' }}
          >
            <a href="#about">À propos</a>
          </TrackClick>
        </li>
        <li>
          <TrackClick 
            eventName="nav_click" 
            eventData={{ section: 'contact' }}
          >
            <a href="#contact">Contact</a>
          </TrackClick>
        </li>
      </ul>
    </nav>
  );
};

// Hook personnalisé pour les analytics
const useAnalytics = () => {
  const logger = useShadowTrace();
  
  const trackConversion = (conversionData) => {
    logger.track('conversion', {
      ...conversionData,
      timestamp: Date.now(),
      sessionId: logger.context?.sessionId
    });
  };
  
  const trackEngagement = (action, data = {}) => {
    logger.track('engagement', {
      action,
      ...data,
      timestamp: Date.now()
    });
  };
  
  const setUserContext = (user) => {
    logger.setUserId(user.id);
    logger.setContext({
      userType: user.type,
      subscription: user.subscription,
      locale: user.locale
    });
  };
  
  return {
    trackConversion,
    trackEngagement,
    setUserContext
  };
};

// Composant d'exemple d'e-commerce
const EcommerceDemo = () => {
  const logger = useShadowTrace();
  const analytics = useAnalytics();
  const [user, setUser] = useState(null);
  
  const products = [
    { id: 1, name: 'Laptop', price: 999, category: 'electronics' },
    { id: 2, name: 'Smartphone', price: 599, category: 'electronics' },
    { id: 3, name: 'Livre React', price: 29, category: 'books' }
  ];
  
  const handleLogin = () => {
    const userData = {
      id: 'user123',
      type: 'premium',
      subscription: 'pro',
      locale: 'fr-FR'
    };
    
    setUser(userData);
    analytics.setUserContext(userData);
    
    logger.info('Utilisateur connecté', { userId: userData.id });
    analytics.trackConversion({
      type: 'login',
      method: 'demo'
    });
  };
  
  const handlePurchase = () => {
    analytics.trackConversion({
      type: 'purchase',
      value: 99.99,
      currency: 'EUR',
      items: ['laptop']
    });
    
    logger.info('Achat effectué');
  };
  
  React.useEffect(() => {
    // Log de l'ouverture de page
    logger.info('Page e-commerce chargée');
    analytics.trackEngagement('page_view', { page: 'ecommerce-demo' });
  }, []);
  
  return (
    <div className="ecommerce-demo">
      <Navigation />
      
      <main>
        <section className="hero">
          <h1>Démonstration ShadowTrace React</h1>
          <p>Tracking automatique des interactions utilisateur</p>
          
          {!user ? (
            <TrackClick 
              eventName="cta_login" 
              eventData={{ source: 'hero' }}
            >
              <button onClick={handleLogin} className="cta-button">
                Se connecter
              </button>
            </TrackClick>
          ) : (
            <p>Bienvenue, utilisateur {user.id} !</p>
          )}
        </section>
        
        <section className="products">
          <h2>Nos produits</h2>
          <div className="product-grid">
            {products.map(product => (
              <TrackedProductCard 
                key={product.id} 
                product={product} 
              />
            ))}
          </div>
        </section>
        
        <section className="actions">
          <h2>Actions de test</h2>
          
          <TrackClick 
            eventName="test_purchase" 
            eventData={{ amount: 99.99 }}
          >
            <button onClick={handlePurchase}>
              Simuler un achat
            </button>
          </TrackClick>
          
          <TrackClick 
            eventName="test_error" 
            eventData={{ intentional: true }}
          >
            <button onClick={() => { throw new Error('Erreur de test'); }}>
              Déclencher une erreur
            </button>
          </TrackClick>
        </section>
        
        <section className="contact">
          <ContactForm />
        </section>
      </main>
    </div>
  );
};

// Composant racine avec Provider
export default function App() {
  return (
    <ShadowTraceProvider config={loggerConfig}>
      <div className="App">
        <EcommerceDemo />
      </div>
    </ShadowTraceProvider>
  );
}

// Styles CSS (à ajouter dans un fichier CSS séparé)
const styles = `
.ecommerce-demo {
  font-family: Arial, sans-serif;
  line-height: 1.6;
}

.navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #333;
  color: white;
}

.navigation .logo {
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
}

.navigation ul {
  display: flex;
  list-style: none;
  gap: 2rem;
  margin: 0;
}

.navigation a {
  color: white;
  text-decoration: none;
}

.navigation a:hover {
  color: #007bff;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.cta-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1rem;
}

.cta-button:hover {
  background: #0056b3;
}

.products {
  padding: 2rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.product-card {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.product-card button {
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.contact-form {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 0.8rem;
  margin: 0.5rem 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.contact-form button {
  background: #28a745;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  cursor: pointer;
}

.actions {
  padding: 2rem;
  text-align: center;
}

.actions button {
  margin: 1rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #17a2b8;
  color: white;
}
`;
