import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Account, AccountSummary, Transaction,
  getAllAccounts, getAccountSummary, getTransactions, deleteAccount,
} from '../../../src/db/queries';
import { SummaryBar } from '../../../src/components/SummaryBar';
import { TransactionRow } from '../../../src/components/TransactionRow';
import { Sloth } from '../../../src/components/Sloth';
import { colors, font, spacing, radius, accountColor } from '../../../src/theme';

export default function AccountDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const [account,      setAccount]      = useState<Account | null>(null);
  const [summary,      setSummary]      = useState<AccountSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const accts = await getAllAccounts();
      const acct  = accts.find(a => a.id === id) ?? null;
      const [sum, txns] = await Promise.all([getAccountSummary(id), getTransactions(id)]);
      if (active) {
        setAccount(acct);
        setSummary(sum);
        setTransactions(txns);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]));

  function handleDelete() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete this account and all its transactions. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteAccount(id); router.back(); },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Sloth sloth="sleeping" size={80} />
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.center}>
        <Sloth sloth="box" size={80} />
        <Text style={styles.notFound}>Account not found.</Text>
      </View>
    );
  }

  const accent = accountColor[account.type];

  return (
    <>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} hitSlop={12}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Coloured type strip */}
        <View style={[styles.typeStrip, { backgroundColor: accent }]}>
          <Text style={styles.typeStripText}>
            {account.type === 'checking' ? 'Checking Account' : 'Credit Card'}
          </Text>
        </View>

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
          renderItem={({ item }) => <TransactionRow transaction={item} />}
          contentContainerStyle={[
            transactions.length === 0 && styles.emptyContainer,
            { paddingBottom: insets.bottom + 88 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sloth sloth="receipt" size={120} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyBody}>Import a CSV to see your transactions here.</Text>
            </View>
          }
        />

        <TouchableOpacity
          style={[styles.importFab, { bottom: insets.bottom + spacing.lg, backgroundColor: accent }]}
          onPress={() => router.push(`/account/${id}/import`)}
          activeOpacity={0.85}
        >
          <Text style={styles.importFabText}>Import CSV</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background },
  notFound:  { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary },

  typeStrip: {
    paddingVertical:   6,
    paddingHorizontal: spacing.md,
  },
  typeStripText: {
    fontFamily: font.semiBold,
    fontSize:   12,
    color:      colors.textOnColor,
    letterSpacing: 0.4,
  },

  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: font.bold,
    fontSize:   20,
    color:      colors.text,
    marginTop:  spacing.sm,
  },
  emptyBody: {
    fontFamily: font.regular,
    fontSize:   15,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: 22,
  },

  deleteBtn: {
    fontFamily: font.semiBold,
    fontSize:   15,
    color:      colors.destructive,
    marginRight: 4,
  },

  importFab: {
    position:         'absolute',
    left:             spacing.lg,
    right:            spacing.lg,
    borderRadius:     radius.full,
    paddingVertical:  16,
    alignItems:       'center',
    shadowColor:      '#2C2416',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.2,
    shadowRadius:     8,
    elevation:        6,
  },
  importFabText: {
    fontFamily: font.bold,
    fontSize:   17,
    color:      colors.textOnColor,
  },
});
