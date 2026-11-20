import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { NotificationProvider } from './context/NotificationContext'
import { PwaInstallProvider } from './context/PwaInstallContext'
import { initPosthog } from './lib/posthog'
import { getUserTheme } from './utils/themePreference'
import './index.css'
import App from './App.jsx'

initPosthog();

const getStoredUser = () => {
  try {
    const userJson = sessionStorage.getItem('user') || localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
};

const storedUser = getStoredUser();
document.documentElement.setAttribute('data-theme', getUserTheme(storedUser));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PwaInstallProvider>
          <LanguageProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </LanguageProvider>
        </PwaInstallProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)