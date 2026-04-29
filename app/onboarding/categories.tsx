/**
 * First-time user — Starter categories checklist.
 *
 * Pre-checks all 10 STARTER_CATEGORIES. User can:
 *   - tap a row to expand it and edit name + emoji inline
 *   - uncheck a row to skip it
 *   - tap "Save & continue" → bulk-insert checked rows, set intro_completed,
 *     navigate to /account/new
 *
 * Names of the first 6 starter categories MUST match the matching foundational
 * rules' defaultCategoryName so the next onboarding step can auto-map them.
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { bulkInsertCategories, setPreference } from '../../src/db/queries';
import { STARTER_CATEGORIES } from '../../src/domain/starter-categories';
import { CATEGORY_EMOJIS } from '../../src/domain/category-emojis';
import { Sloth } from '../../src/components/Sloth';
import { colors, font, spacing, radius } from '../../src/theme';

interface RowState {
  checked: boolean;
  name:    string;
  emoji:   string;
}

export default function OnboardingCategoriesScreen() {
  const router = useRouter();

  // Initial row state — derived from STARTER_CATEGORIES, all checked.
  const [rows, setRows] = useState<RowState[]>(
    () => STARTER_CATEGORIES.map(c => ({
      checked: true, name: c.name, emoji: c.emoji,
    })),
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);

  const checkedCount = useMemo(() => rows.filter(r => r.checked).length, [rows]);

  function toggleChecked(i: number) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, checked: !r.checked } : r));
  }
  function setName(i: number, name: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, name } : r));
  }
  function setEmoji(i: number, emoji: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, emoji } : r));
  }

  async function handleContinue() {
    // Names must be non-empty and unique (DB allows dupes but it'd confuse the user)
    const checked = rows.filter(r => r.checked);
    const names = checked.map(r => r.name.trim());
    if (names.some(n => !n)) {
      Alert.alert('Name required', 'Each checked category needs a name. Uncheck the empty ones or fill them in.');
      return;
    }
    const lower = names.map(n => n.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      Alert.alert('Duplicate names', 'Two of your categories have the same name. Rename one or uncheck it.');
      return;
    }

    setSaving(true);
    try {
      const toInsert = checked.map((r, i) => {
        const starter = STARTER_CATEGORIES[rows.findIndex(row => row === r)] ?? STARTER_CATEGORIES[i];
        return {
          id:          Crypto.randomUUID(),
          name:        r.name.trim(),
          color:       starter.color,
          emoji:       r.emoji,
          description: starter.description,
        };
      });
      await bulkInsertCategories(toInsert);
      await setPreference('intro_completed', 'true');
      router.replace('/account/new');
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Something went wrong.');
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Sloth sloth="writing" size={100} />
          <Text style={styles.title}>Pick your starter categories</Text>
          <Text style={styles.subtitle}>
            I picked some basics. Uncheck what you don't need, and tap any row
            to rename it or change the emoji. You can always edit them later.
          </Text>
        </View>

        {/* Checklist card */}
        <View style={styles.card}>
          {rows.map((row, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <View
                key={i}
                style={[
                  styles.row,
                  i > 0 && styles.rowBorder,
                  !row.checked && styles.rowMuted,
                ]}
              >
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => setExpandedIdx(isExpanded ? null : i)}
                  activeOpacity={0.7}
                >
                  {/* Checkbox */}
                  <TouchableOpacity
                    style={[styles.checkbox, row.checked && styles.checkboxChecked]}
                    onPress={() => toggleChecked(i)}
                    hitSlop={10}
                  >
                    {row.checked && <Text style={styles.checkboxMark}>✓</Text>}
                  </TouchableOpacity>

                  <Text style={styles.rowEmoji}>{row.emoji}</Text>
                  <Text style={[styles.rowName, !row.checked && styles.rowNameMuted]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expanded}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={row.name}
                      onChangeText={(v) => setName(i, v)}
                      placeholderTextColor={colors.textTertiary}
                      returnKeyType="done"
                    />

                    <Text style={[styles.label, { marginTop: spacing.sm }]}>Emoji</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.emojiRow}
                    >
                      {CATEGORY_EMOJIS.map(e => (
                        <TouchableOpacity
                          key={e}
                          style={[
                            styles.emojiChip,
                            row.emoji === e && styles.emojiChipSelected,
                          ]}
                          onPress={() => setEmoji(i, e)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.emojiGlyph}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.helperText}>
          {checkedCount} categor{checkedCount === 1 ? 'y' : 'ies'} selected. You
          can add more from the Categories screen anytime.
        </Text>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        {saving ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <TouchableOpacity
            style={[styles.cta, checkedCount === 0 && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={checkedCount === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              Save & continue →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },

  header: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  title: {
    fontFamily: font.extraBold, fontSize: 22, color: colors.text,
    textAlign: 'center', marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: font.regular, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },

  row: { paddingHorizontal: spacing.md, paddingVertical: 4 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  rowMuted:  { opacity: 0.55 },
  rowMain: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: spacing.sm,
  },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark:    { color: colors.textOnColor, fontFamily: font.bold, fontSize: 14 },

  rowEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  rowName:  { flex: 1, fontFamily: font.semiBold, fontSize: 15, color: colors.text },
  rowNameMuted: { color: colors.textTertiary },
  expandChevron: { fontSize: 11, color: colors.textTertiary, marginLeft: spacing.xs },

  expanded: { paddingBottom: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  label: {
    fontFamily: font.semiBold, fontSize: 11, color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    fontFamily: font.regular, fontSize: 15, color: colors.text,
  },
  emojiRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  emojiChip: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiGlyph:        { fontSize: 20 },

  helperText: {
    fontFamily: font.regular, fontSize: 12, color: colors.textTertiary,
    textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },

  ctaBar: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontFamily: font.bold, fontSize: 16, color: colors.textOnColor },
});
