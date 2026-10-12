import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { NotificationProvider } from './context/NotificationContext'
import { initPosthog } from './lib/posthog'
import './index.css'
import App from './App.jsx'

initPosthog();

const savedYouthSettings = sessionStorage.getItem('fh_settings_youth_tab');
const savedOrgSettings = sessionStorage.getItem('fh_settings_org_tab');

try {
  const preferredTheme =
    (savedYouthSettings && JSON.parse(savedYouthSettings)?.theme)
    || (savedOrgSettings && JSON.parse(savedOrgSettings)?.theme)
    || 'light';
  document.documentElement.setAttribute('data-theme', preferredTheme);
} catch (err) {
  document.documentElement.setAttribute('data-theme', 'light');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)