import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import {
  Account,
  AccountSummary,
  Transaction,
  getAllAccounts,
  getAccountSummary,
  getTransactions,
  deleteAccount,
} from '../../../src/db/queries';
import { SummaryBar } from '../../../src/components/SummaryBar';
import { TransactionRow } from '../../../src/components/TransactionRow';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const accounts = await getAllAccounts();
        const acct = accounts.find((a) => a.id === id) ?? null;
        const [sum, txns] = await Promise.all([
          getAccountSummary(id),
          getTransactions(id),
        ]);
        if (active) {
          setAccount(acct);
          setSummary(sum);
          setTransactions(txns);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [id]),
  );

  function handleDelete() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete the account and all its transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(id);
            router.back();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.center}>
        <Text>Account not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          ),
        }}
      />
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
          renderItem={({ item }) => <TransactionRow transaction={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions yet.</Text>
              <Text style={styles.emptyHint}>Import a CSV to get started.</Text>
            </View>
          }
          contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
        />

        <TouchableOpacity
          style={styles.importButton}
          onPress={() => router.push(`/account/${id}/import`)}
        >
          <Text style={styles.importButtonText}>Import CSV</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 8 },
  emptyHint: { fontSize: 15, color: '#8e8e93' },
  emptyContainer: { flex: 1 },
  importButton: {
    margin: 16,
    backgroundColor: '#007aff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  importButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  deleteBtn: { marginRight: 4 },
  deleteBtnText: { color: '#ff3b30', fontSize: 16 },
});
