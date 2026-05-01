/**
 * add.tsx — Manual transaction entry screen
 *
 * Lets the user type in a single transaction (date, amount, description).
 * Accepts optional pre-fill params so the PDF diff reconciliation flow can
 * push the user directly here with an amount and date pre-populated.
 *
 * Route params (all optional):
 *   prefillDate        ISO date string  e.g. "2026-03-15"
 *   prefillAmount      cents as string  e.g. "-1804" (negative = expense)
 *   prefillDescription raw description
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { insertManualTransaction } from '../../../src/db/queries/transactions';
import { autoApplyRulesForAccount } from '../../../src/domain/rules-engine';
import { writeBackupSafe } from '../../../src/db/backup';
import { colors, font, spacing, radius } from '../../../src/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a dollar string like "-18.04" or "2,688.91" → cents */
function parseDollarInput(text: string): number | null {
  const cleaned = text.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/** Format cents → plain numeric string for the amount input field, e.g. "-18.04" */
function formatCentsForInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Validate ISO date string */
function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddTransactionScreen() {
  const router = useRouter();
  const { id, prefillDate, prefillAmount, prefillDescription } = useLocalSearchParams<{
    id: string;
    prefillDate?: string;
    prefillAmount?: string;
    prefillDescription?: string;
  }>();

  const [date,        setDate]        = useState('');
  const [amountText,  setAmountText]  = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);

  // Pre-fill from route params (used when coming from PDF diff reconciliation)
  useEffect(() => {
    if (prefillDate)        setDate(prefillDate);
    if (prefillAmount) {
      const cents = parseInt(prefillAmount, 10);
      if (!isNaN(cents))   setAmountText(formatCentsForInput(cents));
    }
    if (prefillDescription) setDescription(prefillDescription);
  }, [prefillDate, prefillAmount, prefillDescription]);

  async function handleSave() {
    // Validate
    if (!isValidDate(date)) {
      Alert.alert('Invalid date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }
    const amountCents = parseDollarInput(amountText);
    if (amountCents === null || amountCents === 0) {
      Alert.alert('Invalid amount', 'Please enter a non-zero dollar amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please enter a description.');
      return;
    }

    setSaving(true);
    try {
      await insertManualTransaction(id, date, amountCents, description.trim());
      await autoApplyRulesForAccount(id);
      writeBackupSafe();
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Add Transaction',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Pre-fill notice */}
        {(prefillDate || prefillAmount || prefillDescription) && (
          <View style={styles.prefillBanner}>
            <Text style={styles.prefillText}>
              Pre-filled from your statement — review and save.
            </Text>
          </View>
        )}

        {/* Date */}
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2026-03-15"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          returnKeyType="next"
        />

        {/* Amount */}
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="-18.04  (negative = expense, positive = income)"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          returnKeyType="next"
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.descInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. TST*BREAD SAVAGE"
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          multiline
        />

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Transaction'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  prefillBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  prefillText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.text,
  },
  label: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 4,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: font.semiBold,
    fontSize: 16,
    color: '#fff',
  },
});
