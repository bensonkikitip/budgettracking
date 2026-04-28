import { suggestEmojiForCategory, suggestEmojisForCategories } from '../../src/domain/emoji-suggestions';

describe('suggestEmojiForCategory', () => {
  // Common known mappings from the plan
  it('maps "Coffee" to ☕', () => {
    expect(suggestEmojiForCategory('Coffee')).toBe('☕');
  });

  it('maps "Gas" to ⛽', () => {
    expect(suggestEmojiForCategory('Gas')).toBe('⛽');
  });

  it('maps "Rent" to 🏠', () => {
    expect(suggestEmojiForCategory('Rent')).toBe('🏠');
  });

  it('maps "Groceries" to 🛒', () => {
    expect(suggestEmojiForCategory('Groceries')).toBe('🛒');
  });

  it('maps "Food & Dining" to 🍔 (first matching token wins)', () => {
    expect(suggestEmojiForCategory('Food & Dining')).toBe('🍔');
  });

  it('maps "Transportation" to 🚗', () => {
    expect(suggestEmojiForCategory('Transportation')).toBe('🚗');
  });

  it('maps "Entertainment" to 🎬', () => {
    expect(suggestEmojiForCategory('Entertainment')).toBe('🎬');
  });

  it('maps "Shopping" to 🛍️', () => {
    expect(suggestEmojiForCategory('Shopping')).toBe('🛍️');
  });

  it('maps "Health" to 💊', () => {
    expect(suggestEmojiForCategory('Health')).toBe('💊');
  });

  it('maps "Income" to 💰', () => {
    expect(suggestEmojiForCategory('Income')).toBe('💰');
  });

  it('maps "Transfers & Payments" to 💳', () => {
    expect(suggestEmojiForCategory('Transfers & Payments')).toBe('💳');
  });

  it('maps "Other" to 🎁', () => {
    expect(suggestEmojiForCategory('Other')).toBe('🎁');
  });

  // Case insensitivity
  it('is case-insensitive', () => {
    expect(suggestEmojiForCategory('GROCERIES')).toBe('🛒');
    expect(suggestEmojiForCategory('Coffee Shops')).toBe('☕');
  });

  // Multi-word: first-match wins
  it('returns match on first token', () => {
    expect(suggestEmojiForCategory('Rent & Mortgage')).toBe('🏠');
  });

  // No match
  it('returns null when no token matches', () => {
    expect(suggestEmojiForCategory('XYZ Uncategorized Blorp')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(suggestEmojiForCategory('')).toBeNull();
  });

  // Punctuation / special chars are ignored
  it('handles punctuation gracefully', () => {
    expect(suggestEmojiForCategory('Coffee, Tea & Drinks')).toBe('☕');
  });
});

describe('suggestEmojisForCategories', () => {
  it('returns one result per input category', () => {
    const cats = [
      { id: '1', name: 'Groceries', emoji: null },
      { id: '2', name: 'Coffee',    emoji: null },
      { id: '3', name: 'Unknown',   emoji: null },
    ];
    const result = suggestEmojisForCategories(cats);
    expect(result).toHaveLength(3);
  });

  it('preserves the existing emoji when already set', () => {
    const cats = [{ id: '1', name: 'Groceries', emoji: '🛒' }];
    const result = suggestEmojisForCategories(cats);
    expect(result[0].suggestion).toBe('🛒');
  });

  it('suggests emoji when none is set', () => {
    const cats = [{ id: '1', name: 'Groceries', emoji: null }];
    const result = suggestEmojisForCategories(cats);
    expect(result[0].suggestion).toBe('🛒');
  });

  it('returns null suggestion when no match', () => {
    const cats = [{ id: '1', name: 'Blorp', emoji: null }];
    const result = suggestEmojisForCategories(cats);
    expect(result[0].suggestion).toBeNull();
  });

  it('includes id and name in every result', () => {
    const cats = [{ id: 'cat-1', name: 'Coffee', emoji: null }];
    const result = suggestEmojisForCategories(cats);
    expect(result[0].id).toBe('cat-1');
    expect(result[0].name).toBe('Coffee');
  });
});
