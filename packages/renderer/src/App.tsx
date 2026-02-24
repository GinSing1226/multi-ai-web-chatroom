/**
 * 主应用组件
 * Main App Component
 */

import { Routes, Route } from 'react-router-dom';
import SessionList from './pages/SessionList';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  console.log('📱 App component rendering...');
  console.log('Current URL:', window.location.href);
  console.log('Current pathname:', window.location.pathname);

  try {
    return (
      <LanguageProvider>
        {console.log('📦 LanguageProvider rendered')}
        <div className="h-screen w-screen flex overflow-hidden bg-bg-primary text-text-primary">
          {console.log('🎨 Root div rendered')}
          <Routes>
            <Route path="/" element={<SessionList />} />
            <Route path="/conversation/:id" element={<SessionList />} />
            {/* Fallback route - catch all */}
            <Route path="*" element={
              <div style={{ padding: '20px', color: 'red' }}>
                <h1>404 - Page Not Found</h1>
                <p>Current pathname: {window.location.pathname}</p>
                <button onClick={() => window.location.href = '/'}>Go Home</button>
              </div>
            } />
          </Routes>
        </div>
      </LanguageProvider>
    );
  } catch (error) {
    console.error('❌ App component error:', error);
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        <h1>App Error</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}
