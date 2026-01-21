import React from 'react';
import { BrowserRouter } from 'react-router';
import AppRoutes from './Routes/router';
import Navigation from './components/Navigation';
import WhatsAppButton from './components/WhatsAppButton';
import CookieConsent from './components/CookieConsent';
import { ToastProvider } from './components/Toast';

const App = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Navigation />
        <AppRoutes />
        <WhatsAppButton />
        <CookieConsent />
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
