import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ColumnConfig, DateFormat, AmountStyle } from '../parsers/column-config';
import { colors, font, spacing, radius } from '../theme';

const DATE_FORMATS: DateFormat[] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

interface Props {
  config: ColumnConfig;
  onChange: (patch: Partial<ColumnConfig>) => void;
  accentColor: string;
}

export function ColumnMappingForm({ config, onChange, accentColor }: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Date column name</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={config.dateColumn}
          onChangeText={v => onChange({ dateColumn: v })}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <Text style={styles.fieldLabel}>Description column name</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={config.descriptionColumn}
          onChangeText={v => onChange({ descriptionColumn: v })}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <Text style={styles.fieldLabel}>Date format</Text>
      <View style={[styles.card, styles.segmentRow]}>
        {DATE_FORMATS.map((fmt, i) => (
          <TouchableOpacity
            key={fmt}
            style={[
              styles.segment,
              i > 0 && styles.segmentBorder,
              config.dateFormat === fmt && { backgroundColor: accentColor },
            ]}
            onPress={() => onChange({ dateFormat: fmt })}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, config.dateFormat === fmt && styles.segmentTextActive]}>
              {fmt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Amount style</Text>
      <View style={[styles.card, styles.segmentRow]}>
        {(['signed', 'debit_credit'] as AmountStyle[]).map((val, i) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.segment,
              i > 0 && styles.segmentBorder,
              config.amountStyle === val && { backgroundColor: accentColor },
            ]}
            onPress={() => onChange({ amountStyle: val })}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, config.amountStyle === val && styles.segmentTextActive]}>
              {val === 'signed' ? 'Single Column' : 'Debit / Credit'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {config.amountStyle === 'signed' && (
        <>
          <Text style={styles.fieldLabel}>Amount column name</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={config.signedAmountColumn ?? ''}
              onChangeText={v => onChange({ signedAmountColumn: v })}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <Text style={styles.fieldLabel}>Skip preamble until header contains (optional)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={config.headerContains ?? ''}
              onChangeText={v => onChange({ headerContains: v || undefined })}
              placeholder="e.g. Date,Description,Amount"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>
        </>
      )}

      {config.amountStyle === 'debit_credit' && (
        <>
          <Text style={styles.fieldLabel}>Debit column name</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={config.debitColumn ?? ''}
              onChangeText={v => onChange({ debitColumn: v })}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <Text style={styles.fieldLabel}>Credit column name</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={config.creditColumn ?? ''}
              onChangeText={v => onChange({ creditColumn: v })}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <Text style={styles.fieldLabel}>Skip preamble until header contains (optional)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={config.headerContains ?? ''}
              onChangeText={v => onChange({ headerContains: v || undefined })}
              placeholder="e.g. Date,Debit,Credit"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>

          <Text style={styles.fieldLabel}>Pending status column (optional)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={config.pendingColumn ?? ''}
              onChangeText={v => onChange({ pendingColumn: v || undefined })}
              placeholder="e.g. Status"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {!!config.pendingColumn && (
            <>
              <Text style={styles.fieldLabel}>Cleared value</Text>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  value={config.clearedValue ?? ''}
                  onChangeText={v => onChange({ clearedValue: v || undefined })}
                  placeholder="e.g. Cleared"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily:   font.regular,
    fontSize:     13,
    color:        colors.textSecondary,
    marginTop:    spacing.sm,
    marginBottom: spacing.xs,
    marginLeft:   spacing.xs,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
  },

  input: {
    fontFamily:        font.regular,
    fontSize:          15,
    color:             colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical:   14,
  },

  segmentRow: { flexDirection: 'row' },
  segment: {
    flex:            1,
    paddingVertical: 13,
    alignItems:      'center',
  },
  segmentBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segmentText: {
    fontFamily: font.semiBold,
    fontSize:   13,
    color:      colors.textSecondary,
  },
  segmentTextActive: { color: colors.textOnColor },
});
