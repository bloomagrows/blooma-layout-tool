import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import GardenPage from './pages/GardenPage';
import AdminPortal from './components/AdminPortal';
import DebugInfo from './pages/DebugInfo';
import DebugPanel from './components/DebugPanel';
import { getDebugEntries } from './utils/openai';

function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isGardenRoute, setIsGardenRoute] = useState(false);
  const [isDebugRoute, setIsDebugRoute] = useState(false);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);

  // Check if we're on the admin or garden route
  useEffect(() => {
    const path = window.location.pathname;
    setIsAdminRoute(path === '/admin');
    setIsGardenRoute(path === '/g');
    setIsDebugRoute(path === '/debuginfo');
  }, []);

  // Add keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setIsDebugPanelVisible(!isDebugPanelVisible);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDebugPanelVisible]);

  if (isAdminRoute) {
    return <AdminPortal />;
  }

  if (isGardenRoute) {
    return <GardenPage />;
  }

  if (isDebugRoute) {
    return <DebugInfo />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spring-leaf-50 to-cornflower-50">
      <nav className="absolute top-0 left-0 right-0 p-4 backdrop-blur-[2px]">
        <div className="container mx-auto flex items-center justify-between">
          <a 
            href="/"
            className="flex items-center space-x-2"
          >
            <img src="./blooma-icon.png" alt="Blooma" className="w-8 h-8" />
            <span className="text-2xl font-display font-medium">Blooma</span>
          </a>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8 pt-20">
        <Onboarding 
          onComplete={(plants, dimensions, sessionId, existingLayout) => {
            // Navigate to garden page with layout ID
            if (existingLayout?.generation_id) {
              window.location.href = `/g?id=${existingLayout.generation_id}`;
            }
          }}
          onZoneChange={() => {}}
        />
      </main>

      {isDebugPanelVisible && (
        <DebugPanel
          entries={getDebugEntries()}
          onClose={() => setIsDebugPanelVisible(false)}
        />
      )}
    </div>
  );
}

export default App;