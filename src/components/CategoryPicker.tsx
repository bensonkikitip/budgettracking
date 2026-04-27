import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { colors, font, spacing, radius } from '../theme';

// Sentinel value representing "transactions with no category"
export const NONE_FILTER = '__none__';

interface CategoryOption {
  id:    string;
  name:  string;
  color: string;
}

interface Props {
  categories: CategoryOption[];
  selected:   string[];   // empty = all; may include NONE_FILTER
  onSelect:   (ids: string[]) => void;
  showNone?:  boolean;    // show the "No Category" row
}

export function CategoryPicker({ categories, selected, onSelect, showNone = false }: Props) {
  const [open, setOpen] = useState(false);

  const noneSelected = selected.includes(NONE_FILTER);
  const realSelected = selected.filter(s => s !== NONE_FILTER);

  const pillLabel =
    selected.length === 0                                   ? 'All Categories'
    : selected.length === 1 && noneSelected                 ? 'No Category'
    : selected.length === 1                                 ? (categories.find(c => c.id === selected[0])?.name ?? 'Category')
    :                                                         `${selected.length} Categories`;

  function toggle(id: string) {
    onSelect(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id],
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.pill} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <Text style={styles.pillText} numberOfLines={1}>{pillLabel}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter by Category</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={styles.doneBtn}>Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            keyExtractor={c => c.id}
            ListHeaderComponent={
              <>
                {/* All Categories */}
                <TouchableOpacity
                  style={[styles.row, selected.length === 0 && styles.rowSelected]}
                  onPress={() => onSelect([])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>All Categories</Text>
                  {selected.length === 0 && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>

                {/* No Category */}
                {showNone && (
                  <TouchableOpacity
                    style={[styles.row, styles.rowBorder, noneSelected && styles.rowSelected]}
                    onPress={() => toggle(NONE_FILTER)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dotEmpty} />
                    <Text style={styles.rowLabel}>No Category</Text>
                    {noneSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
              </>
            }
            renderItem={({ item }) => {
              const isSelected = realSelected.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.row, styles.rowBorder, isSelected && styles.rowSelected]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.rowLabel}>{item.name}</Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'center',
    backgroundColor:   colors.surface,
    borderRadius:      radius.full,
    borderWidth:       1,
    borderColor:       colors.border,
    paddingVertical:   7,
    paddingHorizontal: spacing.md,
    gap:               spacing.xs,
    marginVertical:    spacing.sm,
    maxWidth:          160,
  },
  pillText: { fontFamily: font.semiBold, fontSize: 15, color: colors.text, flexShrink: 1 },
  chevron:  { fontSize: 11, color: colors.textTertiary, marginTop: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor:      colors.background,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight:            '65%',
    paddingBottom:        spacing.lg,
  },
  sheetHandle: {
    width:           40,
    height:          4,
    borderRadius:    radius.full,
    backgroundColor: colors.border,
    alignSelf:       'center',
    marginTop:       spacing.sm,
    marginBottom:    spacing.sm,
  },
  sheetHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.md,
    marginBottom:      spacing.sm,
  },
  sheetTitle: {
    fontFamily: font.bold,
    fontSize:   17,
    color:      colors.text,
    flex:       1,
    textAlign:  'center',
  },
  doneBtn: {
    fontFamily: font.semiBold,
    fontSize:   15,
    color:      colors.primary,
    position:   'absolute',
    right:      spacing.md,
  },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.md,
    paddingVertical:   14,
    backgroundColor:   colors.surface,
  },
  rowBorder:   { borderTopWidth: 1, borderTopColor: colors.separator },
  rowSelected: { backgroundColor: colors.primaryLight },
  dot: {
    width:        10,
    height:       10,
    borderRadius: radius.full,
    marginRight:  spacing.sm,
  },
  dotEmpty: {
    width:        10,
    height:       10,
    borderRadius: radius.full,
    marginRight:  spacing.sm,
    borderWidth:  1,
    borderColor:  colors.border,
  },
  rowLabel:  { fontFamily: font.semiBold, fontSize: 15, color: colors.text, flex: 1 },
  checkmark: { fontFamily: font.bold, fontSize: 15, color: colors.primary },
});
