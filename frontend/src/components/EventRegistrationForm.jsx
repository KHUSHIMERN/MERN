import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function EventRegistrationForm({ selectedEvent, onClose }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    ticketType: 'standard',
    attendees: 1,
    notes: '',
    agreeTerms: false,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const eventTitle = selectedEvent?.itemKey
    ? t(`events.items.${selectedEvent.itemKey}.title`)
    : selectedEvent?.title;
  const eventLocation = selectedEvent?.itemKey
    ? t(`events.items.${selectedEvent.itemKey}.location`)
    : selectedEvent?.location;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setErrorMsg(t('form.requiredFieldsError', 'Please fill in all required fields.'));
      return;
    }
    if (!formData.agreeTerms) {
      setErrorMsg(t('form.agreeTermsError', 'You must agree to the terms to proceed.'));
      return;
    }

    setErrorMsg('');
    setIsSubmitted(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{t('form.title', 'Register for Event')}</h2>
            {selectedEvent && (
              <p className="modal-subtitle">
                {eventTitle} ({eventLocation})
              </p>
            )}
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {isSubmitted ? (
          <div className="form-success-box">
            <div className="success-icon">🎉</div>
            <p className="success-text">{t('form.successMsg', 'Registration successful! Confirmation details sent to your email.')}</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              {t('form.okBtn', 'OK')}
            </button>
          </div>
        ) : (
          <form className="registration-form" onSubmit={handleSubmit}>
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                {t('form.fullName', 'Full Name')} *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="form-input"
                placeholder={t('form.fullNamePlaceholder', 'Enter your full name')}
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t('form.email', 'Email Address')} *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder={t('form.emailPlaceholder', 'name@example.com')}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group half-width">
                <label htmlFor="ticketType" className="form-label">
                  {t('form.ticketType', 'Ticket Category')}
                </label>
                <select
                  id="ticketType"
                  name="ticketType"
                  className="form-select"
                  value={formData.ticketType}
                  onChange={handleChange}
                >
                  <option value="standard">{t('form.ticketTypes.standard', 'Standard Pass (Free)')}</option>
                  <option value="vip">{t('form.ticketTypes.vip', 'VIP Pass ($15)')}</option>
                  <option value="student">{t('form.ticketTypes.student', 'Student Pass (Free with ID)')}</option>
                </select>
              </div>

              <div className="form-group half-width">
                <label htmlFor="attendees" className="form-label">
                  {t('form.attendees', 'Number of Attendees')}
                </label>
                <input
                  type="number"
                  id="attendees"
                  name="attendees"
                  min="1"
                  max="10"
                  className="form-input"
                  value={formData.attendees}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                {t('form.notes', 'Special Requests / Notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                className="form-textarea"
                placeholder={t('form.notesPlaceholder', 'Dietary requirements, accessibility needs, etc.')}
                value={formData.notes}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className="form-checkbox-group">
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                className="form-checkbox"
                checked={formData.agreeTerms}
                onChange={handleChange}
                required
              />
              <label htmlFor="agreeTerms" className="checkbox-label">
                {t('form.agreeTerms', 'I agree to the event terms and community code of conduct')}
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t('form.cancelBtn', 'Cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {t('form.submitBtn', 'Confirm Registration')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EventRegistrationForm;
