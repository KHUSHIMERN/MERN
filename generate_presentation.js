const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Task Presentation Generator...');

// 1. Defined tasks metadata from git history & development logs
const tasksData = [
  {
    id: 'PRJ-8098-0021',
    title: 'Frontend Initialization & Multilingual (i18n) Support',
    category: 'Frontend Core & i18n',
    author: 'arpitaKumari08 & rajputarushi874-max',
    date: '2026-07-22',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Initialized React + Vite framework, set up i18next supporting English (en), Hindi (hi), and Kannada (kn), and built core layout components.',
    keyDeliverables: [
      'Configured Vite build setup and React app entry point (App.jsx, main.jsx)',
      'Implemented I18nProvider.jsx, LanguageSelector.jsx, and i18n.js configuration',
      'Created component primitives: Header, Footer, HeroSection, EventList, EventRegistrationForm',
      'Established core design tokens and responsive CSS stylesheet (App.css)'
    ],
    filesChanged: [
      'frontend/src/i18n.js',
      'frontend/src/components/I18nProvider.jsx',
      'frontend/src/components/LanguageSelector.jsx',
      'frontend/src/components/EventList.jsx',
      'frontend/src/components/EventRegistrationForm.jsx',
      'frontend/src/App.css',
      'frontend/public/locales/en.json',
      'frontend/public/locales/hi.json',
      'frontend/public/locales/kn.json'
    ],
    metrics: { files: 29, insertions: '3,836 lines' },
    speakerNotes: 'Highlight the speed of setting up full internationalization for three languages right at project launch, enabling broad user accessibility from day 1.'
  },
  {
    id: 'PRJ-8098-0022',
    title: 'Event Catalog & Internationalized UI Refinements',
    category: 'UI & Localization',
    author: 'arpitaKumari08',
    date: '2026-07-22',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Expanded localized dictionaries and enhanced EventList component with dynamic category filtering and multilingual support.',
    keyDeliverables: [
      'Added structured translation keys for event categories, dates, and action buttons across EN, HI, KN',
      'Refactored EventList.jsx for dynamic category filtering and state management',
      'Ensured seamless fallback handling for localized event descriptions',
      'Improved layout responsiveness across mobile and desktop breakpoints'
    ],
    filesChanged: [
      'frontend/public/locales/en.json',
      'frontend/public/locales/hi.json',
      'frontend/public/locales/kn.json',
      'frontend/src/components/EventList.jsx',
      'frontend/src/components/EventRegistrationForm.jsx'
    ],
    metrics: { files: 5, insertions: '122 lines' },
    speakerNotes: 'Point out how localized dictionaries keep UI clean and decoupled from business logic while maintaining zero-overhead filtering.'
  },
  {
    id: 'PRJ-8098-0023',
    title: 'Form Validation & Fallback Test Architecture',
    category: 'Frontend Architecture',
    author: 'arpitaKumari08',
    date: '2026-07-23',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Enhanced input validation in registration forms and created a FallbackTestDemo component to guarantee locale safety.',
    keyDeliverables: [
      'Added strict email, phone, and ticket count validation in EventRegistrationForm.jsx',
      'Created FallbackTestDemo.jsx component for runtime translation fallback testing',
      'Refined language dropdown selector with native language indicators',
      'Integrated user registration feedback toasts and error state styling'
    ],
    filesChanged: [
      'frontend/src/components/EventRegistrationForm.jsx',
      'frontend/src/components/FallbackTestDemo.jsx',
      'frontend/src/components/LanguageSelector.jsx',
      'frontend/public/locales/*.json'
    ],
    metrics: { files: 7, insertions: '50 lines' },
    speakerNotes: 'Emphasize reliability: defensive translation fallback guarantees no missing UI strings ever break the presentation to end users.'
  },
  {
    id: 'PRJ-8098-0029',
    title: 'Authentication & Security Infrastructure',
    category: 'Backend & Security',
    author: 'rajputarushi874-max',
    date: '2026-07-22',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Built backend authentication services, User schema with password hashing, and login/register API endpoints.',
    keyDeliverables: [
      'Created Mongoose User.js model with bcrypt password encryption',
      'Built authentication API endpoints in authRoutes.js / auth.js for Register, Login, and Password Reset',
      'Configured JWT token generation and verification logic',
      'Developed standalone automated test script test-auth-flow.js for end-to-end validation'
    ],
    filesChanged: [
      'backend/src/models/User.js',
      'backend/src/routes/authRoutes.js',
      'backend/src/server.js',
      'backend/src/utils/emailService.js',
      'backend/test-auth-flow.js'
    ],
    metrics: { files: 21, insertions: '4,216 lines' },
    speakerNotes: 'Focus on security standard compliance: salted bcrypt password hashing, stateless JWT session handling, and automated integration test coverage.'
  },
  {
    id: 'PRJ-8098-0030',
    title: 'Backend Core Architecture & Event/Recommendation API',
    category: 'Backend & Database',
    author: 'rajputarushi874-max',
    date: '2026-07-24',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Architected complete Express application layer, Event endpoints, Recommendation algorithms, seed scripts, and auth middleware.',
    keyDeliverables: [
      'Constructed modular Express server with MongoDB connection pool (config/db.js)',
      'Created Event.js schema and CRUD API endpoints (routes/events.js)',
      'Implemented intelligent recommendation system (routes/recommendations.js) matching events with user interests',
      'Built database seeder script (seed.js) and email notification utility (emailService.js)'
    ],
    filesChanged: [
      'backend/server.js',
      'backend/config/db.js',
      'backend/models/Event.js',
      'backend/routes/events.js',
      'backend/routes/recommendations.js',
      'backend/seed.js',
      'backend/utils/emailService.js'
    ],
    metrics: { files: 13, insertions: '3,180 lines' },
    speakerNotes: 'Highlight the recommendation engine which provides algorithmic event discovery tailored to registered user preferences.'
  },
  {
    id: 'PRJ-8098-0053',
    title: 'User Profile Management & Dynamic Auth Context',
    category: 'Full-Stack Integration',
    author: 'rajputarushi874-max',
    date: '2026-07-24',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Created dynamic React AuthContext state provider and rich ProfilePage component for managing user credentials and registered events.',
    keyDeliverables: [
      'Built React AuthContext.jsx for persistent user state management and local storage syncing',
      'Designed feature-rich ProfilePage.jsx supporting profile edits, avatar updates, and registration history',
      'Protected sensitive routes with dynamic authentication guards',
      'Executed backend end-to-end integration tests (test-profile-flow.js)'
    ],
    filesChanged: [
      'frontend/src/context/AuthContext.jsx',
      'frontend/src/components/ProfilePage.jsx',
      'frontend/src/App.jsx',
      'backend/test-profile-flow.js'
    ],
    metrics: { files: 13, insertions: '1,437 lines' },
    speakerNotes: 'Demonstrate how AuthContext unifies state management across all pages, allowing seamless transition from public guest mode to authenticated user dashboard.'
  },
  {
    id: 'PRJ-8098-0054',
    title: 'Role-Based Access Control (RBAC) & Request Workflows',
    category: 'Backend Security & Roles',
    author: 'rajputarushi874-max',
    date: '2026-07-24',
    duration: '1h',
    status: 'Completed & Reviewed',
    summary: 'Implemented role elevation request model (User -> Organizer/Admin) and approval endpoints with security checks.',
    keyDeliverables: [
      'Designed Mongoose RoleRequest.js schema for role promotion requests',
      'Created roleRoutes.js and userRoutes.js endpoints for submitting, reviewing, approving, and rejecting role requests',
      'Added strict authorization middleware checking user role permissions',
      'Verified workflow with extended test-profile-flow.js test cases'
    ],
    filesChanged: [
      'backend/models/RoleRequest.js',
      'backend/routes/roleRoutes.js',
      'backend/routes/userRoutes.js',
      'backend/server.js',
      'backend/test-profile-flow.js'
    ],
    metrics: { files: 6, insertions: '267 lines' },
    speakerNotes: 'Explain the enterprise security model: users cannot self-promote to Admin/Organizer without an auditable approval workflow.'
  },
  {
    id: 'PRJ-8098-0055 & 0056',
    title: 'System Integration, Conflict Resolution & Build Verification',
    category: 'DevOps & Quality Assurance',
    author: 'rajputarushi874-max & Amrita Kumari',
    date: '2026-07-28',
    duration: '1h',
    status: 'Completed & Merged',
    summary: 'Merged feature branches (DEV-AMRITA, origin/QA), resolved complex file conflicts, and verified clean frontend production builds.',
    keyDeliverables: [
      'Merged pull requests and resolved multi-file git merge conflicts',
      'Synchronized frontend components with backend API specifications',
      'Validated end-to-end authentication, role request, and event registration flows',
      'Executed production build step (vite build) confirming 0 errors'
    ],
    filesChanged: [
      'Merged PR #1 from KHUSHIMERN/DEV-AMRITA into QA',
      'Resolved merge conflicts in App.jsx, AuthContext.jsx, EventList.jsx, ProfilePage.jsx'
    ],
    metrics: { files: 'All modules', insertions: 'Full sync' },
    speakerNotes: 'Conclude with build readiness: all branch lines are merged cleanly, conflict-free, and production-tested.'
  }
];

// Calculate summary stats
const totalTasks = tasksData.length;

// Build HTML presentation file
const generateHTML = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Accomplishments & Completed Tasks Presentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: radial-gradient(circle at 15% 15%, #1e1b4b 0%, #0f172a 50%, #020617 100%);
      --card-bg: rgba(30, 41, 59, 0.65);
      --card-border: rgba(255, 255, 255, 0.1);
      --card-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      --accent-purple: #8b5cf6;
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-main);
      min-height: 100vh;
      overflow: hidden;
      user-select: none;
    }

    /* Presentation Header & Controls */
    .app-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 64px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      z-index: 100;
    }

    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 1.25rem;
      background: linear-gradient(135deg, #a78bfa, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-purple), #6366f1);
      border: none;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #9333ea, #4f46e5);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
    }

    /* Main Container & Slide Stage */
    .deck-container {
      position: absolute;
      top: 64px;
      bottom: 72px;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }

    .slide {
      position: absolute;
      width: 100%;
      max-width: 1100px;
      height: 100%;
      max-height: 660px;
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 48px;
      box-shadow: var(--card-shadow);
      opacity: 0;
      transform: scale(0.96) translateY(20px);
      pointer-events: none;
      transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow-y: auto;
    }

    .slide.active {
      opacity: 1;
      transform: scale(1) translateY(0);
      pointer-events: auto;
    }

    /* Slide Typography & Elements */
    .slide-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      color: #c084fc;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
      width: fit-content;
    }

    .slide-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 16px;
      color: #ffffff;
    }

    .slide-subtitle {
      font-size: 1.1rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .meta-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 18px;
    }

    .meta-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 4px;
    }

    .meta-value {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-main);
    }

    /* Content Layout Grids */
    .content-split {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 32px;
      flex: 1;
    }

    .deliverables-box h4, .files-box h4 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      font-weight: 600;
      color: #38bdf8;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .deliverables-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .deliverables-list li {
      position: relative;
      padding-left: 24px;
      font-size: 0.95rem;
      color: var(--text-main);
      line-height: 1.5;
    }

    .deliverables-list li::before {
      content: '✓';
      position: absolute;
      left: 0;
      top: 0;
      color: var(--accent-emerald);
      font-weight: bold;
    }

    .file-tag-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .file-tag {
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 6px;
      color: #7dd3fc;
      max-width: 100%;
      word-break: break-all;
    }

    /* Speaker Notes Bar */
    .notes-box {
      margin-top: auto;
      padding: 14px 20px;
      background: rgba(139, 92, 246, 0.08);
      border-left: 4px solid var(--accent-purple);
      border-radius: 0 12px 12px 0;
      font-size: 0.875rem;
      color: #d8b4fe;
      font-style: italic;
    }

    /* Stats Grid for Slide 2 */
    .stats-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 32px 0;
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      border-color: rgba(139, 92, 246, 0.4);
    }

    .stat-num {
      font-family: 'Outfit', sans-serif;
      font-size: 2.75rem;
      font-weight: 800;
      background: linear-gradient(135deg, #38bdf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }

    .stat-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Bottom Navigation Bar */
    .app-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 72px;
      padding: 0 32px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .slide-progress {
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
      color: var(--text-muted);
      min-width: 80px;
      text-align: center;
    }

    .progress-bar-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.1);
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-purple), var(--accent-cyan));
      width: 0%;
      transition: width 0.3s ease;
    }

    /* Slide Thumbnails Drawer */
    .drawer {
      position: fixed;
      bottom: 72px;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(20px);
      border-top: 1px solid var(--card-border);
      padding: 20px 32px;
      display: flex;
      gap: 16px;
      overflow-x: auto;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 90;
    }

    .drawer.open {
      transform: translateY(0);
    }

    .thumb {
      min-width: 160px;
      height: 90px;
      background: var(--card-bg);
      border: 2px solid transparent;
      border-radius: 10px;
      padding: 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }

    .thumb:hover {
      border-color: var(--accent-cyan);
      transform: scale(1.05);
    }

    .thumb.active {
      border-color: var(--accent-purple);
      background: rgba(139, 92, 246, 0.2);
    }

    .thumb-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--accent-cyan);
    }

    .thumb-title {
      font-size: 0.75rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media print {
      body {
        overflow: visible !important;
        background: #0f172a !important;
      }
      .app-header, .app-footer, .drawer {
        display: none !important;
      }
      .deck-container {
        position: static !important;
        display: block !important;
        padding: 0 !important;
      }
      .slide {
        position: relative !important;
        opacity: 1 !important;
        transform: none !important;
        page-break-after: always;
        margin-bottom: 40px !important;
        max-width: 100% !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <header class="app-header">
    <div class="brand-title">
      <span>⚡</span> Completed Tasks Executive Presentation
    </div>
    <div class="header-actions">
      <button class="btn" id="btn-toggle-notes" onclick="toggleNotes()">📝 Speaker Notes</button>
      <button class="btn" id="btn-toggle-grid" onclick="toggleDrawer()">🗂️ All Slides</button>
      <button class="btn" onclick="window.print()">🖨️ Export PDF</button>
      <button class="btn btn-primary" onclick="toggleFullscreen()">⛶ Fullscreen</button>
    </div>
  </header>

  <!-- Slide Stage -->
  <main class="deck-container">
    <!-- Slide 1: Title Slide -->
    <section class="slide active" id="slide-0">
      <div>
        <div class="slide-badge">Executive Project Showcase</div>
        <h1 class="slide-title" style="font-size: 3rem; margin-top: 16px;">MERN Stack Full-Application Completed Tasks & Technical Milestones</h1>
        <p class="slide-subtitle" style="font-size: 1.25rem;">Comprehensive walkthrough of all development tickets, backend APIs, localized frontend components, and integration workflows completed for the platform.</p>
      </div>

      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-num">${totalTasks}</div>
          <div class="stat-desc">Completed Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">3</div>
          <div class="stat-desc">Languages (EN, HI, KN)</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">12+</div>
          <div class="stat-desc">API Endpoints</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">100%</div>
          <div class="stat-desc">Build Verification</div>
        </div>
      </div>

      <div class="notes-box">
        <strong>Speaker Note:</strong> Welcome everyone. Today we are presenting a full breakdown of all engineering tasks completed across the frontend React client, Express/Node backend, Mongoose database models, internationalization engine, and access control workflows.
      </div>
    </section>

    <!-- Slide 2: Metrics Overview -->
    <section class="slide" id="slide-1">
      <div>
        <div class="slide-badge">Project Health & Stats</div>
        <h2 class="slide-title">System Architecture & Engineering Impact</h2>
        <p class="slide-subtitle">Key metrics and high-level summary of code contributions and architectural pillars.</p>
      </div>

      <div class="content-split">
        <div class="deliverables-box">
          <h4>Core Architectural Pillars Delivered</h4>
          <ul class="deliverables-list">
            <li><strong>Frontend Internationalization (i18n):</strong> Complete multi-language system with dynamic language switching (English, Hindi, Kannada) and fallback protection.</li>
            <li><strong>Authentication & Security:</strong> JWT stateless session management, bcrypt password hashing, and user profile management.</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Audit-ready role elevation workflow (User to Organizer / Admin) with admin approval routes.</li>
            <li><strong>Event Engine & Recommendations:</strong> Full event CRUD endpoints with preference-based recommendation engine.</li>
            <li><strong>DevOps & Branch Integration:</strong> Multi-author git conflict resolution and clean production bundle validation.</li>
          </ul>
        </div>
        <div class="files-box">
          <h4>Tech Stack Breakdown</h4>
          <div class="file-tag-container" style="gap: 12px;">
            <span class="file-tag" style="font-size: 0.9rem; padding: 10px 16px;">React 18 + Vite</span>
            <span class="file-tag" style="font-size: 0.9rem; padding: 10px 16px;">Node.js / Express</span>
            <span class="file-tag" style="font-size: 0.9rem; padding: 10px 16px;">MongoDB / Mongoose</span>
            <span class="file-tag" style="font-size: 0.9rem; padding: 10px 16px;">i18next & react-i18next</span>
            <span class="file-tag" style="font-size: 0.9rem; padding: 10px 16px;">JWT & Bcrypt</span>
            <span class="file-tag" style="font-size: 0.9rem; padding: 10px 16px;">Nodemailer</span>
          </div>
        </div>
      </div>

      <div class="notes-box">
        <strong>Speaker Note:</strong> This overview highlights how our full-stack MERN architecture was structured modularly, ensuring high maintainability and security across both client and server domains.
      </div>
    </section>

    <!-- Task Slides -->
    ${tasksData.map((task, idx) => `
    <section class="slide" id="slide-${idx + 2}">
      <div>
        <div class="slide-badge">${task.id} &bull; ${task.category}</div>
        <h2 class="slide-title">${task.title}</h2>
        <p class="slide-subtitle">${task.summary}</p>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Ticket ID</div>
          <div class="meta-value">${task.id}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Author / Engineer</div>
          <div class="meta-value">${task.author}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Completion Date</div>
          <div class="meta-value">${task.date}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Status</div>
          <div class="meta-value" style="color: var(--accent-emerald);">${task.status}</div>
        </div>
      </div>

      <div class="content-split">
        <div class="deliverables-box">
          <h4>Key Technical Deliverables</h4>
          <ul class="deliverables-list">
            ${task.keyDeliverables.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>
        <div class="files-box">
          <h4>Files Modified / Created</h4>
          <div class="file-tag-container">
            ${task.filesChanged.map(f => `<span class="file-tag">${f}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="notes-box">
        <strong>Speaker Note:</strong> ${task.speakerNotes}
      </div>
    </section>
    `).join('')}

    <!-- Final Summary Slide -->
    <section class="slide" id="slide-${tasksData.length + 2}">
      <div>
        <div class="slide-badge">Conclusion & Future Steps</div>
        <h2 class="slide-title">Summary of Completed Work & Next Horizons</h2>
        <p class="slide-subtitle">All assigned tasks have been executed, merged, and verified with zero compilation errors.</p>
      </div>

      <div class="content-split">
        <div class="deliverables-box">
          <h4>Key Milestones Achieved</h4>
          <ul class="deliverables-list">
            <li><strong>Full-Stack Alignment:</strong> Client and server modules communicate reliably with unified data contracts.</li>
            <li><strong>Production Verification:</strong> Confirmed error-free production build (vite build) and clean test suites.</li>
            <li><strong>Localization Ready:</strong> English, Hindi, and Kannada translation layers fully tested.</li>
            <li><strong>Enterprise RBAC:</strong> Request & approval workflow ready for production deployment.</li>
          </ul>
        </div>
        <div class="deliverables-box">
          <h4>Recommended Next Steps</h4>
          <ul class="deliverables-list">
            <li>Deploy production build to cloud hosting (e.g. AWS / Vercel / Render).</li>
            <li>Enable CI/CD pipeline automated regression testing on new pull requests.</li>
            <li>Integrate analytics for real-time tracking of localized event registrations.</li>
          </ul>
        </div>
      </div>

      <div class="notes-box">
        <strong>Speaker Note:</strong> Thank you! The application is fully prepared for demonstration and production deployment. We can now take questions.
      </div>
    </section>
  </main>

  <!-- Slide Drawer -->
  <div class="drawer" id="slide-drawer">
    <div class="thumb active" onclick="goToSlide(0)">
      <div class="thumb-num">Slide 1</div>
      <div class="thumb-title">Title & Overview</div>
    </div>
    <div class="thumb" onclick="goToSlide(1)">
      <div class="thumb-num">Slide 2</div>
      <div class="thumb-title">System Metrics</div>
    </div>
    ${tasksData.map((task, idx) => `
    <div class="thumb" onclick="goToSlide(${idx + 2})">
      <div class="thumb-num">Slide ${idx + 3}</div>
      <div class="thumb-title">${task.id}</div>
    </div>
    `).join('')}
    <div class="thumb" onclick="goToSlide(${tasksData.length + 2})">
      <div class="thumb-num">Slide ${tasksData.length + 3}</div>
      <div class="thumb-title">Conclusion</div>
    </div>
  </div>

  <!-- Footer Navigation -->
  <footer class="app-footer">
    <div class="progress-bar-container">
      <div class="progress-bar-fill" id="progress-bar"></div>
    </div>

    <div class="nav-controls">
      <button class="btn" onclick="prevSlide()">❮ Previous</button>
      <button class="btn" onclick="nextSlide()">Next ❯</button>
    </div>

    <div class="slide-progress" id="slide-counter">
      Slide 1 / ${tasksData.length + 3}
    </div>

    <div style="font-size: 0.85rem; color: var(--text-dim);">
      Use <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">←</kbd> <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">→</kbd> Arrow Keys to Navigate
    </div>
  </footer>

  <script>
    let currentSlide = 0;
    const totalSlides = ${tasksData.length + 3};

    function updateSlide() {
      document.querySelectorAll('.slide').forEach((slide, index) => {
        if (index === currentSlide) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      document.querySelectorAll('.thumb').forEach((thumb, index) => {
        if (index === currentSlide) {
          thumb.classList.add('active');
        } else {
          thumb.classList.remove('active');
        }
      });

      document.getElementById('slide-counter').innerText = 'Slide ' + (currentSlide + 1) + ' / ' + totalSlides;
      const progressPercent = ((currentSlide + 1) / totalSlides) * 100;
      document.getElementById('progress-bar').style.width = progressPercent + '%';
    }

    function nextSlide() {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlide();
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateSlide();
      }
    }

    function goToSlide(index) {
      currentSlide = index;
      updateSlide();
      document.getElementById('slide-drawer').classList.remove('open');
    }

    function toggleDrawer() {
      document.getElementById('slide-drawer').classList.toggle('open');
    }

    function toggleNotes() {
      document.querySelectorAll('.notes-box').forEach(el => {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
      });
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    });

    updateSlide();
  </script>
</body>
</html>`;
};

// Write output presentation file
const outputPath = path.join(__dirname, 'presentation.html');
fs.writeFileSync(outputPath, generateHTML(), 'utf8');

console.log('✅ Success! Presentation deck generated successfully.');
console.log('📍 File path: ' + outputPath);
console.log('💡 You can open this file in any web browser or press Export to PDF!');
