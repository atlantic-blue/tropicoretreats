import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
import LoginPage from './pages/LoginPage';
import AppShell from './components/layout/AppShell';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="/leads" replace />} />
              <Route
                path="leads"
                element={
                  <div className="text-gray-600">
                    Leads list (Plan 05-05)
                  </div>
                }
              />
              <Route
                path="leads/:id"
                element={
                  <div className="text-gray-600">
                    Lead detail (Plan 05-06)
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
