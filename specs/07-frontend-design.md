# 07 — Frontend Design System

## Topic
Visual design system, component patterns, animation behavior, and responsive layout for the Jinx UI.

## Acceptance Criteria

### Colors
- Page backgrounds use a near-black tone with a slight blue undertone (#0F1117)
- Cards and elevated surfaces use a lighter dark surface (#1A1D27) with a hover state (#242836)
- Borders and dividers use a low-contrast separator (#2A2E3B)
- Primary accent (green, #10B981) is used for YES bets, wins, positive actions, and primary CTAs
- Secondary accent (amber, #F59E0B) is used for token amounts, highlights, and pending resolution states
- Danger accent (red, #EF4444) is used for NO bets, losses, and destructive actions
- Primary text is off-white (#F1F5F9), secondary text is muted slate (#94A3B8), tertiary text is dimmed (#64748B)

### Typography
- All UI text uses Inter font family loaded via Google Fonts
- Token amounts, probabilities, and countdown timers use JetBrains Mono for a scoreboard feel
- Headers use semibold/bold weights with slightly tighter letter-spacing (-0.02em)
- Base body text is 16px regular weight

### Animations
- Probability bars animate smoothly when odds shift (500ms ease transition)
- Token amounts count up/down with easing on bet placement and resolution
- Cards enter with a subtle fade-and-rise animation (300ms)
- Bet confirmation produces a scale + glow pulse on the accent color
- Countdown timers pulse subtly as they approach zero
- No animation exists purely for decoration — every animation communicates a state change

### Component Patterns
- Market cards have soft box-shadow glows: green for active, amber for pending resolution
- Status badges are pill-shaped with translucent accent backgrounds
- Probability is displayed as a progress bar: green fill for YES, red background for NO
- Toast notifications appear for bet confirmations and market resolutions
- Buttons follow three variants: primary (green), danger (red), and ghost (transparent with border)

### Responsiveness
- The layout works on both desktop and mobile viewports
- Cards stack vertically on mobile and use a grid on desktop
- Navigation collapses appropriately on small screens
