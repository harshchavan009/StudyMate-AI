/**
 * Centralized Motion Tokens (G3)
 * Hierarchy of standard durations and cubic-bezier(0.2, 0, 0, 1) ease curve.
 */

export const MOTION_EASE = [0.2, 0, 0, 1];

export const MOTION_DURATIONS = {
  micro: 0.12,     // 120ms: buttons, badges, icons, hover, toggles
  ui: 0.20,        // 200ms: dropdowns, tabs, dialogs, cross-fades
  panel: 0.32,     // 320ms: disclosure expand/collapse, sidebar, drawers
  signature: 0.60, // 600ms: score count-up, complex progress
};

export const MOTION_TRANSITIONS = {
  micro: { duration: MOTION_DURATIONS.micro, ease: MOTION_EASE },
  ui: { duration: MOTION_DURATIONS.ui, ease: MOTION_EASE },
  panel: { duration: MOTION_DURATIONS.panel, ease: MOTION_EASE },
  signature: { duration: MOTION_DURATIONS.signature, ease: MOTION_EASE },
};

