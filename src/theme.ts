// Slo&Steady design system
// Warm, calm, approachable — like a cozy coffee shop, not a bank.

export const colors = {
  // Backgrounds
  background:    '#F7F5F0', // warm cream — main screen bg
  surface:       '#FFFFFF', // white — cards and rows
  surfaceAlt:    '#F0EDE8', // slightly warmer — grouped section bg

  // Brand
  primary:       '#5B8A6E', // sage green — buttons, income, checking accent
  primaryLight:  '#EAF2ED', // very light sage — icon backgrounds
  accent:        '#D4956A', // warm amber — credit card accent, pending
  accentLight:   '#FBF0E8', // very light amber

  // Financial meaning
  income:        '#5B8A6E', // sage green
  expense:       '#C4634A', // warm coral — not harsh red
  netPositive:   '#5B8A6E',
  netNegative:   '#C4634A',

  // Transaction states
  pending:       '#D4956A', // warm amber
  dropped:       '#C5BDB7', // muted taupe

  // Text
  text:          '#2C2416', // warm dark brown — primary
  textSecondary: '#7A6E63', // medium warm brown
  textTertiary:  '#AEA59B', // light warm grey-brown
  textOnColor:   '#FFFFFF', // text on colored backgrounds

  // Chrome
  border:        '#E8E2DB',
  separator:     '#EDE8E3',
  destructive:   '#C4634A',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const font = {
  regular:   'Nunito_400Regular',
  semiBold:  'Nunito_600SemiBold',
  bold:      'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
};

// Account type → brand color mapping
export const accountColor = {
  checking:    colors.primary,
  credit_card: colors.accent,
} as const;
