/* eslint-disable */
import React from 'react';
import { Route, Routes as ReactRoutes } from 'react-router';

import env from '../env';

import { appRoutes, Routes } from './appRoutes';
import TropicoRetreatsPage from './LandingPage';

const Router: React.FC = () => {
  return (
      <ReactRoutes>
        <Route
          path="*"
          element={
            <TropicoRetreatsPage />
          }
        />
      </ReactRoutes>
  );
};

export { Router as default, appRoutes, Routes };
