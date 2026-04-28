import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Category } from '../db/queries';
import { colors, font, spacing, radius } from '../theme';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface Props {
  visible:      boolean;
  category:     Category | null;
  month:        string | 'year'; // 'YYYY-MM' or 'year'
  year:         string;
  currentCents: number;
  onClose:      () => void;
  onSave:       (cents: number) => void;
}

export function BudgetCellModal({ visible, category, month, year, currentCents, onClose, onSave }: Props) {
  const [text, setText]   = useState('');
  const inputRef          = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(currentCents === 0 ? '' : String(currentCents / 100));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  function label(): string {
    if (month === 'year') return `Year Total ${year}`;
    const [, mm] = month.split('-');
    return `${MONTH_NAMES[parseInt(mm, 10) - 1]} ${year}`;
  }

  function handleSave() {
    const cleaned = text.replace(/[$,\s]/g, '');
    const float   = parseFloat(cleaned);
    const cents    = isNaN(float) ? 0 : Math.round(float * 100);
    onSave(cents);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.handle} />

          {category && (
            <View style={styles.catRow}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text style={styles.catName}>{category.name}</Text>
            </View>
          )}
          <Text style={styles.monthLabel}>{label()}</Text>

          <View style={styles.inputWrap}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              keyboardType="numbers-and-punctuation"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
          <Text style={styles.hint}>Use – for expenses, e.g. –500</Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor:      colors.background,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal:    spacing.md,
    paddingBottom:        spacing.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.md,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xs,
  },
  dot:       { width: 10, height: 10, borderRadius: radius.full },
  catName:   { fontFamily: font.semiBold, fontSize: 15, color: colors.textSecondary },
  monthLabel: {
    fontFamily: font.bold, fontSize: 20, color: colors.text,
    textAlign: 'center', marginBottom: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, marginBottom: spacing.xs,
  },
  dollar: { fontFamily: font.semiBold, fontSize: 22, color: colors.textSecondary, marginRight: 4 },
  input:  { flex: 1, fontFamily: font.bold, fontSize: 28, color: colors.text, paddingVertical: 14 },
  hint:   { fontFamily: font.regular, fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { fontFamily: font.semiBold, fontSize: 16, color: colors.textSecondary },
  saveBtn:    {
    flex: 2, paddingVertical: 14, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  saveText: { fontFamily: font.bold, fontSize: 16, color: colors.textOnColor },
});
