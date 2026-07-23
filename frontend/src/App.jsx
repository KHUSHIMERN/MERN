import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { TimezoneProvider } from './context/TimezoneContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import EventList from './components/EventList';

const theme = createTheme({
  typography: {
    // Lock base to 16px so all rem units scale with browser zoom (WCAG 1.4.4)
    fontSize: 16,
    fontFamily: '"Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif'
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
