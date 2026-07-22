import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LanguageIcon from '@mui/icons-material/Language';
import { useTimezone } from '../context/TimezoneContext';
import { useLanguage } from '../context/LanguageContext';
import { getTimezoneOffsetLabel } from '../utils/dateUtils';

const COMMON_IANA_TIMEZONES = [
  { zone: 'Asia/Kolkata', label: 'India Standard Time (IST)', region: 'Asia / Tier 2-4 India' },
  { zone: 'America/New_York', label: 'Eastern Time (ET - NY, DC)', region: 'North America' },
  { zone: 'America/Chicago', label: 'Central Time (CT - Chicago)', region: 'North America' },
  { zone: 'America/Los_Angeles', label: 'Pacific Time (PT - LA, SF)', region: 'North America' },
  { zone: 'Europe/London', label: 'Greenwich Mean / British Time (GMT/BST)', region: 'Europe' },
  { zone: 'Europe/Paris', label: 'Central European Time (CET - Paris)', region: 'Europe' },
  { zone: 'Asia/Dubai', label: 'Gulf Standard Time (GST - Dubai)', region: 'Middle East' },
  { zone: 'Asia/Tokyo', label: 'Japan Standard Time (JST - Tokyo)', region: 'Asia' },
  { zone: 'Asia/Singapore', label: 'Singapore Time (SGT)', region: 'Asia' },
  { zone: 'Australia/Sydney', label: 'Australian Eastern Time (AEST)', region: 'Australia' },
  { zone: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Global' }
];

export default function TimezoneSelectorModal({ open, onClose }) {
  const { t } = useLanguage();
  const {
    detectedTimezone,
    activeTimezone,
    isOverridden,
    setManualTimezone,
    resetToDetectedTimezone
  } = useTimezone();

  const [search, setSearch] = useState('');

  const filteredZones = COMMON_IANA_TIMEZONES.filter(
    item =>
      item.zone.toLowerCase().includes(search.toLowerCase()) ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.region.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectZone = (zone) => {
    setManualTimezone(zone);
    onClose();
  };

  const handleReset = () => {
    resetToDetectedTimezone();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth paperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {t('selectTzTitle')}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('selectTzSubtitle')}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: isOverridden ? '#fff7ed' : '#eff6ff', border: `1px solid ${isOverridden ? '#ffedd5' : '#dbeafe'}` }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: isOverridden ? '#c2410c' : '#1d4ed8' }}>
            {t('effectiveTzSource')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon color={isOverridden ? 'warning' : 'primary'} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {activeTimezone} ({getTimezoneOffsetLabel(activeTimezone)})
              </Typography>
            </Box>
            <Chip
              label={isOverridden ? t('manualOverride') : t('detectedFromBrowser')}
              color={isOverridden ? 'warning' : 'primary'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </Box>

        <TextField
          placeholder={t('searchTzPlaceholder')}
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 2 }}
        />

        <List sx={{ maxHeight: 280, overflowY: 'auto', p: 0 }}>
          {filteredZones.map(item => {
            const isSelected = activeTimezone === item.zone;
            const offsetLabel = getTimezoneOffsetLabel(item.zone);

            return (
              <ListItem key={item.zone} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleSelectZone(item.zone)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemIcon>
                    <LanguageIcon color={isSelected ? 'primary' : 'action'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: isSelected ? 700 : 500 }}>
                          {item.label}
                        </Typography>
                        <Chip label={offsetLabel} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      </Box>
                    }
                    secondary={`${item.zone} • ${item.region}`}
                  />
                  {isSelected && <CheckIcon color="primary" sx={{ ml: 1 }} />}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          disabled={!isOverridden}
          color="secondary"
        >
          {t('resetToBrowser')} ({detectedTimezone})
        </Button>
        <Button onClick={onClose} color="inherit">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
