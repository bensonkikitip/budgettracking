import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { Category } from '../db/queries';
import { colors, font, spacing, radius } from '../theme';

interface Props {
  visible:    boolean;
  category:   Category | null;
  year:       string;
  onClose:    () => void;
  onFillActuals:    () => void;
  onFillLastYear:   () => void;
  onClearCategory:  () => void;
}

export function BudgetRowActionsModal({
  visible, category, year, onClose,
  onFillActuals, onFillLastYear, onClearCategory,
}: Props) {
  if (!category) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <SafeAreaView style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.catRow}>
          <View style={[styles.dot, { backgroundColor: category.color }]} />
          <Text style={styles.catName}>{category.name}</Text>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); onFillActuals(); }} activeOpacity={0.7}>
            <Text style={styles.itemText}>Fill {category.name} from Actuals</Text>
            <Text style={styles.itemSub}>Overwrite with {year} actual spending</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.item} onPress={() => { onClose(); onFillLastYear(); }} activeOpacity={0.7}>
            <Text style={styles.itemText}>Fill {category.name} from Last Year + %</Text>
            <Text style={styles.itemSub}>Scale {String(parseInt(year, 10) - 1)} actuals by a percentage</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.item} onPress={() => { onClose(); onClearCategory(); }} activeOpacity={0.7}>
            <Text style={[styles.itemText, styles.destructive]}>Clear {category.name} for {year}</Text>
            <Text style={styles.itemSub}>Remove all budget values for this category</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
    justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md,
  },
  dot:     { width: 10, height: 10, borderRadius: radius.full },
  catName: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  menu: {
    backgroundColor:  colors.surface,
    borderRadius:     radius.lg,
    borderWidth:      1,
    borderColor:      colors.border,
    marginBottom:     spacing.sm,
    overflow:         'hidden',
  },
  item: { paddingHorizontal: spacing.md, paddingVertical: 14 },
  itemText: { fontFamily: font.semiBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  itemSub:  { fontFamily: font.regular, fontSize: 12, color: colors.textTertiary },
  destructive: { color: colors.destructive },
  divider: { height: 1, backgroundColor: colors.separator },
  cancelBtn: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontFamily: font.semiBold, fontSize: 16, color: colors.textSecondary },
});
