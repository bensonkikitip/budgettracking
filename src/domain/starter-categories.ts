/**
 * Starter Categories — the default set offered during first-time onboarding.
 *
 * The first 6 entries match FOUNDATIONAL_RULES[].defaultCategoryName so that the
 * foundational rules onboarding can auto-map by name lookup. The remaining 4
 * cover common buckets (Housing, Income, Transfers, Other) that don't have
 * built-in merchant patterns but every user wants to track.
 *
 * Names must stay in sync with `FoundationalRule.defaultCategoryName` for the
 * first 6 entries — see src/domain/foundational-rules.ts.
 */

import { CATEGORY_COLORS } from './category-colors';

export interface StarterCategory {
  name:        string;
  emoji:       string;
  color:       string;       // hex, picked from CATEGORY_COLORS
  description: string;
}

export const STARTER_CATEGORIES: StarterCategory[] = [
  // ── Foundational-rule-backed ── (names must match FoundationalRule.defaultCategoryName)
  { name: 'Food & Dining',  emoji: '🍔', color: CATEGORY_COLORS[1].hex /* Peach      */, description: 'Restaurants, takeout, coffee, fast food' },
  { name: 'Groceries',      emoji: '🛒', color: CATEGORY_COLORS[0].hex /* Sage       */, description: 'Supermarkets and grocery stores' },
  { name: 'Transportation', emoji: '🚗', color: CATEGORY_COLORS[3].hex /* Sky        */, description: 'Gas, rideshare, transit, parking' },
  { name: 'Entertainment',  emoji: '🎬', color: CATEGORY_COLORS[4].hex /* Lavender   */, description: 'Streaming, movies, events' },
  { name: 'Shopping',       emoji: '🛍️', color: CATEGORY_COLORS[6].hex /* Berry      */, description: 'Online and retail purchases' },
  { name: 'Health',         emoji: '💊', color: CATEGORY_COLORS[2].hex /* Terracotta */, description: 'Pharmacy, doctor, gym, insurance' },

  // ── Manual ── (no foundational rule yet — user assigns by hand or via custom rules)
  { name: 'Housing',              emoji: '🏠', color: CATEGORY_COLORS[7].hex /* Slate */, description: 'Rent, mortgage, HOA, utilities' },
  { name: 'Income',               emoji: '💰', color: CATEGORY_COLORS[5].hex /* Gold  */, description: 'Paychecks, deposits, refunds' },
  { name: 'Transfers & Payments', emoji: '💳', color: CATEGORY_COLORS[7].hex /* Slate */, description: 'CC payments, account transfers' },
  { name: 'Other',                emoji: '🎁', color: CATEGORY_COLORS[5].hex /* Gold  */, description: 'Anything else' },
];
