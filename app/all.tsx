import React, { useCallback, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Account, Transaction, AccountSummary,
  getAllAccounts, getAllAccountsSummary, getAllTransactions,
} from '../src/db/queries';
import { SummaryBar } from '../src/components/SummaryBar';
import { TransactionRow } from '../src/components/TransactionRow';
import { Sloth } from '../src/components/Sloth';
import { colors, font, spacing } from '../src/theme';

export default function AllAccountsScreen() {
  const insets = useSafeAreaInsets();
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary,      setSummary]      = useState<AccountSummary | null>(null);
  const [loading,      setLoading]      = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [accts, txns, sum] = await Promise.all([
        getAllAccounts(), getAllTransactions(), getAllAccountsSummary(),
      ]);
      if (active) {
        setAccounts(accts);
        setTransactions(txns);
        setSummary(sum);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []));

  const accountMap = React.useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a])),
    [accounts],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Sloth sloth="sleeping" size={80} />
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'All Accounts' }} />
      <View style={styles.container}>
        {summary && (
          <SummaryBar
            incomeCents={summary.income_cents}
            expenseCents={summary.expense_cents}
            netCents={summary.net_cents}
          />
        )}
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              accountBadge={accountMap[item.account_id]?.name}
            />
          )}
          contentContainerStyle={[
            transactions.length === 0 && styles.emptyContainer,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sloth sloth="meditating" size={130} />
              <Text style={styles.emptyTitle}>All quiet here</Text>
              <Text style={styles.emptyBody}>
                Import a CSV from one of your accounts to see everything in one place.
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  emptyTitle: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  emptyBody: {
    fontFamily: font.regular, fontSize: 15, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
});
