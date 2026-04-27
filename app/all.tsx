import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { Account, Transaction, getAllAccounts, getAllAccountsSummary, getAllTransactions, AccountSummary } from '../src/db/queries';
import { SummaryBar } from '../src/components/SummaryBar';
import { TransactionRow } from '../src/components/TransactionRow';

export default function AllAccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [accts, txns, sum] = await Promise.all([
          getAllAccounts(),
          getAllTransactions(),
          getAllAccountsSummary(),
        ]);
        if (active) {
          setAccounts(accts);
          setTransactions(txns);
          setSummary(sum);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, []),
  );

  const accountMap = React.useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              accountBadge={accountMap[item.account_id]?.name}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions yet.</Text>
              <Text style={styles.emptyHint}>Import a CSV from an account to get started.</Text>
            </View>
          }
          contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 8 },
  emptyHint: { fontSize: 15, color: '#8e8e93', textAlign: 'center', paddingHorizontal: 32 },
  emptyContainer: { flex: 1 },
});
