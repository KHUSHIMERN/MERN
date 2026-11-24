import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, Chip, TextField,
  Card, CardContent, CircularProgress, Alert, Tooltip, Stack,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatEventDateTime } from '../utils/dateUtils';
import { useTimezone } from '../context/TimezoneContext';

export default function VoiceAssistantModal({ open, onClose, onSelectEvent, onRsvpSuccess }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const showToast = useToast();
  const { activeTimezone, userLocale } = useTimezone();

  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [eventsResult, setEventsResult] = useState([]);
  const [pendingAction, setPendingAction] = useState(null); // { type, eventId, eventTitle }
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setQuery(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.warn('[Voice Assistant] Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[Voice Assistant] SpeechRecognition init error:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [lang]);

  // Text-to-Speech helper
  const speakText = useCallback((text) => {
    if (speechMuted || !('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Voice Assistant] Text-to-speech error:', err);
    }
  }, [speechMuted, lang]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle listening
  const handleToggleListening = () => {
    if (!speechSupported) {
      showToast('Voice speech recognition is not supported in this browser. Please type your query.', 'info');
      return;
    }

    stopSpeaking();

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      setQuery('');
      setPendingAction(null);
      setActionSuccessMessage(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
          recognitionRef.current.start();
        }
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  // Submit voice or text query to backend
  const handleSubmitQuery = async (customQuery = null, confirmed = false, actionPayload = null) => {
    const textToSend = customQuery || query;
    if (!textToSend.trim() && !actionPayload) return;

    setLoading(true);
    stopSpeaking();
    if (!confirmed) {
      setPendingAction(null);
      setActionSuccessMessage(null);
    }

    try {
      const payload = {
        query: textToSend.trim(),
        language: lang,
        userLocation: user?.city || 'Jaipur',
        confirmed,
        action: actionPayload || pendingAction,
      };

      const res = await axios.post('/api/ai/voice-assistant', payload);
      const data = res.data;

      setResponseMessage(data.spokenResponse || '');
      setEventsResult(data.events || []);

      // If action confirmation is needed
      if (data.confirmationNeeded && data.actionRequired) {
        setPendingAction(data.actionRequired);
      } else {
        setPendingAction(null);
      }

      // If action was executed (e.g. registration confirmed)
      if (data.actionExecuted === 'CONFIRM_REGISTRATION') {
        setActionSuccessMessage(data.spokenResponse);
        showToast('Registration successfully confirmed via Voice Assistant!', 'success');
        onRsvpSuccess?.();
      }

      // Voice response
      if (data.spokenResponse) {
        speakText(data.spokenResponse);
      }
    } catch (err) {
      console.error('[Voice Assistant] Error processing query:', err);
      const errMsg = err.response?.data?.message || 'Sorry, I had trouble processing that query.';
      setResponseMessage(errMsg);
      speakText(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // User confirms the action
  const handleConfirmAction = () => {
    if (!pendingAction) return;
    handleSubmitQuery('Yes, confirm registration', true, pendingAction);
  };

  // User cancels the action
  const handleCancelAction = () => {
    stopSpeaking();
    setPendingAction(null);
    setResponseMessage('Action cancelled. How else can I assist you?');
    speakText('Action cancelled. How else can I assist you?');
  };

  // Quick query chips
  const quickQueries = [
    'Find coding workshops near Patna this weekend',
    'Show tech events in Bengaluru',
    'Are there cultural festivals this month?',
    'Register me for Patna Coding & AI Workshop',
  ];

  const handleQuickQueryClick = (qText) => {
    setQuery(qText);
    handleSubmitQuery(qText);
  };

  const handleCloseModal = () => {
    stopSpeaking();
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseModal}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0f172a',
          color: '#f8fafc',
          borderRadius: 3.5,
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 24px 48px -8px rgba(0, 0, 0, 0.75)',
        },
      }}
    >
      {/* Title Bar */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          p: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: isListening ? '#ef4444' : '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening ? '0 0 16px #ef4444' : '0 0 12px rgba(99, 102, 241, 0.5)',
              transition: 'all 0.2s ease',
            }}
          >
            <MicIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Voice AI Assistant
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Speak or ask questions about community events, workshops, or registrations
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={speechMuted ? 'Unmute Voice Responses' : 'Mute Voice Responses'}>
            <IconButton
              size="small"
              onClick={() => {
                if (!speechMuted) stopSpeaking();
                setSpeechMuted(!speechMuted);
              }}
              sx={{ color: speechMuted ? '#94a3b8' : '#38bdf8' }}
            >
              {speechMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <IconButton onClick={handleCloseModal} sx={{ color: '#94a3b8' }} aria-label="Close modal">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Listening / Microphone Wave Visualizer */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 3,
            px: 2,
            mb: 2.5,
            borderRadius: 3,
            background: isListening
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.8) 70%)'
              : 'rgba(30, 41, 59, 0.5)',
            border: isListening ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
          }}
        >
          <Button
            onClick={handleToggleListening}
            variant="contained"
            sx={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              bgcolor: isListening ? '#ef4444' : '#6366f1',
              color: '#fff',
              mb: 1.5,
              boxShadow: isListening
                ? '0 0 0 10px rgba(239, 68, 68, 0.25), 0 0 24px #ef4444'
                : '0 0 0 6px rgba(99, 102, 241, 0.2), 0 0 16px rgba(99, 102, 241, 0.5)',
              '&:hover': {
                bgcolor: isListening ? '#dc2626' : '#4f46e5',
              },
              transition: 'all 0.2s ease',
            }}
            aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
          >
            {isListening ? <MicOffIcon sx={{ fontSize: '2rem' }} /> : <MicIcon sx={{ fontSize: '2rem' }} />}
          </Button>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isListening ? '#fca5a5' : '#cbd5e1' }}>
            {isListening ? 'Listening to your voice... Speak clearly' : 'Click the microphone or type below to ask'}
          </Typography>

          {!speechSupported && (
            <Typography variant="caption" sx={{ color: '#f59e0b', mt: 0.5 }}>
              Voice speech recognition not supported in this browser. You can type in the box below.
            </Typography>
          )}
        </Box>

        {/* Input Bar with Send Button */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={isListening ? 'Listening...' : 'Type or speak your query (e.g. "Find coding workshops near Patna this weekend")'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmitQuery();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(30, 41, 59, 0.8)',
                color: '#fff',
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                '&:hover fieldset': { borderColor: '#6366f1' },
                '&.Mui-focused fieldset': { borderColor: '#818cf8' },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleSubmitQuery()}
            disabled={loading || !query.trim()}
            sx={{
              bgcolor: '#6366f1',
              px: 2.5,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
          </Button>
        </Box>

        {/* Quick Suggestion Chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', mr: 0.5 }}>
            Try asking:
          </Typography>
          {quickQueries.map((qq) => (
            <Chip
              key={qq}
              label={qq}
              size="small"
              onClick={() => handleQuickQueryClick(qq)}
              clickable
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                color: '#cbd5e1',
                fontSize: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe' },
              }}
            />
          ))}
        </Box>

        {/* Assistant Response Message Box */}
        {responseMessage && (
          <Box
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 2.5,
              bgcolor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#818cf8', fontSize: '1.25rem', mt: 0.25 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#a5b4fc', mb: 0.5 }}>
                Voice AI Response
              </Typography>
              <Typography variant="body2" sx={{ color: '#e0e7ff', lineHeight: 1.4 }}>
                {responseMessage}
              </Typography>
            </Box>
            {isSpeaking && (
              <Chip
                size="small"
                icon={<VolumeUpIcon sx={{ '&&': { color: '#38bdf8', fontSize: '0.85rem' } }} />}
                label="Speaking"
                onClick={stopSpeaking}
                onDelete={stopSpeaking}
                sx={{ bgcolor: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', fontSize: '0.7rem' }}
              />
            )}
          </Box>
        )}

        {/* Action Confirmation Banner (Mandatory Voice Confirmation Feature 2) */}
        {pendingAction && (
          <Box
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 3,
              bgcolor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid #f59e0b',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fef3c7' }}>
                Action Confirmation Required
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#fde68a' }}>
              Are you sure you want to register for <strong>{pendingAction.eventTitle}</strong>
              {pendingAction.city ? ` in ${pendingAction.city}` : ''}?
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
              <Button
                variant="contained"
                onClick={handleConfirmAction}
                disabled={loading}
                startIcon={<CheckCircleIcon />}
                sx={{
                  bgcolor: '#059669',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                Yes, Confirm Registration
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelAction}
                disabled={loading}
                sx={{
                  color: '#cbd5e1',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {/* Action Success Alert */}
        {actionSuccessMessage && (
          <Alert severity="success" sx={{ mb: 2.5, bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
            {actionSuccessMessage}
          </Alert>
        )}

        {/* Matching Events Result Cards */}
        {eventsResult.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', mb: 1.5 }}>
              Matching Events ({eventsResult.length})
            </Typography>

            <Stack spacing={1.5}>
              {eventsResult.map((evt) => {
                const { formattedDate, formattedTime } = formatEventDateTime(
                  evt.startDate || evt.date,
                  evt.timezone,
                  activeTimezone,
                  userLocale,
                );
                const locationPlace = typeof evt.location === 'object' ? evt.location?.placeName : evt.location;

                return (
                  <Card
                    key={evt._id || evt.id || evt.title}
                    sx={{
                      bgcolor: 'rgba(30, 41, 59, 0.75)',
                      borderRadius: 2.5,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      p: 2,
                      gap: 2,
                      transition: 'background 0.15s ease',
                      '&:hover': { bgcolor: 'rgba(30, 41, 59, 0.95)' },
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        {evt.category && (
                          <Chip
                            label={evt.category}
                            size="small"
                            sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
                          />
                        )}
                        {evt.city && (
                          <Chip
                            label={evt.city}
                            size="small"
                            sx={{ fontSize: '0.7rem', bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc' }}
                          />
                        )}
                      </Box>

                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
                        {evt.title}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, color: '#94a3b8', fontSize: '0.8rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: '0.9rem', color: '#818cf8' }} />
                          <span>{formattedDate} · {formattedTime}</span>
                        </Box>
                        {locationPlace && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOnIcon sx={{ fontSize: '0.9rem', color: '#38bdf8' }} />
                            <span>{locationPlace}</span>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onSelectEvent?.(evt);
                          handleCloseModal();
                        }}
                        sx={{
                          textTransform: 'none',
                          color: '#e0e7ff',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          fontSize: '0.75rem',
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setPendingAction({
                            type: 'CONFIRM_REGISTRATION',
                            eventId: evt._id || evt.id,
                            eventTitle: evt.title,
                            city: evt.city || locationPlace || '',
                          });
                          const askMsg = `Are you sure you want to register for "${evt.title}"? Please confirm.`;
                          setResponseMessage(askMsg);
                          speakText(askMsg);
                        }}
                        sx={{
                          textTransform: 'none',
                          bgcolor: '#6366f1',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          '&:hover': { bgcolor: '#4f46e5' },
                        }}
                      >
                        Register
                      </Button>
                    </Box>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Button onClick={handleCloseModal} sx={{ color: '#94a3b8', textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
