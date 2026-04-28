import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  Account, Category, Budget,
  getAllAccounts, getAllCategories, getDistinctYears,
  getBudgetsForAccountYear, setBudget, bulkSetBudgets, replaceBudgetsForYear,
  getActualsByCategoryMonth,
} from '../../../src/db/queries';
import { writeBackupSafe } from '../../../src/db/backup';
import { centsToDollars } from '../../../src/domain/money';
import {
  splitYearTotal, computeYearTotal, applyPercentage, monthsInYear,
} from '../../../src/domain/budget';
import { BudgetCellModal }        from '../../../src/components/BudgetCellModal';
import { BudgetRowActionsModal }   from '../../../src/components/BudgetRowActionsModal';
import { BudgetFillPercentModal }  from '../../../src/components/BudgetFillPercentModal';
import { colors, font, spacing, radius, accountColor } from '../../../src/theme';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COL_W   = 130;
const CELL_W      = 90;
const ROW_H       = 48;
const HEADER_H    = 40;

type BudgetMap = Map<string, Map<string, number>>; // categoryId → month → cents

function buildMap(rows: Budget[]): BudgetMap {
  const map: BudgetMap = new Map();
  for (const r of rows) {
    if (!map.has(r.category_id)) map.set(r.category_id, new Map());
    map.get(r.category_id)!.set(r.month, r.amount_cents);
  }
  return map;
}

function currentYear(): string {
  return String(new Date().getFullYear());
}

export default function BudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [account,    setAccount]    = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [year,       setYear]       = useState(currentYear());
  const [budgets,    setBudgets]    = useState<BudgetMap>(new Map());
  const [loading,    setLoading]    = useState(true);
  const [years,      setYears]      = useState<string[]>([]);

  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [cellModal,     setCellModal]     = useState<{ categoryId: string; month: string | 'year' } | null>(null);
  const [rowMenu,       setRowMenu]       = useState<{ categoryId: string } | null>(null);
  const [globalMenu,    setGlobalMenu]    = useState(false);
  const [pctModal,      setPctModal]      = useState<{ scope: 'all' | string; categoryId?: string } | null>(null);

  // Keeps the sticky header in sync with the data's horizontal scroll position
  const headerScrollRef = useRef<ScrollView>(null);

  const accent = account ? accountColor[account.type] : colors.primary;

  // Load initial data
  useEffect(() => {
    (async () => {
      const [accts, cats] = await Promise.all([getAllAccounts(), getAllCategories()]);
      const acct = accts.find(a => a.id === id) ?? null;
      setAccount(acct);
      setCategories(cats);

      // Continuous range from the earliest year with transaction data through current+2.
      // Gaps between the earliest data year and today are filled so the list is unbroken.
      const txYears = await getDistinctYears(id);
      const thisYear = parseInt(currentYear(), 10);
      const lastYear = thisYear + 2;
      const earliest = txYears.length > 0 ? parseInt(txYears[txYears.length - 1].year, 10) : thisYear;
      const firstYear = Math.min(earliest, thisYear);
      const merged = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => String(firstYear + i));
      setYears(merged);

      setLoading(false);
    })();
  }, [id]);

  // Reload budgets whenever year changes
  useEffect(() => {
    if (!id) return;
    getBudgetsForAccountYear(id, year).then(rows => setBudgets(buildMap(rows)));
  }, [id, year]);

  // ── Cell value helpers ──────────────────────────────────────────────────────

  function getCellValue(categoryId: string, month: string): number {
    return budgets.get(categoryId)?.get(month) ?? 0;
  }

  function getYearTotal(categoryId: string): number {
    return computeYearTotal(budgets.get(categoryId) ?? new Map(), year);
  }

  // ── Optimistic state update helpers ────────────────────────────────────────

  function patchCell(categoryId: string, month: string, cents: number) {
    setBudgets(prev => {
      const next = new Map(prev);
      const catMap = new Map(next.get(categoryId) ?? new Map());
      if (cents === 0) catMap.delete(month);
      else catMap.set(month, cents);
      next.set(categoryId, catMap);
      return next;
    });
  }

  function patchCategory(categoryId: string, monthMap: Map<string, number>) {
    setBudgets(prev => {
      const next = new Map(prev);
      next.set(categoryId, new Map(monthMap));
      return next;
    });
  }

  function patchAll(newMap: BudgetMap) {
    setBudgets(new Map(newMap));
  }

  // Merges a set of rows into the existing budget state without touching other cells.
  function patchCells(rows: Budget[]) {
    setBudgets(prev => {
      const next = new Map(prev);
      for (const r of rows) {
        const catMap = new Map(next.get(r.category_id) ?? new Map());
        if (r.amount_cents === 0) catMap.delete(r.month);
        else catMap.set(r.month, r.amount_cents);
        next.set(r.category_id, catMap);
      }
      return next;
    });
  }

  // ── Save single cell ───────────────────────────────────────────────────────

  async function handleCellSave(categoryId: string, month: string | 'year', cents: number) {
    setCellModal(null);
    if (month === 'year') {
      // Split year total into 12 months
      const split = splitYearTotal(cents);
      const months = monthsInYear(year);
      const rows: Budget[] = split.map((c, i) => ({
        account_id: id, category_id: categoryId, month: months[i], amount_cents: c,
      }));
      const newCatMap = new Map<string, number>();
      rows.forEach(r => { if (r.amount_cents !== 0) newCatMap.set(r.month, r.amount_cents); });
      patchCategory(categoryId, newCatMap);
      await bulkSetBudgets(rows);
    } else {
      patchCell(categoryId, month, cents);
      await setBudget(id, categoryId, month, cents);
    }
    writeBackupSafe();
  }

  // ── Fill from actuals ──────────────────────────────────────────────────────
  // Only updates months that have transaction data — future months are left untouched.

  async function fillFromActuals(categoryId?: string) {
    const actuals = await getActualsByCategoryMonth(id, year);
    const filtered = categoryId
      ? actuals.filter(r => r.category_id === categoryId)
      : actuals;

    const rows: Budget[] = filtered.map(r => ({
      account_id: id, category_id: r.category_id, month: r.month, amount_cents: r.total_cents,
    }));

    // bulkSetBudgets uses INSERT OR REPLACE per cell, so only months with data
    // are touched — existing budgets for future months are preserved.
    await bulkSetBudgets(rows);
    patchCells(rows);
    writeBackupSafe();
  }

  // ── Fill from last year + % ────────────────────────────────────────────────

  async function fillFromLastYear(pct: number, categoryId?: string) {
    const lastYear = String(parseInt(year, 10) - 1);
    const actuals  = await getActualsByCategoryMonth(id, lastYear);
    const filtered = categoryId
      ? actuals.filter(r => r.category_id === categoryId)
      : actuals;

    // Shift month keys from last year to this year
    const rows: Budget[] = filtered.map(r => ({
      account_id:   id,
      category_id:  r.category_id,
      month:        `${year}${r.month.slice(4)}`,
      amount_cents: applyPercentage(r.total_cents, pct),
    })).filter(r => r.amount_cents !== 0);

    await replaceBudgetsForYear(id, year, rows, categoryId);

    if (categoryId) {
      const newCatMap = new Map<string, number>();
      rows.forEach(r => newCatMap.set(r.month, r.amount_cents));
      patchCategory(categoryId, newCatMap);
    } else {
      patchAll(buildMap(rows));
    }
    writeBackupSafe();
  }

  // ── Clear ──────────────────────────────────────────────────────────────────

  async function clearBudgets(categoryId?: string) {
    await replaceBudgetsForYear(id, year, [], categoryId);
    if (categoryId) {
      patchCategory(categoryId, new Map());
    } else {
      patchAll(new Map());
    }
    writeBackupSafe();
  }

  // ── Row actions ────────────────────────────────────────────────────────────

  const rowMenuCat = categories.find(c => c.id === rowMenu?.categoryId) ?? null;

  function handleRowFillActuals() {
    if (!rowMenu) return;
    const { categoryId } = rowMenu;
    Alert.alert(
      'Fill from Actuals',
      `Set ${rowMenuCat?.name ?? ''}'s budget to actual spending for each month with data. Future months are not changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Fill', onPress: () => fillFromActuals(categoryId) },
      ],
    );
  }

  function handleRowFillLastYear() {
    if (!rowMenu) return;
    setPctModal({ scope: rowMenuCat?.name ?? '', categoryId: rowMenu.categoryId });
  }

  function handleRowClear() {
    if (!rowMenu) return;
    const { categoryId } = rowMenu;
    Alert.alert(
      'Clear Category Budget',
      `Remove all budget values for ${rowMenuCat?.name ?? ''} in ${year}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearBudgets(categoryId) },
      ],
    );
  }

  // ── Global menu actions ────────────────────────────────────────────────────

  function handleGlobalFillActuals() {
    setGlobalMenu(false);
    Alert.alert(
      'Fill All from Actuals',
      `Set budgets to actual spending for each month with data in ${year}. Future months are not changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Fill', onPress: () => fillFromActuals() },
      ],
    );
  }

  function handleGlobalFillLastYear() {
    setGlobalMenu(false);
    setPctModal({ scope: 'all' });
  }

  function handleGlobalClear() {
    setGlobalMenu(false);
    Alert.alert(
      'Clear Year Budget',
      `Remove all budget values for ${year}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearBudgets() },
      ],
    );
  }

  // ── Percent modal confirm ──────────────────────────────────────────────────

  function handlePctApply(pct: number) {
    const catId = pctModal?.categoryId;
    setPctModal(null);
    fillFromLastYear(pct, catId);
  }

  // ── Cell modal helpers ─────────────────────────────────────────────────────

  const cellModalCategory = categories.find(c => c.id === cellModal?.categoryId) ?? null;
  const cellModalCurrentCents = cellModal
    ? (cellModal.month === 'year'
        ? getYearTotal(cellModal.categoryId)
        : getCellValue(cellModal.categoryId, cellModal.month))
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const months = monthsInYear(year);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Budget',
          headerRight: () => (
            <TouchableOpacity onPress={() => setGlobalMenu(true)} hitSlop={12} style={{ marginRight: 4 }}>
              <Text style={[styles.menuDots, { color: accent }]}>•••</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Year dropdown button */}
      <View style={[styles.yearBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.yearDropdown, { borderColor: accent }]}
          onPress={() => setYearPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.yearDropdownText, { color: accent }]}>{year}</Text>
          <Text style={[styles.yearDropdownChevron, { color: accent }]}>▾</Text>
        </TouchableOpacity>
      </View>

      {categories.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No categories yet.{'\n'}Add categories to start budgeting.</Text>
        </View>
      ) : (
        <View style={styles.gridContainer}>

          {/* ── Sticky header row (outside vertical scroll) ── */}
          <View style={[styles.gridHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.leftHeaderCell, { borderRightColor: colors.border }]}>
              <Text style={styles.headerText}>Category</Text>
            </View>
            {/* Header cells mirror the data scroll via ref — scrollEnabled=false */}
            <ScrollView
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              ref={headerScrollRef}
              style={styles.headerScrollArea}
            >
              <View style={styles.headerRow}>
                <View style={[styles.headerCell, styles.yearHeaderCell, { borderLeftColor: colors.border }]}>
                  <Text style={[styles.headerText, { color: accent }]}>Year</Text>
                </View>
                {MONTH_SHORT.map((m, i) => (
                  <View key={i} style={[styles.headerCell, { borderLeftColor: colors.border }]}>
                    <Text style={styles.headerText}>{m}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* ── Scrollable body (vertical) ── */}
          <ScrollView style={styles.bodyScroll} bounces={false}>
            <View style={styles.bodyRow}>

              {/* Left sticky column — one cell per category, all identical height */}
              <View style={[styles.leftCol, { borderRightColor: colors.border }]}>
                {categories.map((cat, i) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.leftCell, i > 0 && styles.rowBorder, { borderTopColor: colors.separator }]}
                    onPress={() => setRowMenu({ categoryId: cat.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.catLabel} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Right data — rendered as COLUMNS so every cell is independently
                  height: ROW_H with no row-wrapper border adding extra pixels.
                  The horizontal scroll drives the sticky header ref. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={e => headerScrollRef.current?.scrollTo({
                  x: e.nativeEvent.contentOffset.x, animated: false,
                })}
              >
                <View style={styles.dataColumns}>

                  {/* Year-total column */}
                  <View style={[styles.dataCol, { borderLeftColor: colors.border }]}>
                    {categories.map((cat, i) => {
                      const yearTotal = getYearTotal(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.cell, styles.yearCell, i > 0 && styles.rowBorder, { borderTopColor: colors.separator }]}
                          onPress={() => setCellModal({ categoryId: cat.id, month: 'year' })}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.cellText, styles.yearCellText,
                            yearTotal !== 0 && { color: yearTotal < 0 ? colors.expense : colors.income },
                          ]}>
                            {yearTotal === 0 ? '—' : centsToDollars(yearTotal)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* One column per month */}
                  {months.map(month => (
                    <View key={month} style={[styles.dataCol, { borderLeftColor: colors.border }]}>
                      {categories.map((cat, i) => {
                        const val = getCellValue(cat.id, month);
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.cell, i > 0 && styles.rowBorder, { borderTopColor: colors.separator }]}
                            onPress={() => setCellModal({ categoryId: cat.id, month })}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.cellText,
                              val !== 0 && { color: val < 0 ? colors.expense : colors.income },
                            ]}>
                              {val === 0 ? '—' : centsToDollars(val)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}

                </View>
              </ScrollView>

            </View>
          </ScrollView>

        </View>
      )}

      {/* ── Year picker modal ── */}
      <Modal visible={yearPickerOpen} transparent animationType="slide" onRequestClose={() => setYearPickerOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setYearPickerOpen(false)} />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Year</Text>
          <View style={styles.menuCard}>
            {years.map((y, i) => (
              <React.Fragment key={y}>
                {i > 0 && <View style={styles.menuDivider} />}
                <TouchableOpacity
                  style={[styles.yearPickerRow, y === year && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setYear(y); setYearPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearPickerRowText, y === year && { color: accent }]}>{y}</Text>
                  {y === year && <Text style={[styles.yearPickerCheck, { color: accent }]}>✓</Text>}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setYearPickerOpen(false)} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* ── Global menu modal ── */}
      <Modal visible={globalMenu} transparent animationType="slide" onRequestClose={() => setGlobalMenu(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setGlobalMenu(false)} />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Budget {year}</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleGlobalFillActuals} activeOpacity={0.7}>
              <Text style={styles.menuItemText}>Fill All from Actuals</Text>
              <Text style={styles.menuItemSub}>Overwrite all with {year} actual spending</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleGlobalFillLastYear} activeOpacity={0.7}>
              <Text style={styles.menuItemText}>Fill All from Last Year + %</Text>
              <Text style={styles.menuItemSub}>Scale {String(parseInt(year, 10) - 1)} actuals by a percentage</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleGlobalClear} activeOpacity={0.7}>
              <Text style={[styles.menuItemText, { color: colors.destructive }]}>Clear Year</Text>
              <Text style={styles.menuItemSub}>Remove all budget values for {year}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setGlobalMenu(false)} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* ── Row actions modal ── */}
      <BudgetRowActionsModal
        visible={!!rowMenu}
        category={rowMenuCat}
        year={year}
        onClose={() => setRowMenu(null)}
        onFillActuals={handleRowFillActuals}
        onFillLastYear={handleRowFillLastYear}
        onClearCategory={handleRowClear}
      />

      {/* ── Cell edit modal ── */}
      <BudgetCellModal
        visible={!!cellModal}
        category={cellModalCategory}
        month={cellModal?.month ?? 'year'}
        year={year}
        currentCents={cellModalCurrentCents}
        onClose={() => setCellModal(null)}
        onSave={(cents) => handleCellSave(cellModal!.categoryId, cellModal!.month, cents)}
      />

      {/* ── Percent fill modal ── */}
      <BudgetFillPercentModal
        visible={!!pctModal}
        scope={pctModal?.scope ?? 'all'}
        lastYear={String(parseInt(year, 10) - 1)}
        onClose={() => setPctModal(null)}
        onApply={handlePctApply}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyText: { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  menuDots:  { fontFamily: font.bold, fontSize: 18, letterSpacing: 2 },

  yearBar: {
    backgroundColor: colors.background, borderBottomWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: 'row',
  },
  yearDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  yearDropdownText:    { fontFamily: font.bold, fontSize: 15 },
  yearDropdownChevron: { fontFamily: font.bold, fontSize: 12, marginTop: 1 },

  yearPickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 15,
  },
  yearPickerRowText:  { fontFamily: font.semiBold, fontSize: 16, color: colors.text, flex: 1 },
  yearPickerCheck:    { fontFamily: font.bold, fontSize: 16 },

  gridContainer: { flex: 1, backgroundColor: colors.background },

  // Sticky header (outside vertical scroll)
  gridHeader: {
    flexDirection:   'row',
    borderBottomWidth: 1,
    backgroundColor: colors.surfaceAlt,
  },
  leftHeaderCell: {
    width:             CAT_COL_W,
    height:            HEADER_H,
    justifyContent:    'center',
    paddingHorizontal: spacing.sm,
    borderRightWidth:  1,
  },
  headerScrollArea: { flex: 1 },
  headerRow:        { flexDirection: 'row' },
  headerCell: {
    width: CELL_W, height: HEADER_H,
    justifyContent: 'center', alignItems: 'center',
    borderLeftWidth: 1,
  },
  yearHeaderCell: { width: CELL_W + 10 },
  headerText: { fontFamily: font.semiBold, fontSize: 11, color: colors.textTertiary, letterSpacing: 0.5 },

  // Vertical body
  bodyScroll: { flex: 1 },
  bodyRow:    { flexDirection: 'row', alignItems: 'flex-start' },

  leftCol:  { width: CAT_COL_W, borderRightWidth: 1 },
  leftCell: {
    height:            ROW_H,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    gap:               6,
  },
  // Applied from index 1 onwards on both left cells and data cells
  rowBorder: { borderTopWidth: 1 },
  catDot:    { width: 8, height: 8, borderRadius: radius.full, flexShrink: 0 },
  catLabel:  { fontFamily: font.semiBold, fontSize: 12, color: colors.text, flex: 1 },

  // Column-based data layout: one View per column, cells stacked vertically inside
  dataColumns: { flexDirection: 'row' },
  dataCol:     { borderLeftWidth: 1 },
  cell: {
    width:             CELL_W,
    height:            ROW_H,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: 4,
  },
  yearCell:     { width: CELL_W + 10, backgroundColor: colors.surfaceAlt },
  cellText:     { fontFamily: font.semiBold, fontSize: 11, color: colors.textTertiary, textAlign: 'center' },
  yearCellText: { fontSize: 11, color: colors.textSecondary },

  // Shared sheet styles
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor:      colors.background,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal:    spacing.md,
    paddingBottom:        spacing.lg,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.md,
  },
  sheetTitle: { fontFamily: font.bold, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  menuCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.sm,
  },
  menuItem:     { paddingHorizontal: spacing.md, paddingVertical: 14 },
  menuItemText: { fontFamily: font.semiBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  menuItemSub:  { fontFamily: font.regular, fontSize: 12, color: colors.textTertiary },
  menuDivider:  { height: 1, backgroundColor: colors.separator },
  cancelBtn: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontFamily: font.semiBold, fontSize: 16, color: colors.textSecondary },
});
