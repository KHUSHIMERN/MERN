import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, MapPin, Tag, AlertCircle, CheckCircle2, ArrowLeft, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Career & Jobs',
  'Skill Workshops',
  'Health & Wellness',
  'Cultural Festivals',
  'Civic & Community',
  'Technology & AI',
  'General'
];

export function OrganizerEventForm({ eventToEdit, onSaveSuccess, onCancel }) {
  const { user } = useAuth();
  const isEdit = Boolean(eventToEdit);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Career & Jobs',
    startDate: '',
    endDate: '',
    placeName: '',
    city: '',
    capacity: 100,
    published: false
  });

  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill form if editing an existing event
  useEffect(() => {
    if (eventToEdit) {
      const formatForDatetimeLocal = (val) => {
        if (!val) return '';
        try {
          const d = new Date(val);
          if (isNaN(d.getTime())) return '';
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          return '';
        }
      };

      const locPlace =
        typeof eventToEdit.location === 'object' && eventToEdit.location !== null
          ? eventToEdit.location.placeName || ''
          : typeof eventToEdit.location === 'string'
          ? eventToEdit.location
          : '';

      setFormData({
        title: eventToEdit.title || '',
        description: eventToEdit.description || '',
        category: eventToEdit.category || 'Career & Jobs',
        startDate: formatForDatetimeLocal(eventToEdit.startDate || eventToEdit.date),
        endDate: formatForDatetimeLocal(eventToEdit.endDate),
        placeName: locPlace,
        city: eventToEdit.city || (user && user.city) || 'Indore',
        capacity: eventToEdit.capacity != null ? Number(eventToEdit.capacity) : 100,
        published: Boolean(eventToEdit.published)
      });

      if (Array.isArray(eventToEdit.tags)) {
        setTags(eventToEdit.tags);
      } else if (typeof eventToEdit.tags === 'string' && eventToEdit.tags.trim()) {
        setTags(eventToEdit.tags.split(',').map((t) => t.trim()).filter(Boolean));
      } else {
        setTags([]);
      }
    } else {
      // Defaults for new event
      setFormData({
        title: '',
        description: '',
        category: 'Career & Jobs',
        startDate: '',
        endDate: '',
        placeName: '',
        city: (user && user.city) || 'Indore',
        capacity: 100,
        published: false
      });
      setTags(['Community', 'Workshop']);
    }
    setErrors({});
    setSubmitError(null);
  }, [eventToEdit, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Tag chip additions and removals
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Client-side validations (required fields and date validity)
  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required.';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Event start date & time is required.';
    } else {
      const s = new Date(formData.startDate);
      if (isNaN(s.getTime())) {
        newErrors.startDate = 'Invalid start date format.';
      }
    }

    if (formData.endDate && formData.startDate) {
      const s = new Date(formData.startDate);
      const e = new Date(formData.endDate);
      if (isNaN(e.getTime())) {
        newErrors.endDate = 'Invalid end date format.';
      } else if (s > e) {
        newErrors.endDate = 'End date cannot be earlier than start date.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        location: {
          placeName: formData.placeName.trim() || formData.city || 'Community Center',
          latitude: 26.9124,
          longitude: 75.7873
        },
        city: formData.city.trim() || 'Indore',
        tags,
        capacity: Number(formData.capacity) || 100,
        published: Boolean(formData.published),
        organizerId: user?._id || user?.id || 'organizer-current',
        organizerName: user?.name || 'Event Organizer'
      };

      let response;
      if (isEdit) {
        const eventId = eventToEdit._id || eventToEdit.id;
        response = await axios.put(`/api/events/${eventId}`, payload);
      } else {
        response = await axios.post('/api/events', payload);
      }

      const savedData = response.data?.data || response.data?.event || payload;
      if (onSaveSuccess) {
        onSaveSuccess(savedData, isEdit);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save event.';
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="organizer-form-card animate-fade-in" style={{
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Form Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
        <div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back to Organizer Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            {isEdit ? '✏️ Edit Organizer Event' : '✨ Create New Event'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '4px 0 0' }}>
            {isEdit
              ? 'Update details, tags, schedule, and publication status.'
              : 'Publish an upcoming community gathering, workshop, or festival.'}
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={20} />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
            Event Title <span style={{ color: '#f43f5e' }}>*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g. Tier-2 City Digital Skills & AI Workshop"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: `1px solid ${errors.title ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {errors.title && (
            <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '4px', margin: '4px 0 0' }}>
              {errors.title}
            </p>
          )}
        </div>

        {/* Category & Capacity Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
              Category <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
              Max Capacity / Seats
            </label>
            <input
              type="number"
              name="capacity"
              min="1"
              max="5000"
              value={formData.capacity}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Date Pickers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
              Start Date & Time <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${errors.startDate ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.startDate && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '4px', margin: '4px 0 0' }}>
                {errors.startDate}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
              End Date & Time
            </label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${errors.endDate ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.endDate && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '4px', margin: '4px 0 0' }}>
                {errors.endDate}
              </p>
            )}
          </div>
        </div>

        {/* Location & City Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
              Venue / Location Name
            </label>
            <input
              type="text"
              name="placeName"
              value={formData.placeName}
              onChange={handleInputChange}
              placeholder="e.g. City Community Hall, MG Road"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="e.g. Jaipur, Indore, Bhopal"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Tags Free-Text Input with Removable Chips */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
            Event Tags (Press Enter or click Add to create chips)
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. tech, skills, ai, jobfair"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 16px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              <Plus size={16} /> Add Tag
            </button>
          </div>

          {/* Chips Display */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '32px' }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#c7d2fe',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c7d2fe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                  title="Remove tag"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.875rem' }}>
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the activities, agenda, prerequisites, or benefits for attendees..."
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.95rem',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Published Checkbox */}
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="published-toggle"
            name="published"
            checked={formData.published}
            onChange={handleInputChange}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="published-toggle" style={{ cursor: 'pointer', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500 }}>
            Publish immediately (visible to residents on discovery page)
          </label>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
          >
            {loading ? 'Saving Event...' : isEdit ? '💾 Save Changes' : '🚀 Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OrganizerEventForm;