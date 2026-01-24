import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { SpacesProvider } from './context/SpacesContext';
import { DockProvider } from './context/DockContext';
import { ZenShelfProvider } from './context/ZenShelfContext';
import { LanguageProvider } from './context/LanguageContext';
import './styles/global.css';

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
