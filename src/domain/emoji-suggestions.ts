/**
 * Emoji suggestion engine — maps category names to plausible emojis.
 *
 * Used in the v4 upgrade flow to suggest emojis for existing categories.
 * Pure function; no DB access.
 *
 * Strategy: lowercase + split on whitespace/punctuation, then check each
 * token against a lookup table. First match wins. Returns null if nothing
 * matches (no guess is better than a wrong guess).
 */

const EMOJI_LOOKUP: Record<string, string> = {
  // Food & dining
  food:          '🍔',
  dining:        '🍔',
  restaurant:    '🍔',
  restaurants:   '🍔',
  takeout:       '🍔',
  takeaway:      '🍔',
  lunch:         '🍔',
  dinner:        '🍔',
  breakfast:     '🍔',
  pizza:         '🍕',
  tacos:         '🌮',
  taco:          '🌮',
  sushi:         '🍣',
  burger:        '🍔',
  fast:          '🍔', // "fast food"

  // Coffee
  coffee:        '☕',
  cafe:          '☕',
  starbucks:     '☕',
  dunkin:        '☕',
  drinks:        '☕',

  // Groceries
  grocery:       '🛒',
  groceries:     '🛒',
  supermarket:   '🛒',
  market:        '🛒',

  // Transportation & auto
  transport:     '🚗',
  transportation:'🚗',
  auto:          '🚗',
  car:           '🚗',
  gas:           '⛽',
  fuel:          '⛽',
  parking:       '🚗',
  transit:       '🚇',
  uber:          '🚗',
  lyft:          '🚗',
  rideshare:     '🚗',

  // Housing
  home:          '🏠',
  housing:       '🏠',
  rent:          '🏠',
  mortgage:      '🏠',
  hoa:           '🏠',

  // Utilities
  utilities:     '⚡',
  utility:       '⚡',
  electric:      '⚡',
  electricity:   '⚡',
  internet:      '📶',
  phone:         '📱',
  mobile:        '📱',
  cell:          '📱',
  cable:         '📺',

  // Entertainment
  entertainment: '🎬',
  movies:        '🎬',
  movie:         '🎬',
  streaming:     '🎬',
  netflix:       '🎬',
  hulu:          '🎬',
  disney:        '🎬',
  gaming:        '🎮',
  games:         '🎮',
  music:         '🎵',
  spotify:       '🎵',
  concert:       '🎵',

  // Shopping & retail
  shopping:      '🛍️',
  retail:        '🛍️',
  amazon:        '🛍️',
  clothes:       '👕',
  clothing:      '👕',
  fashion:       '👕',
  shoes:         '👟',

  // Health
  health:        '💊',
  medical:       '💊',
  healthcare:    '💊',
  pharmacy:      '💊',
  doctor:        '💊',
  dentist:       '🦷',
  gym:           '🏋️',
  fitness:       '🏋️',
  wellness:      '🧘',

  // Income & transfers
  income:        '💰',
  salary:        '💰',
  paycheck:      '💰',
  wages:         '💰',
  savings:       '💰',
  deposit:       '💰',
  refund:        '💰',
  transfer:      '💳',
  transfers:     '💳',
  payment:       '💳',
  payments:      '💳',
  credit:        '💳',

  // Travel
  travel:        '✈️',
  vacation:      '✈️',
  trip:          '✈️',
  hotel:         '🏨',
  airbnb:        '🏨',
  flights:       '✈️',
  flight:        '✈️',
  airline:       '✈️',

  // Pets
  pet:           '🐾',
  pets:          '🐾',
  dog:           '🐶',
  cat:           '🐱',
  vet:           '🐾',

  // Education
  education:     '🎓',
  school:        '🎓',
  tuition:       '🎓',
  books:         '📚',
  book:          '📚',
  courses:       '🎓',

  // Kids & family
  kids:          '🧒',
  children:      '🧒',
  childcare:     '🧒',
  daycare:       '🧒',
  baby:          '🍼',

  // Beauty & personal care
  beauty:        '💄',
  haircut:       '💇',
  hair:          '💇',
  spa:           '💆',
  cosmetics:     '💄',
  personal:      '🧴',

  // Alcohol & bars
  beer:          '🍺',
  bar:           '🍺',
  bars:          '🍺',
  alcohol:       '🍺',
  wine:          '🍷',
  liquor:        '🍺',

  // Electronics & tech
  electronics:   '💻',
  tech:          '💻',
  technology:    '💻',
  computer:      '💻',
  apple:         '🍎',
  software:      '💻',

  // Subscriptions
  subscriptions: '🔄',
  subscription:  '🔄',
  memberships:   '🔄',
  membership:    '🔄',

  // Charity & gifts
  charity:       '🎁',
  donation:      '🎁',
  gifts:         '🎁',
  gift:          '🎁',

  // Misc / other
  other:         '🎁',
  misc:          '🎁',
  miscellaneous: '🎁',
  general:       '🗂️',
};

/** Tokenise a category name into lowercase word tokens. */
function tokenise(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Return a suggested emoji for a category name, or `null` if nothing matches.
 * First-match-wins over the token list (earlier tokens = higher specificity).
 */
export function suggestEmojiForCategory(name: string): string | null {
  const tokens = tokenise(name);
  for (const token of tokens) {
    if (EMOJI_LOOKUP[token]) return EMOJI_LOOKUP[token];
  }
  return null;
}

/** Batch version — returns { categoryId, name, suggestion } for each input. */
export function suggestEmojisForCategories(
  categories: Array<{ id: string; name: string; emoji: string | null }>,
): Array<{ id: string; name: string; suggestion: string | null }> {
  return categories.map(c => ({
    id:         c.id,
    name:       c.name,
    suggestion: c.emoji ?? suggestEmojiForCategory(c.name),
  }));
}
