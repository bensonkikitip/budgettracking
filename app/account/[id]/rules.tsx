import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Modal, TextInput, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Rule, Category, MatchType,
  getRulesForAccount, getAllCategories,
  insertRule, updateRule, deleteRule, reorderRules, insertCategory,
} from '../../../src/db/queries';
import { autoApplyRulesForAccount } from '../../../src/domain/rules-engine';
import { CATEGORY_COLORS } from '../../../src/domain/category-colors';
import { Sloth } from '../../../src/components/Sloth';
import { colors, font, spacing, radius } from '../../../src/theme';
import * as Crypto from 'expo-crypto';

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'contains',    label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with',   label: 'Ends with' },
  { value: 'equals',      label: 'Equals' },
];

type CatPhase = 'pill' | 'list' | 'create';

interface RuleWithCategory extends Rule { categoryName: string; categoryColor: string; }

export default function AccountRulesScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const [rules,         setRules]         = useState<RuleWithCategory[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [sheetOpen,     setSheetOpen]     = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [matchType,     setMatchType]     = useState<MatchType>('contains');
  const [matchText,     setMatchText]     = useState('');
  const [categoryId,    setCategoryId]    = useState('');
  const [saving,        setSaving]        = useState(false);
  const [catPhase,      setCatPhase]      = useState<CatPhase>('pill');
  const [newCatName,    setNewCatName]    = useState('');
  const [newCatColor,   setNewCatColor]   = useState(CATEGORY_COLORS[0].hex);
  const [creatingCat,   setCreatingCat]   = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [rawRules, cats] = await Promise.all([
        getRulesForAccount(id),
        getAllCategories(),
      ]);
      if (!active) return;
      const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
      setRules(rawRules.map(r => ({
        ...r,
        categoryName:  catMap[r.category_id]?.name  ?? '(deleted)',
        categoryColor: catMap[r.category_id]?.color ?? colors.textTertiary,
      })));
      setCategories(cats);
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  function openAddSheet() {
    setEditingRuleId(null);
    setMatchType('contains');
    setMatchText('');
    if (categories.length > 0) setCategoryId(categories[0].id);
    resetCatForm();
    setCatPhase('pill');
    setSheetOpen(true);
  }

  function openEditSheet(rule: RuleWithCategory) {
    setEditingRuleId(rule.id);
    setMatchType(rule.match_type);
    setMatchText(rule.match_text);
    setCategoryId(rule.category_id);
    resetCatForm();
    setCatPhase('pill');
    setSheetOpen(true);
  }

  function resetCatForm() {
    setNewCatName('');
    setNewCatColor(CATEGORY_COLORS[0].hex);
  }

  async function handleQuickCreateCat() {
    const trimmed = newCatName.trim();
    if (!trimmed || creatingCat) return;
    setCreatingCat(true);
    try {
      const newId = Crypto.randomUUID();
      await insertCategory({ id: newId, name: trimmed, color: newCatColor });
      const newCat: Category = { id: newId, name: trimmed, color: newCatColor, created_at: Date.now() };
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(newId);
      setCatPhase('pill');
      resetCatForm();
    } finally {
      setCreatingCat(false);
    }
  }

  async function reloadRules() {
    const [rawRules, cats] = await Promise.all([getRulesForAccount(id), getAllCategories()]);
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
    setRules(rawRules.map(r => ({
      ...r,
      categoryName:  catMap[r.category_id]?.name  ?? '(deleted)',
      categoryColor: catMap[r.category_id]?.color ?? colors.textTertiary,
    })));
  }

  async function handleSaveRule() {
    const text = matchText.trim();
    if (!text || !categoryId) return;
    setSaving(true);
    try {
      if (editingRuleId) {
        await updateRule(editingRuleId, { match_type: matchType, match_text: text, category_id: categoryId });
        await reloadRules();
        setSheetOpen(false);
      } else {
        const maxPriority = rules.length > 0 ? Math.max(...rules.map(r => r.priority)) : 0;
        await insertRule({
          id: Crypto.randomUUID(),
          account_id: id,
          category_id: categoryId,
          match_type: matchType,
          match_text: text,
          priority: maxPriority + 1,
        });
        await reloadRules();
        setSheetOpen(false);
        Alert.alert(
          'Rule saved!',
          'Want to apply this rule to your existing uncategorized transactions now?',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Apply Now',
              onPress: async () => {
                const count = await autoApplyRulesForAccount(id);
                Alert.alert('Done!', `Categorized ${count} transaction${count === 1 ? '' : 's'}.`);
              },
            },
          ],
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    Alert.alert(
      'Delete Rule',
      'This rule will be removed. Transactions already categorized by it will keep their category.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteRule(ruleId);
            setRules(prev => prev.filter(r => r.id !== ruleId));
          },
        },
      ],
    );
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newRules = [...rules];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newRules.length) return;
    [newRules[index], newRules[swapWith]] = [newRules[swapWith], newRules[index]];
    setRules(newRules);
    await reorderRules(newRules.map(r => r.id));
  }

  const selectedCat = categories.find(c => c.id === categoryId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rules',
          headerRight: () => (
            <TouchableOpacity onPress={openAddSheet} hitSlop={12}>
              <Text style={styles.addBtn}>Add</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <FlatList
          data={rules}
          keyExtractor={r => r.id}
          contentContainerStyle={rules.length === 0 && styles.listEmpty}
          ListHeaderComponent={rules.length > 0 ? (
            <Text style={styles.hint}>Rules run top-to-bottom on import. First match wins. Tap a rule to edit it.</Text>
          ) : null}
          renderItem={({ item, index }) => (
            <View style={[styles.ruleRow, index > 0 && styles.rowBorder]}>
              <TouchableOpacity style={styles.ruleInfo} onPress={() => openEditSheet(item)} activeOpacity={0.6}>
                <Text style={styles.ruleMatchLine}>
                  <Text style={styles.ruleMatchType}>{MATCH_TYPES.find(m => m.value === item.match_type)?.label ?? item.match_type}</Text>
                  {' "'}
                  <Text style={styles.ruleMatchText}>{item.match_text}</Text>
                  {'"'}
                </Text>
                <View style={styles.ruleCategoryRow}>
                  <View style={[styles.ruleCatDot, { backgroundColor: item.categoryColor }]} />
                  <Text style={styles.ruleCatName}>{item.categoryName}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.ruleActions}>
                <TouchableOpacity onPress={() => handleMove(index, 'up')} disabled={index === 0} hitSlop={8}>
                  <Text style={[styles.arrow, index === 0 && styles.arrowDisabled]}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMove(index, 'down')} disabled={index === rules.length - 1} hitSlop={8}>
                  <Text style={[styles.arrow, index === rules.length - 1 && styles.arrowDisabled]}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={8}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sloth sloth="meditating" size={120} />
              <Text style={styles.emptyTitle}>No rules yet</Text>
              <Text style={styles.emptyBody}>
                Tap "Add" to create a rule. I'll use it to automatically categorize transactions when you import.
              </Text>
            </View>
          }
        />
      </View>

      {/* Add / Edit Rule Sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSheetOpen(false)} />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetContent}>
            {/* ── Category list phase ── */}
            {catPhase === 'list' && (
              <>
                <View style={styles.listHeader}>
                  <TouchableOpacity onPress={() => setCatPhase('pill')} hitSlop={12}>
                    <Text style={styles.backBtn}>← Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>Select Category</Text>
                  <View style={styles.headerSpacer} />
                </View>
                <FlatList
                  style={styles.catList}
                  data={categories}
                  keyExtractor={c => c.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item, index }) => {
                    const isSelected = item.id === categoryId;
                    return (
                      <TouchableOpacity
                        style={[styles.catRow, index > 0 && styles.catRowBorder, isSelected && styles.catRowSelected]}
                        onPress={() => { setCategoryId(item.id); setCatPhase('pill'); }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.catRowDot, { backgroundColor: item.color }]} />
                        <Text style={styles.catRowLabel}>{item.name}</Text>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.catEmptyWrap}>
                      <Text style={styles.catEmptyText}>No categories yet — create one below.</Text>
                    </View>
                  }
                  ListFooterComponent={
                    <TouchableOpacity
                      style={[styles.catRow, categories.length > 0 && styles.catRowBorder]}
                      onPress={() => setCatPhase('create')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.newCatListBtn}>+ New Category</Text>
                    </TouchableOpacity>
                  }
                />
              </>
            )}

            {/* ── Inline create phase ── */}
            {catPhase === 'create' && (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
                <View style={styles.listHeader}>
                  <TouchableOpacity onPress={() => setCatPhase('list')} hitSlop={12}>
                    <Text style={styles.backBtn}>← Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>New Category</Text>
                  <View style={styles.headerSpacer} />
                </View>
                <Text style={styles.sheetLabel}>Name</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder="e.g. Groceries"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleQuickCreateCat}
                />
                <Text style={[styles.sheetLabel, { marginTop: spacing.sm }]}>Color</Text>
                <View style={styles.colorGrid}>
                  {CATEGORY_COLORS.map(c => (
                    <TouchableOpacity
                      key={c.hex}
                      style={[styles.colorSwatch, { backgroundColor: c.hex }, newCatColor === c.hex && styles.colorSwatchSelected]}
                      onPress={() => setNewCatColor(c.hex)}
                      activeOpacity={0.8}
                    >
                      {newCatColor === c.hex && <Text style={styles.colorCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, (!newCatName.trim() || creatingCat) && styles.saveBtnDisabled]}
                  onPress={handleQuickCreateCat}
                  disabled={!newCatName.trim() || creatingCat}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>{creatingCat ? 'Saving…' : 'Create & Select'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* ── Main form phase (pill) ── */}
            {catPhase === 'pill' && (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
                <Text style={styles.sheetTitle}>{editingRuleId ? 'Edit Rule' : 'Add Rule'}</Text>

                <Text style={styles.sheetLabel}>Match type</Text>
                <View style={styles.tabs}>
                  {MATCH_TYPES.map(m => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.tab, matchType === m.value && styles.tabActive]}
                      onPress={() => setMatchType(m.value)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tabText, matchType === m.value && styles.tabTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sheetLabel}>Text to match (case-insensitive)</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={matchText}
                  onChangeText={setMatchText}
                  placeholder="e.g. whole foods"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />

                <Text style={styles.sheetLabel}>Assign category</Text>
                <TouchableOpacity
                  style={styles.catPill}
                  onPress={() => setCatPhase('list')}
                  activeOpacity={0.75}
                >
                  {selectedCat && <View style={[styles.catPillDot, { backgroundColor: selectedCat.color }]} />}
                  <Text style={styles.catPillText} numberOfLines={1}>
                    {selectedCat?.name ?? 'Select category…'}
                  </Text>
                  <Text style={styles.catPillChevron}>▾</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, (!matchText.trim() || !categoryId || saving) && styles.saveBtnDisabled]}
                  onPress={handleSaveRule}
                  disabled={!matchText.trim() || !categoryId || saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Saving…' : editingRuleId ? 'Save Changes' : 'Add Rule'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  addBtn:    { fontFamily: font.semiBold, fontSize: 15, color: colors.primary },
  listEmpty: { flex: 1 },

  hint: {
    fontFamily: font.regular, fontSize: 13, color: colors.textTertiary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },

  ruleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  rowBorder:  { borderTopWidth: 1, borderTopColor: colors.separator },
  ruleInfo:   { flex: 1 },
  ruleMatchLine: { fontFamily: font.regular, fontSize: 15, color: colors.text, marginBottom: 4 },
  ruleMatchType: { fontFamily: font.semiBold, color: colors.textSecondary },
  ruleMatchText: { fontFamily: font.semiBold, color: colors.primary },
  ruleCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleCatDot:  { width: 10, height: 10, borderRadius: radius.full },
  ruleCatName: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },

  ruleActions:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  arrow:         { fontSize: 18, color: colors.primary, fontFamily: font.bold },
  arrowDisabled: { color: colors.border },
  deleteBtn:     { fontSize: 16, color: colors.destructive, fontFamily: font.bold },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  emptyTitle: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  emptyBody:  { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    height: '80%', paddingBottom: spacing.lg,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm,
  },
  sheetContent: { flex: 1 },
  catList:      { flex: 1 },
  sheetTitle:   { fontFamily: font.bold, fontSize: 17, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  sheetLabel:   { fontFamily: font.semiBold, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.4 },
  sheetScroll:  { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },

  listHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  backBtn:       { fontFamily: font.semiBold, fontSize: 15, color: colors.primary },
  headerSpacer:  { width: 48 },

  // Category list rows (match MonthPicker style)
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  catRowBorder:   { borderTopWidth: 1, borderTopColor: colors.separator },
  catRowSelected: { backgroundColor: colors.primaryLight },
  catRowDot:      { width: 12, height: 12, borderRadius: radius.full, marginRight: spacing.sm },
  catRowLabel:    { fontFamily: font.semiBold, fontSize: 15, color: colors.text, flex: 1 },
  checkmark:      { fontFamily: font.bold, fontSize: 15, color: colors.primary },
  newCatListBtn:  { fontFamily: font.semiBold, fontSize: 15, color: colors.primary, flex: 1 },
  catEmptyWrap:   { padding: spacing.lg, alignItems: 'center' },
  catEmptyText:   { fontFamily: font.regular, fontSize: 14, color: colors.textTertiary },

  // Category pill (matches MonthPicker pill exactly)
  catPill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 7, paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  catPillDot:     { width: 10, height: 10, borderRadius: radius.full },
  catPillText:    { fontFamily: font.semiBold, fontSize: 15, color: colors.text },
  catPillChevron: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },

  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  tab: {
    paddingVertical: 7, paddingHorizontal: spacing.md,
    borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
  },
  tabActive:     { backgroundColor: colors.primary },
  tabText:       { fontFamily: font.semiBold, fontSize: 14, color: colors.textSecondary },
  tabTextActive: { color: colors.textOnColor },

  sheetInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontFamily: font.regular, fontSize: 16, color: colors.text,
    marginBottom: spacing.md,
  },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  colorSwatch: {
    width: 36, height: 36, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  colorCheck: { fontSize: 14, color: '#fff', fontFamily: font.bold },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText:     { fontFamily: font.bold, fontSize: 16, color: colors.textOnColor },
});
