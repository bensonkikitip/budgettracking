import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Account, AccountSummary, getAllAccounts,
  getAllAccountsSummary, getAccountSummary,
} from '../src/db/queries';
import { SummaryBar } from '../src/components/SummaryBar';
import { Sloth } from '../src/components/Sloth';
import { colors, font, spacing, radius, accountColor } from '../src/theme';
import { centsToDollars } from '../src/domain/money';

interface AccountWithSummary extends Account { summary: AccountSummary }

export default function AccountsListScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const [accounts, setAccounts]     = useState<AccountWithSummary[]>([]);
  const [allSummary, setAllSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading]       = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const accts    = await getAllAccounts();
      const summaries = await Promise.all(accts.map(a => getAccountSummary(a.id)));
      const combined  = await getAllAccountsSummary();
      if (active) {
        setAccounts(accts.map((a, i) => ({ ...a, summary: summaries[i] })));
        setAllSummary(combined);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <Sloth sloth="sleeping" size={80} />
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      </View>
    );
  }

  const hasAccounts = accounts.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Slo & Steady' }} />
      <View style={styles.container}>
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.list,
            !hasAccounts && styles.listEmpty,
            { paddingBottom: insets.bottom + 80 },
          ]}
          ListHeaderComponent={hasAccounts ? (
            <TouchableOpacity onPress={() => router.push('/all')} activeOpacity={0.7}>
              <View style={styles.allCard}>
                <View style={styles.allCardTop}>
                  <Sloth sloth="piggyBank" size={56} />
                  <View style={styles.allCardText}>
                    <Text style={styles.allCardTitle}>All Accounts</Text>
                    <Text style={styles.allCardSub}>Combined view</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
                {allSummary && (
                  <SummaryBar
                    incomeCents={allSummary.income_cents}
                    expenseCents={allSummary.expense_cents}
                    netCents={allSummary.net_cents}
                  />
                )}
              </View>
            </TouchableOpacity>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/account/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.accountCard}>
                <View style={[
                  styles.accountAccent,
                  { backgroundColor: accountColor[item.type] },
                ]} />
                <View style={styles.accountCardInner}>
                  <View style={styles.accountCardTop}>
                    <View style={styles.accountInfo}>
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
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sloth sloth="laptop" size={140} />
              <Text style={styles.emptyTitle}>Welcome to Slo&nbsp;&amp;&nbsp;Steady</Text>
              <Text style={styles.emptyBody}>
                No rush — add your first account and{'\n'}we'll start tracking at our own pace.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/account/new')}
              >
                <Text style={styles.emptyButtonText}>Add First Account</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {hasAccounts && (
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
            onPress={() => router.push('/account/new')}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  list:      { padding: spacing.md, gap: spacing.md },
  listEmpty: { flex: 1 },

  // All accounts card
  allCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    shadowColor:     '#2C2416',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.07,
    shadowRadius:    8,
    elevation:       2,
  },
  allCardTop: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        spacing.md,
    gap:            spacing.md,
  },
  allCardText: { flex: 1 },
  allCardTitle: {
    fontFamily: font.bold,
    fontSize:   18,
    color:      colors.text,
  },
  allCardSub: {
    fontFamily: font.regular,
    fontSize:   13,
    color:      colors.textTertiary,
    marginTop:  2,
  },

  // Account cards
  accountCard: {
    flexDirection:   'row',
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    shadowColor:     '#2C2416',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.07,
    shadowRadius:    8,
    elevation:       2,
  },
  accountAccent: {
    width: 5,
  },
  accountCardInner: { flex: 1 },
  accountCardTop: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingTop:     spacing.md,
    paddingBottom:  spacing.sm,
    paddingHorizontal: spacing.md,
  },
  accountInfo:  { flex: 1 },
  accountName: {
    fontFamily: font.bold,
    fontSize:   17,
    color:      colors.text,
  },
  accountType: {
    fontFamily: font.regular,
    fontSize:   13,
    color:      colors.textSecondary,
    marginTop:  2,
  },
  lastImport: {
    fontFamily: font.regular,
    fontSize:   11,
    color:      colors.textTertiary,
    marginTop:  2,
  },
  chevron: {
    fontSize: 22,
    color:    colors.textTertiary,
    marginLeft: spacing.sm,
  },

  // Empty state
  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap:            spacing.md,
  },
  emptyTitle: {
    fontFamily: font.extraBold,
    fontSize:   24,
    color:      colors.text,
    textAlign:  'center',
    marginTop:  spacing.md,
  },
  emptyBody: {
    fontFamily: font.regular,
    fontSize:   15,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius:    radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginTop:       spacing.sm,
  },
  emptyButtonText: {
    fontFamily: font.bold,
    fontSize:   16,
    color:      colors.textOnColor,
  },

  // FAB
  fab: {
    position:       'absolute',
    right:          spacing.lg,
    width:          56,
    height:         56,
    borderRadius:   radius.full,
    backgroundColor: colors.primary,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    colors.primary,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.35,
    shadowRadius:   8,
    elevation:      6,
  },
  fabText: {
    fontSize:   30,
    color:      colors.textOnColor,
    lineHeight: 34,
    fontFamily: font.regular,
  },
});
