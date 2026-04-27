import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Account, AccountSummary, getAllAccounts, getAllAccountsSummary, getAccountSummary } from '../src/db/queries';
import { SummaryBar } from '../src/components/SummaryBar';

interface AccountWithSummary extends Account {
  summary: AccountSummary;
}

export default function AccountsListScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithSummary[]>([]);
  const [allSummary, setAllSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const accts = await getAllAccounts();
        const summaries = await Promise.all(accts.map((a) => getAccountSummary(a.id)));
        const combined = await getAllAccountsSummary();
        if (active) {
          setAccounts(accts.map((a, i) => ({ ...a, summary: summaries[i] })));
          setAllSummary(combined);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {allSummary && accounts.length > 0 && (
        <TouchableOpacity onPress={() => router.push('/all')}>
          <View style={styles.allRow}>
            <Text style={styles.allLabel}>All Accounts</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <SummaryBar
            incomeCents={allSummary.income_cents}
            expenseCents={allSummary.expense_cents}
            netCents={allSummary.net_cents}
          />
        </TouchableOpacity>
      )}

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/account/${item.id}`)}>
            <View style={styles.accountRow}>
              <View style={styles.accountLeft}>
                <Text style={styles.accountName}>{item.name}</Text>
                <Text style={styles.accountType}>
                  {item.type === 'checking' ? 'Checking' : 'Credit Card'}
                </Text>
                {item.summary.last_imported_at && (
                  <Text style={styles.lastImport}>
                    Last import: {new Date(item.summary.last_imported_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
            <SummaryBar
              incomeCents={item.summary.income_cents}
              expenseCents={item.summary.expense_cents}
              netCents={item.summary.net_cents}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No accounts yet.</Text>
            <Text style={styles.emptyHint}>Tap + to add your first account.</Text>
          </View>
        }
        contentContainerStyle={accounts.length === 0 ? styles.emptyContainer : undefined}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/account/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// Note: title set via Stack.Screen in the layout
export function unstable_settings() {
  return { title: 'Accounts' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
    marginBottom: 0,
  },
  allLabel: { fontSize: 17, fontWeight: '700', color: '#1c1c1e' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d1d6',
  },
  accountLeft: { flex: 1 },
  accountName: { fontSize: 17, fontWeight: '600', color: '#1c1c1e' },
  accountType: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  lastImport: { fontSize: 12, color: '#aeaeb2', marginTop: 2 },
  chevron: { fontSize: 20, color: '#c7c7cc', marginLeft: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 8 },
  emptyHint: { fontSize: 15, color: '#8e8e93' },
  emptyContainer: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: { fontSize: 32, color: '#fff', lineHeight: 36 },
});
