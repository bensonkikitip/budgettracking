import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { MonthEntry } from '../domain/month';
import { colors, font, spacing, radius } from '../theme';

interface MonthPickerProps {
  months:   MonthEntry[]; // full list, newest first
  selected: string;       // 'YYYY-MM'
  onChange: (key: string) => void;
}

const RECENT_COUNT = 6;

export function MonthPicker({ months, selected, onChange }: MonthPickerProps) {
  const [open,     setOpen]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  const selectedEntry = months.find(m => m.key === selected);

  // Default view: 6 most recent months (newest first)
  const recentMonths   = months.slice(0, RECENT_COUNT);
  // Expanded view: only months with data, full history
  const allWithData   = months.filter(m => m.count > 0);
  const visibleMonths = expanded ? allWithData : recentMonths;

  function handleSelect(key: string) {
    onChange(key);
    setOpen(false);
    setExpanded(false);
  }

  return (
    <>
      {/* Pill button */}
      <TouchableOpacity style={styles.pill} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <Text style={styles.pillText}>
          {selectedEntry?.label ?? '—'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => { setOpen(false); setExpanded(false); }}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => { setOpen(false); setExpanded(false); }}
        />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Month</Text>

          <FlatList
            data={visibleMonths}
            keyExtractor={m => m.key}
            renderItem={({ item, index }) => {
              const isEmpty    = item.count === 0;
              const isSelected = item.key === selected;
              return (
                <TouchableOpacity
                  style={[
                    styles.row,
                    index > 0 && styles.rowBorder,
                    isSelected && styles.rowSelected,
                  ]}
                  onPress={() => handleSelect(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rowLabel, isEmpty && styles.rowLabelEmpty]}>
                    {item.label}
                  </Text>
                  <Text style={[
                    styles.rowCount,
                    isEmpty ? styles.rowCountEmpty : styles.rowCountFilled,
                  ]}>
                    {isEmpty ? '(0)' : String(item.count)}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              !expanded ? (
                <TouchableOpacity
                  style={[styles.row, styles.rowBorder, styles.showAllRow]}
                  onPress={() => setExpanded(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showAllText}>Show all months</Text>
                </TouchableOpacity>
              ) : null
            }
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
  },
  pillText: {
    fontFamily: font.semiBold,
    fontSize:   15,
    color:      colors.text,
  },
  chevron: {
    fontSize: 11,
    color:    colors.textTertiary,
    marginTop: 1,
  },

  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight:       '60%',
    paddingBottom:   spacing.lg,
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
  sheetTitle: {
    fontFamily:   font.bold,
    fontSize:     17,
    color:        colors.text,
    textAlign:    'center',
    marginBottom: spacing.sm,
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

  rowLabel: {
    fontFamily: font.semiBold,
    fontSize:   15,
    color:      colors.text,
    flex:       1,
  },
  rowLabelEmpty: { color: colors.textTertiary },

  rowCount: {
    fontFamily: font.bold,
    fontSize:   14,
    marginRight: spacing.sm,
  },
  rowCountFilled: { color: colors.primary },
  rowCountEmpty:  { color: colors.textTertiary },

  checkmark: {
    fontFamily: font.bold,
    fontSize:   15,
    color:      colors.primary,
  },

  showAllRow: { justifyContent: 'center' },
  showAllText: {
    fontFamily: font.semiBold,
    fontSize:   15,
    color:      colors.primary,
  },
});
