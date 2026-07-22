import React from 'react';
import { Card, CardContent, Typography, Chip, Box, Button } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LanguageIcon from '@mui/icons-material/Language';
import { formatEventDateTime } from '../utils/dateUtils';

const categoryColors = {
  career: '#1976d2',
  health: '#2e7d32',
  culture: '#d32f2f',
  workshop: '#ed6c02',
  general: '#0288d1'
};

export default function EventCard({ event, activeTimezone, userLocale, onSelectEvent, onRSVP }) {
  const {
    formattedDate,
    formattedTime,
    timezoneLabel,
    isCrossTimezone
  } = formatEventDateTime(event.startDate, event.timezone, activeTimezone, userLocale);

  const categoryColor = categoryColors[event.category] || categoryColors.general;

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip
            label={event.category?.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: categoryColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.7rem'
            }}
          />
          {isCrossTimezone && (
            <Chip
              icon={<LanguageIcon style={{ fontSize: 14, color: '#0288d1' }} />}
              label="Converted Time"
              size="small"
              variant="outlined"
              color="info"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>

        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {event.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <LocationOnIcon fontSize="small" color="action" />
          <Typography variant="body2" noWrap>
            {event.location}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {formattedDate} • {formattedTime}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#64748b', pl: 3.2, fontWeight: 600 }}>
            {timezoneLabel}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {event.description}
        </Typography>
      </CardContent>

      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={() => onSelectEvent(event)}
          sx={{ borderRadius: 2 }}
        >
          Details
        </Button>
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={() => onRSVP(event)}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
        >
          RSVP
        </Button>
      </Box>
    </Card>
  );
}
