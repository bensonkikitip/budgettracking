// Slo N Ready design system
// Jungle-neutral — think forest floor, canopy shadow, weathered bark.
// Muted and earthy, never bright. Calm but alive.

export const colors = {
  // Backgrounds
  background:    '#EDEAE4', // warm stone — main screen bg
  surface:       '#F8F7F4', // off-white — cards and rows
  surfaceAlt:    '#E5E2DB', // darker stone — grouped section bg

  // Brand
  primary:       '#4A7A5C', // muted forest green — buttons, income, checking accent
  primaryLight:  '#E2EDE6', // very light moss — selected states
  accent:        '#7A6B52', // weathered bark — credit card accent, pending
  accentLight:   '#EDE8E0', // very light warm tone

  // Financial meaning
  income:        '#4A7A5C', // forest green
  expense:       '#8B5E52', // muted terracotta/clay — not harsh red
  netPositive:   '#4A7A5C',
  netNegative:   '#8B5E52',

  // Transaction states
  pending:       '#8B7A5E', // muted khaki/tan
  dropped:       '#B5B2AC', // neutral warm gray

  // Text
  text:          '#28261E', // deep warm near-black
  textSecondary: '#6A6760', // warm stone gray
  textTertiary:  '#A09D97', // light warm gray
  textOnColor:   '#FFFFFF', // text on colored backgrounds

  // Chrome
  border:        '#D5D1C8', // warm stone border
  separator:     '#E2DFD8', // slightly lighter
  destructive:   '#8B5E52', // same as expense/muted clay-red
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
  checking:    colors.primary, // forest green
  credit_card: colors.accent,  // weathered bark
} as const;
