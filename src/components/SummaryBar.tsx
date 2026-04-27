import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { centsToDollars } from '../domain/money';

interface Props {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

export function SummaryBar({ incomeCents, expenseCents, netCents }: Props) {
  return (
    <View style={styles.container}>
      <SummaryCell label="Income" cents={incomeCents} color="#2a9d5c" />
      <SummaryCell label="Expenses" cents={expenseCents} color="#e05c5c" />
      <SummaryCell label="Net" cents={netCents} color={netCents >= 0 ? '#2a9d5c' : '#e05c5c'} />
    </View>
  );
}

function SummaryCell({ label, cents, color }: { label: string; cents: number; color: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color }]}>{centsToDollars(cents)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
