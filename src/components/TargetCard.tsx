import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing, radius } from '../theme';
import { centsToDollars } from '../domain/money';

interface TargetCardProps {
  /** Category name — or account name for an account-level card */
  label:        string;
  /** Category dot color — undefined for account-level cards */
  dotColor?:    string;
  /** How much was spent this month (positive cents = expenses) */
  spentCents:   number;
  /** The target ceiling (positive cents) */
  targetCents:  number;
  /** Standing budget for this category/month — shown as a faint marker when different from target */
  budgetCents?: number;
}

/** Thresholds (as a fraction of target) */
const WARN_AT  = 0.75; // amber
const OVER_AT  = 1.00; // over — warm, not alarming

function barColor(ratio: number): string {
  if (ratio >= OVER_AT)  return colors.expense;   // terracotta — warm not harsh
  if (ratio >= WARN_AT)  return '#D4956A';         // peach/amber — the app's accent
  return colors.primary;                            // sage green
}

function overMessage(spentCents: number, targetCents: number): string {
  const overBy = centsToDollars(spentCents - targetCents);
  return `Looks like we enjoyed a bit more than planned — ${overBy} over. No worries.`;
}

export function TargetCard({
  label, dotColor, spentCents, targetCents, budgetCents,
}: TargetCardProps) {
  const ratio      = targetCents > 0 ? Math.min(spentCents / targetCents, 1) : 0;
  const isOver     = spentCents > targetCents && targetCents > 0;
  const remaining  = Math.max(targetCents - spentCents, 0);
  const fill       = barColor(ratio);

  // Budget marker position (0–1) — only show when budget ≠ target
  const showBudgetMarker =
    budgetCents != null &&
    budgetCents > 0 &&
    budgetCents !== targetCents &&
    targetCents > 0;
  const budgetRatio = showBudgetMarker
    ? Math.min(budgetCents! / targetCents, 1)
    : null;

  return (
    <View style={styles.card}>
      {/* Label row */}
      <View style={styles.labelRow}>
        {dotColor != null && (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        )}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.amounts}>
          <Text style={[styles.spent, isOver && { color: colors.expense }]}>
            {centsToDollars(spentCents)}
          </Text>
          <Text style={styles.slash}> / </Text>
          <Text style={styles.target}>{centsToDollars(targetCents)}</Text>
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        {/* Fill */}
        <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
        {/* Budget marker — faint vertical tick showing where standing budget lands */}
        {budgetRatio != null && (
          <View style={[styles.budgetMarker, { left: `${budgetRatio * 100}%` }]} />
        )}
      </View>

      {/* Sub-label */}
      {isOver ? (
        <Text style={styles.overText}>{overMessage(spentCents, targetCents)}</Text>
      ) : (
        <Text style={styles.remainText}>
          {targetCents === 0
            ? 'No target set'
            : remaining === 0
            ? 'Right on target 🎯'
            : `${centsToDollars(remaining)} left`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    gap:             spacing.sm,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  dot: {
    width:        10,
    height:       10,
    borderRadius: radius.full,
    flexShrink:   0,
  },
  label: {
    flex:       1,
    fontFamily: font.semiBold,
    fontSize:   15,
    color:      colors.text,
  },
  amounts: {
    fontFamily: font.semiBold,
    fontSize:   13,
  },
  spent: {
    color: colors.text,
  },
  slash: {
    color: colors.textTertiary,
  },
  target: {
    color: colors.textSecondary,
  },

  barTrack: {
    height:          8,
    backgroundColor: colors.surfaceAlt,
    borderRadius:    radius.full,
    overflow:        'hidden',
    position:        'relative',
  },
  barFill: {
    position:     'absolute',
    left:         0,
    top:          0,
    bottom:       0,
    borderRadius: radius.full,
  },
  budgetMarker: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    width:           2,
    backgroundColor: colors.textTertiary,
    opacity:         0.4,
    marginLeft:      -1,
  },

  remainText: {
    fontFamily: font.regular,
    fontSize:   12,
    color:      colors.textTertiary,
  },
  overText: {
    fontFamily: font.regular,
    fontSize:   12,
    color:      colors.expense,
    lineHeight: 17,
  },
});
