import React from 'react';
import { BrowserRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import AppRoutes from './Routes/router';
import Navigation from './components/Navigation';
import ScrollToTop from './components/ScrollToTop';
import WhatsAppButton from './components/WhatsAppButton';
import CookieConsent from './components/CookieConsent';
import { ToastProvider } from './components/Toast';
import Footer from './components/Footer';

const App = () => {
  return (
    <HelmetProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Navigation />
          <AppRoutes />
          <WhatsAppButton />
          <CookieConsent />
          <Footer />
        </BrowserRouter>
      </ToastProvider>
    </HelmetProvider>
  );
};

export default App;
