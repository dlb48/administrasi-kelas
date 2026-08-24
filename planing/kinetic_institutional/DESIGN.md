---
name: Kinetic Institutional
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#464555'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1440px
---

## Brand & Style
The design system is built on a foundation of **Corporate Modernism** with a focus on high-density information management. It evokes a sense of reliability and architectural precision, necessary for administrative environments, while maintaining a fresh, contemporary feel for a younger student demographic. 

The aesthetic prioritizes clarity over decoration. It utilizes a "Utility-First" visual language: heavy reliance on systematic spacing, a limited but functional color palette, and subtle depth transitions. The UI should feel fast, responsive, and indestructible.

## Colors
This design system uses a functional palette where color is an indicator of state and category. 

- **Primary (Indigo):** Used for primary actions, active navigation states, and brand recognition.
- **Success (Emerald):** Used for "Hadir" (Present) status, completed payments, and positive confirmations.
- **Warning (Amber):** Used for "Izin" (Excused) or "Sakit" (Sick) statuses and pending actions.
- **Danger (Red):** Used for "Alpa" (Absent) status, overdue payments, and destructive actions.
- **Neutral:** A scale of cool grays used for borders, secondary text, and iconography.

All background surfaces should use the defined Gray 50 to allow White surfaces (cards/modals) to pop with clarity.

## Typography
The typography system relies on **Inter** to provide maximum legibility in data-heavy environments. 

- **Headlines:** Use tight letter-spacing and bold weights to create a strong hierarchy.
- **Body:** Standardized at 16px for general reading and 14px for dense administrative tables.
- **Labels:** Used for table headers and status chips; these often use uppercase styling with increased letter spacing to distinguish them from interactive body text.

## Layout & Spacing
The system uses a **4px baseline grid** to ensure mathematical consistency across all components.

- **Desktop Layout:** A fixed 280px sidebar for navigation, with a fluid main content area that caps at 1440px. 
- **Mobile Layout:** A bottom tab bar for primary navigation (Home, Attendance, Payments, Profile) with 16px outer margins.
- **Data Tables:** Should utilize a "Compact" vertical rhythm, with row heights set to 48px to maximize information density while remaining touch-friendly on mobile devices.

## Elevation & Depth
This design system uses **Tonal Layering** combined with soft, low-contrast shadows. 

- **Level 0 (Background):** #F9FAFB. All layout containers sit here.
- **Level 1 (Surface):** #FFFFFF. Cards, table containers, and white sections. They feature a 1px border of #E5E7EB.
- **Level 2 (Interactive):** Active cards or dropdowns. These use a subtle ambient shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1)`.
- **Level 3 (Overlay):** Modals and Dialogs. These use a more pronounced shadow to create focus: `0 20px 25px -5px rgb(0 0 0 / 0.1)`.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a professional, "buttoned-up" appearance that is more approachable than sharp corners but more serious than highly rounded "pill" styles.

- **Standard Elements:** Inputs, Buttons, and Small Cards use 4px (0.25rem).
- **Large Containers:** Dashboard widgets and Modals use 8px (0.5rem).
- **Status Pills:** Exceptionally, these use a fully rounded (9999px) radius to distinguish them from interactive buttons.

## Components

### Navigation
- **Sidebar (Desktop):** Collapsible, using Indigo 600 for the active state indicator (a vertical bar on the left edge).
- **Bottom Bar (Mobile):** 64px height, blurred background (glassmorphism), with active icons tinted in Primary Indigo.

### Cards
- White background, 1px Gray-200 border, and 4px border-radius. Padding should be a consistent 24px (lg).

### Form Inputs
- **Default State:** White background, Gray-300 border.
- **Focus State:** 2px Indigo-600 border with a soft Indigo-100 outer glow (3px spread).
- **Validation:** Labels turn Red-500 on error; helper text appears below the input.

### Data Tables
- Header row uses `label-md` typography with a light gray background (#F3F4F6).
- Rows feature a subtle hover state (#F9FAFB) and a 1px bottom border.

### Status Chips (Pills)
- **H (Hadir):** Emerald-100 background, Emerald-700 text.
- **S/I (Sakit/Izin):** Amber-100 background, Amber-700 text.
- **A (Alpa):** Red-100 background, Red-700 text.
- **Payment Success:** Green-500 solid background with White text.

### Buttons
- **Primary:** Solid Indigo-600 with White text. 
- **Secondary:** White background with Gray-300 border and Gray-700 text.