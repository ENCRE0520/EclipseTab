import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './features/theme/context/ThemeContext';
import { SpacesProvider } from './features/spaces/context/SpacesContext';
import { DockProvider } from './features/dock/context/DockContext';
import { ZenShelfProvider } from './features/shelf/context/ZenShelfContext';
import { LanguageProvider } from './shared/context/LanguageContext';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <SpacesProvider>
      <DockProvider>
        <ZenShelfProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </ZenShelfProvider>
      </DockProvider>
    </SpacesProvider>
  </ThemeProvider>
);
