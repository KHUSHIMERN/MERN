import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { TimezoneProvider } from './context/TimezoneContext';
import Header from './components/Header';
import EventList from './components/EventList';

const theme = createTheme({
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  palette: {
    primary: {
      main: '#2563eb'
    },
    secondary: {
      main: '#475569'
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
      <TimezoneProvider>
        <div className="app-container">
          <Header />
          <main>
            <EventList />
          </main>
        </div>
      </TimezoneProvider>
    </ThemeProvider>
  );
}
