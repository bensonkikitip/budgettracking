/**
 * CsvBrowserTip — small inline card explaining that users on iPhone need to
 * use mobile Safari (not their bank's app) to download a CSV. Most banks
 * stripped CSV export from their mobile apps, so users hit a wall otherwise.
 *
 * Used on the two import surfaces:
 *   - app/account/[id]/import.tsx    (existing-account import)
 *   - app/account/new.tsx            (first-time / Add Account flow)
 *
 * Links into /csv-guide for per-bank step-by-step instructions.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, font, spacing, radius } from '../theme';

export function CsvBrowserTip() {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>📱</Text>
      <View style={styles.body}>
        <Text style={styles.title}>On your phone? Use Safari, not your bank's app.</Text>
        <Text style={styles.copy}>
          Most banking apps don't let you download a CSV — but their websites do.
          Open Safari, log in to your bank, and look for "Download," "Export," or "Statements."
        </Text>
        <Link href="/csv-guide" style={styles.link}>
          Step-by-step for your bank →
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:    'row',
    backgroundColor:  colors.surfaceAlt,
    borderRadius:     radius.md,
    padding:          spacing.md,
    gap:              spacing.sm,
    alignItems:       'flex-start',
  },
  icon: {
    fontSize:   22,
    lineHeight: 26,
  },
  body: {
    flex: 1,
    gap:  spacing.xs,
  },
  title: {
    fontFamily: font.bold,
    fontSize:   14,
    color:      colors.text,
    lineHeight: 20,
  },
  copy: {
    fontFamily: font.regular,
    fontSize:   13,
    color:      colors.textSecondary,
    lineHeight: 19,
  },
  link: {
    fontFamily: font.semiBold,
    fontSize:   13,
    color:      colors.primary,
    marginTop:  2,
  },
});
