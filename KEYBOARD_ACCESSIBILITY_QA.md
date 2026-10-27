# ⌨️ Keyboard Accessibility QA Checklist & Tester Guide

This document outlines the **Keyboard-Only Navigation QA Checklist**, step-by-step reproduction instructions for testers, and a log of resolved accessibility issues.

---

## 📋 1. Keyboard Navigation QA Checklist

| Checklist Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **Skip-to-Content Link** | The very first `Tab` press must reveal a visible "Skip to main content" link that moves focus directly to `<main id="main-content">`. | Press `Tab` on page load. Ensure skip button appears top-left and pressing `Enter` moves focus to main section. | ✅ PASS |
| **Logical Tab Sequence** | Navigation follows visual reading order (`Header` ➔ `Hero` / `Controls` ➔ `Event Cards` ➔ `Check-in Desk` ➔ `Footer`). | Press `Tab` repeatedly. Focus should advance predictably without skipping controls or getting stuck. | ✅ PASS |
| **Semantic Interactive Controls** | All clickable elements (`links`, `buttons`, `inputs`, `selects`) use native HTML5 tags and operate via `Enter` / `Space`. | Verify no non-interactive `<div>` or `<span>` containers are used for buttons without semantic tags. | ✅ PASS |
| **Modal Focus Trap** | When a modal opens (e.g., Event Registration), focus is captured inside and `Tab` / `Shift+Tab` wraps between modal controls. | Open modal. Press `Tab` repeatedly; focus must NOT leak to background page. | ✅ PASS |
| **Modal Keyboard Dismissal** | Pressing the `Escape` key closes open modals or expanded dropdown menus. | Open modal or mobile nav menu and press `Escape`. Overlay should close. | ✅ PASS |
| **Focus Restoration** | Closing a modal/menu returns keyboard focus back to the triggering opener button. | Open modal from "Register Event" button, press `Escape` or "Cancel". Focus must land back on "Register Event". | ✅ PASS |
| **Visible Focus Outlines** | Every focused element displays a high-contrast focus indicator (`:focus-visible`). | Tab through all buttons, form fields, and dropdowns. Check for bright primary ring (`outline: 2px solid #6366f1`). | ✅ PASS |

---

## 🧪 2. Tester Guide: Steps to Reproduce Manual Keyboard QA

### Key Combination Shortcuts
- **`Tab`**: Advance focus to next interactive control.
- **`Shift + Tab`**: Move focus backward to previous interactive control.
- **`Enter` / `Space`**: Activate buttons, submit forms, or toggle controls.
- **`Escape`**: Dismiss modals or mobile navigation menus.

---

### Step-by-Step QA Walkthrough

#### Test Case A: Skip-to-Content & Header Navigation
1. Open the application homepage (`http://localhost:5173` or `http://localhost:5000`).
2. Press **`Tab`** once immediately after page load.
   - **Expected:** A purple "Skip to main content" button slides down into view at the top-left of the viewport.
3. Press **`Enter`**.
   - **Expected:** Focus skips header links and lands directly inside the main content area (`<main id="main-content">`).
4. Press **`Shift + Tab`** to return to Header.
5. Tab through the Brand button (`EventPulse`), Nav links (`Events`, `Check-in Desk`, `Register Event`, `Fallback Demo`), and Language switcher buttons (`EN`, `HI`, `KN`).
   - **Expected:** Each item shows a glowing high-contrast focus outline ring.

#### Test Case B: Event Registration Modal Focus Trapping & Restoration
1. Press **`Tab`** to focus the **"+ Register Event"** button in the header.
2. Press **`Enter`** to open the modal form.
   - **Expected:** Focus automatically moves inside the modal container to the **Full Name** input field (`#fullName`).
3. Press **`Tab`** repeatedly through all form fields (Name ➔ Email ➔ Ticket Category ➔ Attendees ➔ Notes ➔ Agreement Checkbox ➔ Cancel Button ➔ Confirm Button ➔ Close Button).
   - **Expected:** Tabbing from the Close button loops focus back to the Full Name input field. Focus **NEVER** escapes to the background page.
4. Press **`Escape`** (or tab to Cancel and press **`Enter`**).
   - **Expected:** Modal closes and focus is automatically restored back to the **"+ Register Event"** header button.

#### Test Case C: Organizer Check-in Desk Accessibility
1. Navigate to the **"Check-in Desk"** tab using keyboard (`Tab` + `Enter`).
2. Tab through role buttons (`Organizer` / `Attendee`), Event selector dropdown, and search field.
3. Type a query in the search field (e.g. `Priya`), then press **`Tab`** to focus the clear search `✕` button.
   - **Expected:** Screen readers announce *"Clear search input, button"*.
4. Tab to the **"📜 View Audit Trail"** button and press **`Enter`**.
   - **Expected:** The audit panel opens (`aria-expanded="true"`), and pressing `Escape` or tabbing to `✕ Close` dismisses the panel.
5. Tab to any attendee check-in row and press **`Space`** on the status button (`Mark Present` / `Mark Absent`).
   - **Expected:** Attendance status toggles instantly and updates screen reader state (`aria-pressed`).

---

## 🐛 3. Log of Logged & Resolved Keyboard Accessibility Issues

### Issue 1: Icon-Only Clear Search Buttons Lacked Screen Reader Labels
- **Component(s):** [OrganizerCheckIn.jsx](file:///C:/MERN/frontend/src/components/OrganizerCheckIn.jsx#L621-L630), [EventList.jsx](file:///C:/MERN/frontend/src/components/EventList.jsx#L80-L87)
- **Description:** The clear search `✕` buttons were rendered as icon-only buttons without an `aria-label`. Keyboard users and screen readers read the raw character `✕` without context.
- **Fix Applied:** Added `aria-label="Clear search input"` to both search clear buttons.

---

### Issue 2: Audit Trail Panel Toggle Lacked ARIA Expanded State & Keyboard Close Region
- **Component(s):** [OrganizerCheckIn.jsx](file:///C:/MERN/frontend/src/components/OrganizerCheckIn.jsx#L532-L540), [OrganizerCheckIn.jsx](file:///C:/MERN/frontend/src/components/OrganizerCheckIn.jsx#L916-L925)
- **Description:** The audit trail toggle button didn't communicate whether the audit panel was expanded or collapsed, and the audit panel container lacked a landmark region role.
- **Fix Applied:** Added `aria-expanded={showAuditLogs}`, `aria-controls="audit-log-panel"`, `role="region"`, `aria-label="Event Audit Trail"`, and `aria-label="Close audit log panel"`.

---

### Issue 3: Table Action Check-in Toggle Buttons Lacked `aria-pressed` & Contextual Labels
- **Component(s):** [OrganizerCheckIn.jsx](file:///C:/MERN/frontend/src/components/OrganizerCheckIn.jsx#L839-L845)
- **Description:** Toggling an attendee's present/absent status via keyboard did not announce the target attendee's name or toggle state (`aria-pressed`).
- **Fix Applied:** Added `aria-pressed={isPresent}` and contextual `aria-label={`Mark ${record.fullName} as ${isPresent ? 'Absent' : 'Present'}`}` to row action buttons.

---

## 🏗️ Build Verification
- **Command:** `cmd /c npm run build`
- **Result:** Successfully compiled 58 modules in Vite build with 0 errors.
