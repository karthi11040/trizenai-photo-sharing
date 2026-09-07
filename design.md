# Modern Neutral Website Design System

A brand-agnostic design system for building clean, contemporary, accessible web applications. The system is intentionally neutral so it can be adapted to SaaS products, dashboards, portfolios, marketplaces, internal tools, or consumer websites without redesigning the foundation.

---

# 1. Design System

## 1.1 Design principles

The visual language should feel:

* **Modern** — contemporary without chasing trends.
* **Neutral** — brand identity comes from restrained accents rather than excessive decoration.
* **Clear** — typography and spacing establish hierarchy.
* **Confident** — strong layouts, predictable interactions, minimal visual noise.
* **Accessible** — color and interaction states remain understandable without relying on color alone.
* **Responsive** — the same design system should work naturally from mobile to desktop.

A useful visual formula is:

```text
Neutral foundation
+ One primary accent
+ One supporting accent
+ Strong typography
+ Subtle borders
+ Restrained elevation
+ Generous whitespace
```

---

## 1.2 Color palette

Use a near-neutral foundation rather than pure black and pure white.

### Core palette

| Token         | Value     | Use                          |
| ------------- | --------- | ---------------------------- |
| Primary 50    | `#EFF6FF` | Very light accent background |
| Primary 100   | `#DBEAFE` | Hover/background             |
| Primary 500   | `#3B82F6` | Primary actions              |
| Primary 600   | `#2563EB` | Primary hover                |
| Primary 700   | `#1D4ED8` | Active/focus                 |
| Secondary 500 | `#8B5CF6` | Supporting accent            |
| Success 500   | `#16A34A` | Success                      |
| Warning 500   | `#D97706` | Warning                      |
| Danger 500    | `#DC2626` | Error/destructive            |
| Neutral 0     | `#FFFFFF` | Main surface                 |
| Neutral 50    | `#F8FAFC` | Page background              |
| Neutral 100   | `#F1F5F9` | Subtle surfaces              |
| Neutral 200   | `#E2E8F0` | Borders                      |
| Neutral 300   | `#CBD5E1` | Stronger borders             |
| Neutral 500   | `#64748B` | Secondary text               |
| Neutral 700   | `#334155` | Body text                    |
| Neutral 900   | `#0F172A` | Headings                     |

### Recommended semantic tokens

Don't scatter raw hex values throughout the application.

```css
:root {
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-primary-active: #1D4ED8;

  --color-secondary: #8B5CF6;

  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger: #DC2626;

  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1F5F9;

  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;

  --color-text: #0F172A;
  --color-text-secondary: #334155;
  --color-text-muted: #64748B;

  --color-focus: #2563EB;
}
```

### Dark theme

Keep the same semantic structure instead of inventing an entirely different visual system.

```css
[data-theme="dark"] {
  --color-bg: #0B1120;
  --color-surface: #111827;
  --color-surface-muted: #1E293B;

  --color-border: #334155;
  --color-border-strong: #475569;

  --color-text: #F8FAFC;
  --color-text-secondary: #CBD5E1;
  --color-text-muted: #94A3B8;

  --color-primary: #60A5FA;
  --color-primary-hover: #93C5FD;
  --color-primary-active: #BFDBFE;
}
```

---

# 1.3 Typography

Use a highly legible sans-serif.

### Recommended

```text
Inter
```

Fallback:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Type scale

| Token      | Size | Weight | Line height |
| ---------- | ---: | -----: | ----------: |
| Display    | 48px |    700 |         1.1 |
| H1         | 40px |    700 |        1.15 |
| H2         | 32px |    700 |         1.2 |
| H3         | 24px |    600 |        1.25 |
| H4         | 20px |    600 |         1.3 |
| Body Large | 18px |    400 |         1.6 |
| Body       | 16px |    400 |         1.5 |
| Body Small | 14px |    400 |        1.45 |
| Caption    | 12px |    500 |         1.4 |

Example:

```css
.text-display {
  font-size: 3rem;
  line-height: 1.1;
  font-weight: 700;
}

.text-h1 {
  font-size: 2.5rem;
  line-height: 1.15;
  font-weight: 700;
}

.text-body {
  font-size: 1rem;
  line-height: 1.5;
}
```

### Typography rules

Headings should be:

```text
large
compact
high contrast
```

Body content should be:

```text
16px minimum for primary reading
comfortable line height
limited paragraph width
```

Avoid:

* excessive all-caps
* more than two font families
* very light text for essential information
* decorative fonts for functional UI

---

# 1.4 Iconography

Use one consistent icon family.

Recommended:

```text
Lucide
```

or another modern outline icon library.

Style:

```text
stroke-based
rounded
simple
24×24 default
```

Suggested sizes:

```text
12px → tiny metadata
16px → inline icon
20px → buttons
24px → navigation
32px → feature/icon cards
48px+ → empty states
```

Do not mix:

```text
filled icons
outlined icons
3D icons
emoji
```

without a deliberate visual reason.

---

# 1.5 Spacing scale

Use a 4px base system.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

Use smaller spacing for related elements:

```text
Label
  ↓ 4–8px
Input
```

Use larger spacing for hierarchy:

```text
Section
  ↓ 32–64px
Section
```

---

# 1.6 Accessibility contrast

Target **WCAG AA** as the baseline.

For normal-sized text:

```text
Minimum contrast: 4.5:1
```

For large text:

```text
Minimum contrast: 3:1
```

For meaningful UI components and graphical objects:

```text
Target at least 3:1 against adjacent colors
```

Do not communicate state through color alone.

Bad:

```text
● red = failed
● green = passed
```

Better:

```text
✕ Failed
✓ Passed
```

with color supporting the text.

---

# 2. Theme and Branding

## 2.1 Mood

The default visual personality should be:

> **Calm, premium, precise, contemporary and trustworthy.**

Avoid overly playful visual treatments unless the product specifically requires them.

### Visual balance

```text
70% neutral
20% typography/content
10% accent
```

The accent should guide attention rather than dominate the interface.

---

## 2.2 Tone

UI language should be:

```text
clear
helpful
direct
human
```

Instead of:

```text
"ERROR 403: INVALID ACTION"
```

Prefer:

```text
"You don't have permission to perform this action."
```

Instead of:

```text
"SUBMIT"
```

Prefer context:

```text
"Create Event"
"Publish Gallery"
"Save Changes"
```

---

## 2.3 Example brand names

These are placeholders only:

```text
Northline
Clarity
Frame
Mono
Atlas
Nexa
Luma
Vertex
```

The design system should remain usable even after the product name and brand accent change.

---

# 3. Layout and Responsiveness

## 3.1 Global layout

Use:

```text
Header
  ↓
Main content
  ↓
Footer
```

For dashboards:

```text
Header
 ├── Sidebar / Navigation
 └── Main content
```

For public websites:

```text
Header
 ↓
Hero
 ↓
Content sections
 ↓
CTA
 ↓
Footer
```

---

# 3.2 Content width

Use a maximum content width:

```css
--container-max: 1200px;
```

Example:

```css
.container {
  width: min(100% - 32px, 1200px);
  margin-inline: auto;
}
```

For reading-heavy pages:

```text
600–760px
```

For dashboards:

```text
1200–1440px
```

---

# 3.3 Breakpoints

Use practical responsive breakpoints:

```css
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
--bp-2xl: 1536px;
```

### Mobile — `< 640px`

```text
┌──────────────────────┐
│ Logo           Menu  │
├──────────────────────┤
│ Page heading         │
│                      │
│ Full-width card      │
│                      │
│ Full-width card      │
│                      │
│ Full-width button    │
└──────────────────────┘
```

Characteristics:

* hamburger navigation
* 1-column cards
* full-width forms/buttons where appropriate
* reduced horizontal padding
* smaller heading sizes

---

### Tablet — `640–1023px`

```text
┌──────────────────────────────┐
│ Logo   Navigation     Action │
├──────────────────────────────┤
│ Heading                      │
│                              │
│ ┌─────────┐ ┌─────────┐      │
│ │ Card    │ │ Card    │      │
│ └─────────┘ └─────────┘      │
└──────────────────────────────┘
```

Characteristics:

* 2-column cards
* compact navigation
* moderate spacing
* optional collapsed sidebar

---

### Desktop — `1024px+`

```text
┌─────────────────────────────────────────────────────┐
│ Logo         Navigation             Account / CTA  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Heading                                  Actions   │
│                                                     │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ Card   │ │ Card   │ │ Card   │ │ Card   │       │
│ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 4. UI Components

## 4.1 Header

Recommended structure:

```html
<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="brand-name">Northline</span>
    </a>

    <nav class="main-nav" aria-label="Primary navigation">
      <a href="/dashboard/">Dashboard</a>
      <a href="/events/">Events</a>
      <a href="/gallery/">Gallery</a>
    </nav>

    <button
      class="icon-button"
      type="button"
      aria-label="Open navigation menu"
    >
      <!-- icon -->
    </button>
  </div>
</header>
```

---

## 4.2 Footer

Keep the footer visually quiet.

```html
<footer class="site-footer">
  <div class="container footer-inner">
    <p>© 2026 Northline</p>

    <nav aria-label="Footer navigation">
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
    </nav>
  </div>
</footer>
```

---

# 4.3 Cards

Use cards for grouping information, not for everything.

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}
```

### Card anatomy

```text
┌─────────────────────────────┐
│ Eyebrow                     │
│                             │
│ Title                       │
│ Description                 │
│                             │
│ Metadata                    │
│                             │
│ Action                      │
└─────────────────────────────┘
```

---

# 4.4 Buttons

Create a clear hierarchy.

### Primary

```css
.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
```

### Secondary

```css
.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

### Ghost

```css
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}
```

### Danger

```css
.btn-danger {
  background: var(--color-danger);
  color: #fff;
}
```

Minimum practical height:

```text
44px
```

Example:

```css
.btn {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-weight: 600;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    transform 150ms ease;
}
```

Don't make every button primary.

---

# 4.5 Forms

Recommended form hierarchy:

```text
Label
 ↓
Input
 ↓
Helper text / error
```

Example:

```html
<div class="form-field">
  <label for="event-name">Event name</label>

  <input
    id="event-name"
    name="event_name"
    type="text"
    class="input"
    aria-describedby="event-name-help"
  >

  <p id="event-name-help" class="form-help">
    Enter a clear name for the event.
  </p>
</div>
```

### Focus state

```css
.input:focus-visible {
  outline: 3px solid rgb(37 99 235 / 25%);
  border-color: var(--color-focus);
}
```

Never remove browser focus indicators without replacing them.

---

# 4.6 Inputs

```css
.input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
}
```

States:

```text
default
hover
focus
error
disabled
readonly
```

---

# 4.7 Badges

Useful for status.

```html
<span class="badge badge-success">
  Published
</span>
```

Don't rely solely on color:

```text
Published
Draft
Expired
Pending
Failed
```

---

# 4.8 Photo grid

For image-heavy applications:

```css
.photo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1023px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
```

For extremely narrow screens, a single column can be used when image detail matters more than density.

---

# 4.9 Icon buttons

```html
<button
  class="icon-button"
  type="button"
  aria-label="Delete event"
>
  <svg aria-hidden="true">
    ...
  </svg>
</button>
```

Every icon-only button needs an accessible name.

---

# 5. Visual Design Guidelines

## 5.1 Grid

Use a 12-column desktop grid.

```text
Desktop:
12 columns
24px gutters

Tablet:
8 columns

Mobile:
4 columns
```

Example:

```css
.layout-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
}
```

---

# 5.2 Border radius

Use a restrained radius system:

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;
}
```

Recommended:

```text
Inputs       10px
Buttons      10px
Cards        16px
Modal        16–24px
Pills        9999px
```

Avoid using a different radius for every component.

---

# 5.3 Shadows

Keep elevation subtle.

```css
:root {
  --shadow-sm:
    0 1px 2px rgb(15 23 42 / 6%);

  --shadow-md:
    0 8px 24px rgb(15 23 42 / 10%);

  --shadow-lg:
    0 16px 40px rgb(15 23 42 / 14%);
}
```

### Elevation levels

| Level | Use                         |
| ----- | --------------------------- |
| 0     | Flat content                |
| 1     | Cards                       |
| 2     | Dropdowns / sticky elements |
| 3     | Modal dialogs               |
| 4     | Temporary overlays          |

Not every card needs a shadow.

A combination of:

```text
border + background contrast
```

often looks more modern than:

```text
large shadow + no border
```

---

# 5.4 Borders

Use borders sparingly.

Default:

```css
border: 1px solid var(--color-border);
```

Use stronger borders for:

```text
focused controls
selected cards
error states
high-priority containers
```

---

# 5.5 Motion

Animation should communicate state.

Recommended duration:

```text
Fast:   100–150ms
Normal: 150–250ms
Slow:   250–400ms
```

Example:

```css
.card {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.card:hover {
  transform: translateY(-2px);
}
```

Don't animate everything.

Respect reduced-motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

# 6. Accessibility

## 6.1 Semantic HTML

Prefer:

```html
<header>
<nav>
<main>
<section>
<article>
<footer>
```

over using `<div>` for everything.

---

## 6.2 Keyboard navigation

Every interactive component must be usable without a mouse.

Check:

```text
Tab
Shift + Tab
Enter
Space
Escape
Arrow keys where appropriate
```

---

## 6.3 Focus states

Use `:focus-visible`.

```css
:focus-visible {
  outline: 3px solid rgb(37 99 235 / 35%);
  outline-offset: 2px;
}
```

---

## 6.4 ARIA

Use ARIA to supplement semantic HTML rather than replacing it.

Good:

```html
<button
  aria-label="Close dialog"
>
  ×
</button>
```

For expandable regions:

```html
<button
  aria-expanded="false"
  aria-controls="mobile-nav"
>
  Menu
</button>
```

For live status:

```html
<div aria-live="polite">
  Upload complete.
</div>
```

---

## 6.5 Images

Informative image:

```html
<img src="photo.jpg" alt="Wedding ceremony at sunset">
```

Decorative image:

```html
<img src="background.jpg" alt="">
```

Don't use:

```html
alt="image"
alt="photo"
```

when a meaningful description is possible.

---

# 7. Design Tokens File

You can drop this into a project as `design-tokens.json`.

```json
{
  "color": {
    "primary": {
      "50": "#EFF6FF",
      "100": "#DBEAFE",
      "500": "#3B82F6",
      "600": "#2563EB",
      "700": "#1D4ED8"
    },
    "secondary": {
      "500": "#8B5CF6"
    },
    "semantic": {
      "success": "#16A34A",
      "warning": "#D97706",
      "danger": "#DC2626"
    },
    "neutral": {
      "0": "#FFFFFF",
      "50": "#F8FAFC",
      "100": "#F1F5F9",
      "200": "#E2E8F0",
      "300": "#CBD5E1",
      "500": "#64748B",
      "700": "#334155",
      "900": "#0F172A"
    }
  },
  "typography": {
    "fontFamily": "Inter, ui-sans-serif, system-ui, sans-serif",
    "display": {
      "size": "48px",
      "weight": 700,
      "lineHeight": 1.1
    },
    "h1": {
      "size": "40px",
      "weight": 700,
      "lineHeight": 1.15
    },
    "h2": {
      "size": "32px",
      "weight": 700,
      "lineHeight": 1.2
    },
    "h3": {
      "size": "24px",
      "weight": 600,
      "lineHeight": 1.25
    },
    "body": {
      "size": "16px",
      "weight": 400,
      "lineHeight": 1.5
    },
    "small": {
      "size": "14px",
      "weight": 400,
      "lineHeight": 1.45
    }
  },
  "spacing": {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px"
  },
  "radius": {
    "sm": "6px",
    "md": "10px",
    "lg": "16px",
    "xl": "24px",
    "pill": "9999px"
  },
  "shadow": {
    "sm": "0 1px 2px rgb(15 23 42 / 6%)",
    "md": "0 8px 24px rgb(15 23 42 / 10%)",
    "lg": "0 16px 40px rgb(15 23 42 / 14%)"
  },
  "breakpoint": {
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px",
    "2xl": "1536px"
  }
}
```

---

# 8. CSS Design Tokens

A matching `tokens.css`:

```css
:root {
  /* Colors */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-primary-active: #1D4ED8;
  --color-secondary: #8B5CF6;

  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger: #DC2626;

  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1F5F9;

  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;

  --color-text: #0F172A;
  --color-text-secondary: #334155;
  --color-text-muted: #64748B;

  /* Typography */
  --font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  --text-display: 3rem;
  --text-h1: 2.5rem;
  --text-h2: 2rem;
  --text-h3: 1.5rem;
  --text-body: 1rem;
  --text-small: 0.875rem;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgb(15 23 42 / 6%);
  --shadow-md: 0 8px 24px rgb(15 23 42 / 10%);
  --shadow-lg: 0 16px 40px rgb(15 23 42 / 14%);

  /* Layout */
  --container-max: 1200px;
  --header-height: 72px;
}
```

---

# 9. Minimal HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>Modern Website</title>

  <link rel="stylesheet" href="/static/css/tokens.css">
  <link rel="stylesheet" href="/static/css/main.css">
</head>

<body>

  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand">
        <span class="brand-name">Northline</span>
      </a>

      <nav aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/about/">About</a>
        <a href="/contact/">Contact</a>
      </nav>

      <a class="btn btn-primary" href="/signup/">
        Get Started
      </a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <p class="eyebrow">Modern digital platform</p>

        <h1>
          Simple tools for better work.
        </h1>

        <p class="hero-description">
          A clear, focused experience designed around
          the people who use it.
        </p>

        <div class="hero-actions">
          <a href="/signup/" class="btn btn-primary">
            Get Started
          </a>

          <a href="/learn/" class="btn btn-secondary">
            Learn More
          </a>
        </div>
      </div>
    </section>

    <section class="content-section">
      <div class="container">
        <div class="card">
          <h2>Feature title</h2>
          <p>
            Supporting information goes here.
          </p>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>© 2026 Northline</p>
    </div>
  </footer>

</body>
</html>
```

---

# 10. Recommended `main.css` foundation

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-family: var(--font-family);
  color: var(--color-text);
  background: var(--color-bg);
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--color-bg);
}

img {
  display: block;
  max-width: 100%;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

.container {
  width: min(
    calc(100% - 32px),
    var(--container-max)
  );
  margin-inline: auto;
}

.site-header {
  min-height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  min-height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

.brand {
  font-size: 1.125rem;
  font-weight: 700;
}

.card {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding-inline: var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  color: #fff;
  background: var(--color-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-secondary {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

:focus-visible {
  outline: 3px solid rgb(37 99 235 / 35%);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .container {
    width: min(
      calc(100% - 24px),
      var(--container-max)
    );
  }

  .header-inner {
    min-height: 64px;
  }
}
```

---

# 11. Recommended Component Naming

Use predictable names.

```text
.btn
.btn-primary
.btn-secondary
.btn-danger

.card
.card-header
.card-body
.card-footer

.input
.select
.textarea

.form-field
.form-label
.form-help
.form-error

.badge
.badge-success
.badge-warning
.badge-danger

.modal
.modal-header
.modal-body
.modal-footer

.nav
.nav-link

.container
.section
.grid
```

For larger applications, use a naming methodology such as BEM:

```text
.card
.card__header
.card__body
.card__footer
```

Avoid arbitrary names such as:

```text
.box1
.blueThing
.big-card-new
```

---

# 12. Implementation Recommendation

## For a Django project

For the project you're currently building, I'd use:

```text
Django Templates
+
Bootstrap 5.3
+
custom CSS tokens
+
small vanilla JavaScript modules
```

This gives you:

```text
Bootstrap
  → responsive primitives/components

Custom CSS
  → actual visual identity

JavaScript
  → interactions
```

Do **not** override Bootstrap globally for every component. Establish your own design tokens and selectively customize components.

A good structure is:

```text
static/
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── components.css
│   ├── utilities.css
│   └── main.css
│
└── js/
    ├── navigation.js
    ├── forms.js
    ├── gallery.js
    └── uploads.js
```

---

# 13. Quick-start checklist

### Foundation

```text
[ ] Add design-tokens.json
[ ] Add tokens.css
[ ] Configure typography
[ ] Configure colors
[ ] Configure spacing
[ ] Configure breakpoints
[ ] Configure radius/elevation
```

### Components

```text
[ ] Header
[ ] Navigation
[ ] Footer
[ ] Buttons
[ ] Cards
[ ] Forms
[ ] Inputs
[ ] Badges
[ ] Modal
[ ] Alerts
[ ] Empty state
[ ] Loading state
```

### Responsive

```text
[ ] Mobile navigation
[ ] 1-column mobile layouts
[ ] 2-column tablet layouts
[ ] Multi-column desktop layouts
[ ] Responsive typography
[ ] Responsive images
```

### Accessibility

```text
[ ] WCAG AA contrast target
[ ] Keyboard navigation
[ ] Visible focus states
[ ] Semantic HTML
[ ] Form labels
[ ] ARIA labels where required
[ ] Alt text
[ ] Reduced motion support
```

### Quality

```text
[ ] No arbitrary colors
[ ] No arbitrary spacing
[ ] No inconsistent border radius
[ ] No excessive shadows
[ ] No animation overload
[ ] Test at 320px width
[ ] Test at 768px width
[ ] Test at 1024px width
[ ] Test at 1440px width
```

---

# 14. Suggested README Structure

Your final design README can use this structure:

```markdown
# Modern Neutral Design System

## 1. Design Philosophy
## 2. Design Principles

## 3. Color System
### Primary
### Secondary
### Neutral
### Semantic Colors
### Dark Theme

## 4. Typography
### Font Family
### Type Scale
### Usage Guidelines

## 5. Spacing
### Spacing Scale
### Layout Spacing

## 6. Iconography
### Icon Family
### Sizes
### Usage

## 7. Layout
### Container
### Grid
### Breakpoints
### Responsive Behavior

## 8. Components
### Header
### Navigation
### Footer
### Buttons
### Cards
### Forms
### Inputs
### Badges
### Modals
### Alerts

## 9. Visual Language
### Borders
### Radius
### Shadows
### Elevation
### Motion

## 10. Accessibility
### Contrast
### Keyboard Navigation
### Focus States
### ARIA
### Images
### Reduced Motion

## 11. Design Tokens

See:
design-tokens.json
tokens.css

## 12. Implementation
### Recommended Stack
### CSS Architecture
### JavaScript

## 13. Quick Start

## 14. QA Checklist
```

---

## Final visual direction

The simplest way to keep the resulting website visually coherent is to establish this hierarchy:

```text
BACKGROUND
#F8FAFC

      ↓

SURFACE
#FFFFFF

      ↓

BORDER
#E2E8F0

      ↓

PRIMARY TEXT
#0F172A

      ↓

SECONDARY TEXT
#334155

      ↓

MUTED TEXT
#64748B

      ↓

ONE PRIMARY ACCENT
#3B82F6

      ↓

SUBTLE MOTION + ELEVATION
```

That combination produces a **neutral, modern, premium interface without making the design overly decorative**. The system is also intentionally tokenized so the same components can later be branded by changing a small number of variables rather than rewriting the UI.
