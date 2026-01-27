import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/ui/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { LeadsList } from './features/leads/LeadsList';
import { UnifiedInbox } from './features/inbox/UnifiedInbox';
import { ContentGenerator } from './features/content/ContentGenerator';
import { RoleProvider } from './context/RoleContext';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './components/ui/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="leads" element={<LeadsList />} />
              <Route path="inbox" element={<UnifiedInbox />} />
              <Route path="content" element={<ContentGenerator />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
