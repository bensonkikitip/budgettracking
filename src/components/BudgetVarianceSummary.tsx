import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { centsToDollars } from '../domain/money';
import { VarianceSummary } from '../domain/budget-variance';
import { colors, font, spacing } from '../theme';

interface Props {
  summary: VarianceSummary;
}

export function BudgetVarianceSummary({ summary }: Props) {
  return (
    <View style={styles.container}>
      <VarianceCell
        label="Income"
        actualCents={summary.income_actual_cents}
        budgetCents={summary.income_budget_cents}
        varianceCents={summary.income_variance_cents}
        isIncome
      />
      <View style={styles.divider} />
      <VarianceCell
        label="Expenses"
        actualCents={summary.expense_actual_cents}
        budgetCents={summary.expense_budget_cents}
        varianceCents={summary.expense_variance_cents}
        isIncome={false}
      />
    </View>
  );
}

function VarianceCell({
  label,
  actualCents,
  budgetCents,
  varianceCents,
  isIncome,
}: {
  label:         string;
  actualCents:   number;
  budgetCents:   number;
  varianceCents: number;
  isIncome:      boolean;
}) {
  const amountColor = isIncome ? colors.income : colors.expense;
  const hasBudget = budgetCents !== 0;
  const varianceGood = varianceCents >= 0;
  const varianceColor = varianceGood ? colors.income : colors.expense;
  const arrow = varianceCents === 0 ? '' : varianceCents > 0 ? '▲ ' : '▼ ';

  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={[styles.actual, { color: amountColor }]}>{centsToDollars(actualCents)}</Text>
      {hasBudget ? (
        <>
          <Text style={styles.budgeted}>{centsToDollars(Math.abs(budgetCents))} budgeted</Text>
          <Text style={[styles.variance, { color: varianceColor }]}>
            {arrow}{centsToDollars(Math.abs(varianceCents))}
          </Text>
        </>
      ) : (
        <Text style={styles.noBudget}>no budget set</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    backgroundColor:   colors.surface,
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  cell: {
    flex:       1,
    alignItems: 'center',
    gap:        3,
  },
  divider: {
    width:           1,
    backgroundColor: colors.separator,
    marginVertical:  4,
  },
  label: {
    fontFamily:    font.semiBold,
    fontSize:      11,
    color:         colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actual: {
    fontFamily: font.bold,
    fontSize:   18,
  },
  budgeted: {
    fontFamily: font.regular,
    fontSize:   11,
    color:      colors.textSecondary,
  },
  variance: {
    fontFamily: font.semiBold,
    fontSize:   12,
  },
  noBudget: {
    fontFamily: font.regular,
    fontSize:   11,
    color:      colors.textTertiary,
  },
});
