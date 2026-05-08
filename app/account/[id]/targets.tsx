import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Account, Category,
  getAllAccounts, getAllCategories, getDistinctMonths,
  getBudgetsForAccountYear, getActualsByCategoryMonth,
} from '../../../src/db/queries';
import {
  Target,
  getTargetsForMonth,
} from '../../../src/db/queries/targets';
import { TargetCard } from '../../../src/components/TargetCard';
import { Sloth } from '../../../src/components/Sloth';
import { MonthPicker } from '../../../src/components/MonthPicker';
import { buildMonthList, monthLabel, MonthEntry, YearEntry } from '../../../src/domain/month';
import { colors, font, spacing, radius, accountColor } from '../../../src/theme';

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Build a MonthEntry list that covers target months too, not just TX months. */
function buildMergedMonthList(
  txMonths: Array<{ month: string; count: number }>,
  targetMonths: string[],
): MonthEntry[] {
  // Start from transaction months
  const base = buildMonthList(txMonths);
  if (base.length === 0 && targetMonths.length === 0) {
    // No data at all — just show current month
    const now = currentMonth();
    return [{ key: now, label: monthLabel(now), count: 0 }];
  }

  const present = new Set(base.map(m => m.key));
  const extras: MonthEntry[] = targetMonths
    .filter(m => !present.has(m))
    .map(m => ({ key: m, label: monthLabel(m), count: 0 }));

  // Merge and sort newest-first
  const all = [...base, ...extras].sort((a, b) => b.key.localeCompare(a.key));
  return all;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function TargetsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();

  const [account,    setAccount]    = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [month,      setMonth]      = useState(currentMonth());
  const [monthList,  setMonthList]  = useState<MonthEntry[]>([]);
  const [targets,    setTargets]    = useState<Target[]>([]);
  // actuals keyed by category_id → spent cents for the selected month
  const [actuals,    setActuals]    = useState<Map<string, number>>(new Map());
  // budget keyed by category_id → budget cents for the selected month
  const [budgets,    setBudgets]    = useState<Map<string, number>>(new Map());
  const [loading,    setLoading]    = useState(true);

  // ── Load screen data ──────────────────────────────────────────────────────

  async function loadDataForMonth(
    m: string,
    allCategories: Category[],
  ) {
    const year = m.slice(0, 4);
    const [tgts, yearActuals, yearBudgets] = await Promise.all([
      getTargetsForMonth(id, m),
      getActualsByCategoryMonth(id, year),
      getBudgetsForAccountYear(id, year),
    ]);

    // Build actuals map for this specific month
    const actualsMap = new Map<string, number>();
    for (const row of yearActuals) {
      if (row.month === m) actualsMap.set(row.category_id, row.total_cents);
    }

    // Build budgets map for this specific month
    const budgetsMap = new Map<string, number>();
    for (const b of yearBudgets) {
      if (b.month === m) budgetsMap.set(b.category_id, b.amount_cents);
    }

    setTargets(tgts);
    setActuals(actualsMap);
    setBudgets(budgetsMap);
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [accts, cats, txMonths] = await Promise.all([
        getAllAccounts(),
        getAllCategories(),
        getDistinctMonths(id),
      ]);
      if (!active) return;

      const acct = accts.find(a => a.id === id) ?? null;
      setAccount(acct);
      setCategories(cats);

      // Load targets for current month first to include target months in picker
      const now = currentMonth();
      const tgtsNow = await getTargetsForMonth(id, now);
      if (!active) return;

      const targetMonths = Array.from(new Set(tgtsNow.map(t => t.month)));
      const merged = buildMergedMonthList(txMonths, targetMonths);
      setMonthList(merged);

      // Pick a sensible default month — most recent with data, or today
      const defaultMonth = merged.find(m => m.count > 0)?.key ?? now;
      setMonth(defaultMonth);

      await loadDataForMonth(defaultMonth, cats);
      if (!active) return;
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  async function handleMonthChange(m: string) {
    setMonth(m);
    await loadDataForMonth(m, categories);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  // Account-level target (category_id = null)
  const accountTarget = targets.find(t => t.category_id === null) ?? null;

  // Category-level targets, sorted by category name
  const categoryTargets = targets
    .filter(t => t.category_id !== null)
    .sort((a, b) => {
      const nameA = categoryMap[a.category_id!]?.name ?? '';
      const nameB = categoryMap[b.category_id!]?.name ?? '';
      return nameA.localeCompare(nameB);
    });

  // Account total spending for month = sum of all categorized actuals
  const accountActualCents = Array.from(actuals.values()).reduce((sum, v) => sum + v, 0);

  const hasTargets = targets.length > 0;

  const accent = account ? accountColor[account.type] : colors.primary;

  // ── Navigate to setup flow (Issue 3) ──────────────────────────────────────
  // TODO(Issue 3): replace Alert with router.push to the Rachey setup flow.

  function handleSetGoals() {
    Alert.alert(
      'Set spending targets',
      'Rachey will walk you through setting a target for each category. Coming in the next update!',
      [{ text: 'Got it' }],
    );
  }

  // ── Empty years list — unused but required by MonthPicker ─────────────────
  const emptyYears: YearEntry[] = [];

  // ── Early return: loading ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Spending Targets',
          headerRight: hasTargets ? () => (
            <TouchableOpacity
              onPress={handleSetGoals}
              hitSlop={12}
              style={{ marginRight: 4 }}
            >
              <Text style={[styles.headerBtn, { color: accent }]}>Edit targets</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      {/* Month picker row */}
      <View style={[styles.pickerRow, { borderBottomColor: colors.border }]}>
        <MonthPicker
          months={monthList}
          years={emptyYears}
          filterMode="month"
          selectedMonth={month}
          selectedYear={month.slice(0, 4)}
          onChangeMonth={handleMonthChange}
          onChangeYear={() => {}}
        />
      </View>

      {/* No-targets empty state */}
      {!hasTargets ? (
        <View style={styles.emptyState}>
          <Sloth sloth="budgetGoals" size={130} />
          <Text style={styles.emptyTitle}>No targets set yet</Text>
          <Text style={styles.emptyBody}>
            Set soft monthly targets to stay mindful of your spending. No pressure — just a gentle nudge.
          </Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: accent }]}
            onPress={handleSetGoals}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Set targets with Rachey →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          {/* Account-level target card */}
          {accountTarget && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>OVERALL</Text>
              <TargetCard
                label={account?.name ?? 'Total Spending'}
                spentCents={Math.abs(accountActualCents)}
                targetCents={accountTarget.amount_cents}
              />
            </View>
          )}

          {/* Category-level target cards */}
          {categoryTargets.length > 0 && (
            <View style={styles.section}>
              {accountTarget && (
                <Text style={styles.sectionLabel}>BY CATEGORY</Text>
              )}
              <View style={styles.cards}>
                {categoryTargets.map(target => {
                  const cat     = categoryMap[target.category_id!];
                  const spent   = Math.abs(actuals.get(target.category_id!) ?? 0);
                  const budget  = budgets.get(target.category_id!);
                  return (
                    <TargetCard
                      key={target.id}
                      label={cat?.name ?? 'Unknown'}
                      dotColor={cat?.color}
                      spentCents={spent}
                      targetCents={target.amount_cents}
                      budgetCents={budget}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Set-goals FAB at bottom */}
          <TouchableOpacity
            style={[styles.editFab, { borderColor: accent }]}
            onPress={handleSetGoals}
            activeOpacity={0.8}
          >
            <Text style={[styles.editFabText, { color: accent }]}>+ Add / edit targets</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background,
  },

  headerBtn: {
    fontFamily: font.semiBold,
    fontSize:   15,
  },

  pickerRow: {
    backgroundColor:   colors.background,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical:   0,
  },

  // ── Empty state
  emptyState: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
    gap:               spacing.md,
    backgroundColor:   colors.background,
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
  ctaBtn: {
    marginTop:         spacing.md,
    paddingVertical:   15,
    paddingHorizontal: spacing.xl,
    borderRadius:      radius.full,
    alignItems:        'center',
  },
  ctaBtnText: {
    fontFamily: font.bold,
    fontSize:   16,
    color:      colors.textOnColor,
  },

  // ── Filled state
  list: {
    padding: spacing.md,
    gap:     spacing.lg,
    backgroundColor: colors.background,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily:   font.semiBold,
    fontSize:     11,
    color:        colors.textTertiary,
    letterSpacing: 0.8,
    marginLeft:   2,
  },
  cards: {
    gap: spacing.sm,
  },

  editFab: {
    marginTop:         spacing.sm,
    paddingVertical:   14,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    alignItems:        'center',
    backgroundColor:   colors.surface,
  },
  editFabText: {
    fontFamily: font.semiBold,
    fontSize:   15,
  },
});
