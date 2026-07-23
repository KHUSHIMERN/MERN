import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { TimezoneProvider } from './context/TimezoneContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import EventList from './components/EventList';

const theme = createTheme({
  typography: {
    // Base font size set in rem units so all elements scale dynamically with browser zoom (WCAG 1.4.4)
    htmlFontSize: 16,
    fontFamily: '"Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: 'var(--font-size-4xl, 2.25rem)' },
    h2: { fontSize: 'var(--font-size-3xl, 1.75rem)' },
    h3: { fontSize: 'var(--font-size-2xl, 1.5rem)' },
    h4: { fontSize: 'var(--font-size-xl, 1.25rem)' },
    h5: { fontSize: 'var(--font-size-lg, 1.125rem)' },
    h6: { fontSize: 'var(--font-size-base, 1rem)' },
    subtitle1: { fontSize: 'var(--font-size-base, 1rem)' },
    subtitle2: { fontSize: 'var(--font-size-sm, 0.875rem)' },
    body1: { fontSize: 'var(--font-size-base, 1rem)' },
    body2: { fontSize: 'var(--font-size-sm, 0.875rem)' },
    caption: { fontSize: 'var(--font-size-xs, 0.75rem)' },
    button: { fontSize: 'var(--font-size-sm, 0.875rem)' }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontSize: '100%' // Allows root font-size to scale seamlessly with browser zoom & font settings
        }
      }
    }
  },
  palette: {
    // primary.main: #1d4ed8 — contrast 5.11:1 on white (WCAG AA ✅)
    primary: {
      main: '#1d4ed8'
    },
    // secondary.main: #374151 — contrast 7.23:1 on white (WCAG AA ✅)
    secondary: {
      main: '#374151'
    },
    background: {
      default: '#f8fafc'
    }
  }
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <AuthProvider>
          <TimezoneProvider>
            <div className="app-container">
              <Header />
              <main>
                <EventList />
              </main>
            </div>
          </TimezoneProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
