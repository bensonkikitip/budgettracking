import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, font, spacing, radius } from '../theme';

interface Props {
  visible:  boolean;
  scope:    'all' | string;  // 'all' or a category name
  lastYear: string;
  onClose:  () => void;
  onApply:  (pct: number) => void;
}

export function BudgetFillPercentModal({ visible, scope, lastYear, onClose, onApply }: Props) {
  const [text, setText]   = useState('');
  const inputRef          = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  function handleApply() {
    const pct = parseFloat(text.replace(/[^0-9.\-]/g, ''));
    onApply(isNaN(pct) ? 0 : pct);
  }

  const title = scope === 'all'
    ? `Fill All from ${lastYear} + %`
    : `Fill ${scope} from ${lastYear} + %`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            Uses {lastYear} actual spending as the base. Enter a percentage adjustment (e.g. 5 for +5%, –10 for –10%).
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              keyboardType="numbers-and-punctuation"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleApply}
            />
            <Text style={styles.pct}>%</Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <Text style={styles.applyText}>Apply</Text>
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
  title: { fontFamily: font.bold, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  sub:   { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md, lineHeight: 18 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  input: { flex: 1, fontFamily: font.bold, fontSize: 32, color: colors.text, paddingVertical: 14, textAlign: 'center' },
  pct:   { fontFamily: font.semiBold, fontSize: 22, color: colors.textSecondary, marginLeft: 4 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { fontFamily: font.semiBold, fontSize: 16, color: colors.textSecondary },
  applyBtn:   {
    flex: 2, paddingVertical: 14, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  applyText: { fontFamily: font.bold, fontSize: 16, color: colors.textOnColor },
});
