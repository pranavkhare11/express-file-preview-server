import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar/Navbar';
import { SettingsModal } from './components/layout/SettingsModal/SettingsModal';
import { AuthPage } from './features/auth/AuthPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ExplorerPage } from './features/explorer/ExplorerPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'explorer'>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-dot)',
          color: 'var(--text-muted)',
          fontSize: '1rem',
          letterSpacing: '0.12em',
        }}
      >
        [ INITIALIZING NOTHING // OS VFS SESSION... ]
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      <Navbar onOpenSettings={() => setSettingsOpen(true)} />

      {currentView === 'dashboard' && (
        <DashboardPage
          onOpenExplorer={() => setCurrentView('explorer')}
        />
      )}

      {currentView === 'explorer' && (
        <ExplorerPage onBack={() => setCurrentView('dashboard')} />
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
