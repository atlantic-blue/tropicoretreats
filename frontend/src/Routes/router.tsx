import React from 'react';
import { Route, Routes as ReactRoutes } from 'react-router';

import { appRoutes, Routes } from './appRoutes';
import LandingPage from './LandingPage';
import AboutPage from '../pages/AboutPage';
import PrivacyPage from '../pages/PrivacyPage';
import TermsPage from '../pages/TermsPage';
import CaribbeanPage from '../pages/destinations/CaribbeanPage';
import CasanarePage from '../pages/destinations/CasanarePage';
import CoffeeRegionPage from '../pages/destinations/CoffeeRegionPage';

const Router: React.FC = () => {
  return (
    <ReactRoutes>
      <Route path={Routes.HOME} element={<LandingPage />} />
      <Route path={Routes.ABOUT} element={<AboutPage />} />
      <Route path={Routes.PRIVACY} element={<PrivacyPage />} />
      <Route path={Routes.TERMS} element={<TermsPage />} />
      <Route path={Routes.DESTINATION_CARIBBEAN} element={<CaribbeanPage />} />
      <Route path={Routes.DESTINATION_CASANARE} element={<CasanarePage />} />
      <Route path={Routes.DESTINATION_COFFEE} element={<CoffeeRegionPage />} />
      {/* Fallback to landing page for unknown routes */}
      <Route path="*" element={<LandingPage />} />
    </ReactRoutes>
  );
};

export { Router as default, appRoutes, Routes };
