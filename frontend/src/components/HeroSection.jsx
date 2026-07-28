import React from 'react';
import { useTranslation } from 'react-i18next';

export function HeroSection({ onExplore, onRegister }) {
  const { t } = useTranslation();

  return (
    <section className="hero-section">
      <div className="hero-background-glow"></div>
      <div className="hero-content">
        <span className="hero-badge">{t('hero.badge', '✨ Connecting Communities Across Karnataka')}</span>
        <h1 className="hero-title">{t('hero.title', 'Discover Amazing Community Events Near You')}</h1>
        <p className="hero-subtitle">
          {t('hero.subtitle', 'Join workshops, cultural festivals, tech meetups, and charity drives happening in your city.')}
        </p>

        <div className="hero-actions">
          <button type="button" className="btn-primary hero-btn" onClick={onExplore}>
            🔍 {t('hero.exploreBtn', 'Explore Events')}
          </button>
          <button type="button" className="btn-secondary hero-btn" onClick={onRegister}>
            ✏️ {t('hero.createBtn', 'Register Event')}
          </button>
        </div>

        <div className="hero-stats-grid">
          <div className="stat-card">
            <span className="stat-number">48+</span>
            <span className="stat-label">{t('hero.stats.activeEvents', 'Active Events')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">12,400+</span>
            <span className="stat-label">{t('hero.stats.totalAttendees', 'Attendees Joined')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">15</span>
            <span className="stat-label">{t('hero.stats.citiesCovered', 'Cities Covered')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
