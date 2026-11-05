# StudyMate AI: Design System & Visual Tokens

This document details the visual foundations, design tokens, layout architecture, typography hierarchy, and interaction principles governing StudyMate AI.

---

## 1. Design Philosophy

StudyMate AI follows an editorial, academic aesthetic designed for sustained reading, active studying, and precise note synthesis. The interface prioritizes typography, content grounding, and predictable interaction over decorative elements.

### Strict Visual Principles
- **No Purple, No Gradients**: Colors are strictly functional and opaque. Backgrounds use solid, calibrated tokens without linear or radial color fades.
- **No Pill Buttons**: Controls utilize sharp, functional rectangular geometries with consistent `6px` corner rounding.
- **No Emoji Icons**: All iconography is strictly monoline SVG (1.5px to 1.75px stroke) from Lucide or custom vector assets.
- **No Em Dashes**: The typography strictly uses commas, colons, or parentheses to ensure clean academic punctuation across all prompts and UI copy.
- **No Stock or AI Imagery**: Graphic elements are authentic monoline diagrams or structured data cards.

---

## 2. Color Palette & CSS Variables

| Token Name | Value | Purpose |
| :--- | :--- | :--- |
| `--sidebar` | `#14161B` | Fixed dark desktop sidebar and mobile navigation drawer background |
| `--sidebar-text` | `#E9E6DF` | Primary wordmark and active navigation text |
| `--sidebar-muted` | `#9A9DA5` | Unselected navigation labels, tool icons, and category headers |
| `--canvas` | `#F2EFE8` | Warm editorial parchment page background |
| `--panel` | `#FFFFFF` | Structured document surfaces and cards |
| `--inset` | `#F7F5F0` | Input textareas, kbd badges, and secondary containers |
| `--ink` | `#16181D` | Primary body text, headings, and high-contrast labels |
| `--muted` | `#5B6070` | Secondary descriptions, helper text, and subtitles |
| `--hairline` | `rgba(22, 24, 29, 0.10)` | Subtle borders, dividers, and container outlines |
| `--accent` | `#1F3FBF` | Primary action buttons, active tabs, and key focus rings |
| `--accent-hover` | `#1A36A6` | Button hover and pressed states |
| `--accent-tint` | `#EEF1FB` | Active selection backgrounds and indicator highlights |
| `--success` | `#1F7A4D` | Correct quiz answers, confirmed copy state, and online indicators |
| `--error` | `#B3261E` | Validation failures, error banners, and deletion alerts |
| `--warning` | `#8A5A00` | Cold-start advisory notices and offline notifications |

---

## 3. Typography Hierarchy

StudyMate AI pairs an authoritative editorial serif with a high-legibility interface sans.

### Source Serif 4 (Editorial Serif)
- **H1 Page Titles**: `text-2xl` to `text-3xl` (`28px` to `32px`), font-medium, tracking-tight.
- **Section Headings**: `text-lg` to `text-xl` (`18px` to `20px`), font-medium.
- **Wordmark**: `font-serif text-lg font-medium tracking-tight text-white`.

### Inter (Interface Sans)
- **Navigation & Controls**: `text-sm` (`14px`), font-normal or font-medium.
- **Body & Explanations**: `text-sm` to `text-base` (`14px` to `16px`), `leading-relaxed`.
- **Counters & Numbers**: `tabular-nums font-sans` for zero-jitter layout stability.
- **Subtitles & Badges**: `text-xs` (`12px`) or `text-[11px]`, font-medium.

---

## 4. Geometry and Elevation

- **Control Radius**: `6px` for buttons, inputs, segmented controls, and badges.
- **Panel Radius**: `12px` for output documents, study cards, and modal containers.
- **Document Elevation**: `0 1px 2px rgba(22, 24, 29, 0.05), 0 12px 32px rgba(22, 24, 29, 0.07)` on primary document panels.
- **Shell Structure**: Flat styling with `1px` hairlines (`rgba(22, 24, 29, 0.10)`).

---

## 5. Navigation Shell & Responsiveness

- **Desktop (>= 1024px)**: Fixed `248px` dark sidebar with flush active row indicators (`3px` white bar).
- **Tablet (768px to 1023px)**: Responsive full-width canvas with sticky header bar and slide-in drawer.
- **Mobile (< 768px)**: Compact mobile bottom navigation bar combined with an accessible slide-in drawer for secondary items.
- **Top Bar**: Sticky `56px` header with translucent canvas frosted-glass backdrop, hairline border, command menu launcher (`Cmd+K`), and live 3-state backend health indicator.

---

## 6. Motion & Animation Tokens

- **Framework**: Motion (React) wrapped in `<MotionConfig reducedMotion="user">` for accessibility.
- **Transition Curve**: `ease: [0.2, 0, 0, 1]` across route fades and accordion disclosures.
- **Durations**:
  - Route fades: `150ms`
  - Button state transitions: `120ms`
  - Accordion expand/collapse: `200ms`
  - 3-stage topic processing pipeline: sequential animated progress steps (0 to 3s, 3 to 6s, >6s).
