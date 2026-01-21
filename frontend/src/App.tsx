import React from 'react';
import { BrowserRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import AppRoutes from './Routes/router';
import Navigation from './components/Navigation';
import WhatsAppButton from './components/WhatsAppButton';
import CookieConsent from './components/CookieConsent';
import { ToastProvider } from './components/Toast';

const App = () => {
  return (
    <HelmetProvider>
      <ToastProvider>
        <BrowserRouter>
          <Navigation />
          <AppRoutes />
          <WhatsAppButton />
          <CookieConsent />
        </BrowserRouter>
      </ToastProvider>
    </HelmetProvider>
  );
};

export default App;
