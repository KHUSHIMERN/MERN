# Event Image Alt Text Guidelines for Contributors

## Overview
Accessible alt text (alternative text) ensures that visually impaired community members using screen readers can fully understand the content, context, and purpose of event images and banners on our portal.

Adhering to these guidelines helps maintain **WCAG 2.1 Level AA Compliance (Success Criterion 1.1.1 Non-Text Content)**.

---

## 1. Image Classification: Informative vs. Decorative

Before writing alt text, determine the image's role:

| Image Role | Definition | Required Alt Attribute |
| :--- | :--- | :--- |
| **Informative Event Image** | Banner, poster, photo, or graphic representing a specific event. Contains visual context relevant to attendees. | Descriptive `alt="..."` text (e.g. `alt="Recruiters talking with youth job seekers at Rajasthan Job Fair"`). |
| **Decorative Asset / Icon** | Background graphics, UI icons (e.g., search icon, clock icon), visual spacers. | Empty alt `alt=""` or `aria-hidden="true"` so screen readers bypass it. |

---

## 2. Best Practices for Writing Event Alt Text

### ✅ Do:
1. **Be Specific & Succinct**: Aim for 1 to 2 concise sentences (under 125 characters).
2. **Describe Subject & Action**: State who or what is pictured and what is happening (e.g., *"Keynote speaker addressing an audience at European micro-entrepreneurship conference"*).
3. **Include Important Text Overlay Info**: If an event image poster has text embedded inside the graphic, summarize key text details in the alt text (or ensure it is present in the event title/description).
4. **Use Multilingual Support**: If an event has a Hindi title or description, provide Hindi alt text in the `imageUrlAlt_hi` field when available.

### ❌ Don't:
1. **Don't use generic placeholder phrases**: Avoid starting with *"Image of..."*, *"Photo of..."*, or *"Graphic showing..."*. Screen readers already announce images.
2. **Don't repeat the exact event title alone**: Provide visual context rather than just repeating the title (e.g. instead of `alt="Job Fair"`, write `alt="Crowd of young job seekers interacting with recruiters at Jaipur Job Fair booths"`).
3. **Don't stuff keywords**: Avoid lists of tags or keywords in alt text.

---

## 3. Examples of Good vs. Bad Alt Text

| Event Category | Bad Alt Text ❌ | Good Alt Text ✅ |
| :--- | :--- | :--- |
| **Career / Job Fair** | `image1.jpg` or `Job Fair` | `Crowd of young job seekers interacting with recruiters at Rajasthan youth job fair booths` |
| **Tech Workshop** | `Photo of screen` | `Developer presenting AI integration code on a large screen to virtual workshop attendees` |
| **Health Drive** | `Blood drive poster` | `Medical volunteers assisting donors at community health and blood donation registration desk` |
| **Cultural Festival** | `Festival` | `Folk dancers performing in traditional colorful attire on stage at Patna festival` |

---

## 4. Contributor Submission Checklist

When posting a new event or uploading an event image banner:

- [ ] Ensure the **Image URL** (`imageUrl`) links to a valid image file (JPEG, PNG, WebP).
- [ ] Provide meaningful **Image Alt Text** (`imageUrlAlt`) describing the image content.
- [ ] Verify that alt text length is under 150 characters and free of "image of" phrases.
- [ ] Verify decorative icons in UI code carry `aria-hidden="true"`.
