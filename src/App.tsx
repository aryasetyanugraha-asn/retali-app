import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/ui/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { LeadsList } from './features/leads/LeadsList';
import { UnifiedInbox } from './features/inbox/UnifiedInbox';
import { ContentGenerator } from './features/content/ContentGenerator';
import { RoleProvider } from './context/RoleContext';

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leads" element={<LeadsList />} />
            <Route path="inbox" element={<UnifiedInbox />} />
            <Route path="content" element={<ContentGenerator />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;
