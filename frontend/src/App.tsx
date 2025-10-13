import React from 'react';
import { BrowserRouter } from 'react-router';
import AppRoutes from './Routes/router';

const App = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
