import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
import LoginPage from './pages/LoginPage';
import AppShell from './components/layout/AppShell';
import { LeadsListPage } from './pages/LeadsListPage';
import { LeadDetailPage } from './pages/LeadDetailPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="/leads" replace />} />
              <Route path="leads" element={<LeadsListPage />} />
              <Route path="leads/:id" element={<LeadDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
