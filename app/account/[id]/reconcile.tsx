import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReconciliationPair, findReconciliationCandidates, mergeManualIntoImported } from '../../../src/db/queries/transactions';
import { writeBackupSafe } from '../../../src/db/backup';
import { centsToDollars } from '../../../src/domain/money';
import { Sloth } from '../../../src/components/Sloth';
import { colors, font, spacing, radius } from '../../../src/theme';

export default function ReconcileScreen() {
  const { id, batchId } = useLocalSearchParams<{ id: string; batchId: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [pairs,   setPairs]   = useState<ReconciliationPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null); // manualTx.id being merged

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!id || !batchId) { setLoading(false); return; }
      const candidates = await findReconciliationCandidates(id, batchId);
      if (!active) return;
      setPairs(candidates);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id, batchId]));

  function dismissPair(manualId: string) {
    setPairs(prev => prev.filter(p => p.manualTx.id !== manualId));
  }

  async function handleMerge(pair: ReconciliationPair) {
    setMerging(pair.manualTx.id);
    try {
      await mergeManualIntoImported(
        pair.manualTx.id,
        pair.importedTx.id,
        pair.manualTx.category_id,
        pair.manualTx.category_set_manually,
      );
      writeBackupSafe();
      dismissPair(pair.manualTx.id);
    } finally {
      setMerging(null);
    }
  }

  function handleKeepBoth(pair: ReconciliationPair) {
    dismissPair(pair.manualTx.id);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Review Overlaps' }} />

      {pairs.length === 0 ? (
        /* ── All done ── */
        <View style={styles.center}>
          <Sloth sloth="thumbsUp" size={120} />
          <Text style={styles.doneTitle}>All sorted!</Text>
          <Text style={styles.doneBody}>No more potential duplicates for this import.</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Pairs list ── */
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          <Text style={styles.intro}>
            These manual entries have the same amount as transactions in your import. Pick one to keep.
          </Text>

          {pairs.map(pair => {
            const isMerging = merging === pair.manualTx.id;
            const amount = centsToDollars(Math.abs(pair.manualTx.amount_cents));
            const sign   = pair.manualTx.amount_cents < 0 ? '–' : '+';

            return (
              <View key={pair.manualTx.id} style={styles.card}>
                {/* Amount header */}
                <Text style={styles.cardAmount}>{sign}{amount}</Text>

                {/* Side-by-side rows */}
                <View style={styles.rowsContainer}>
                  {/* Manual row */}
                  <View style={[styles.txRow, styles.manualRow]}>
                    <View style={styles.txRowHeader}>
                      <Text style={styles.txRowTag}>Manual entry</Text>
                      <Text style={styles.txRowDate}>{pair.manualTx.date}</Text>
                    </View>
                    <Text style={styles.txRowDesc} numberOfLines={2}>
                      {pair.manualTx.description}
                    </Text>
                    {pair.manualTx.category_set_manually === 1 && pair.manualTx.category_id && (
                      <Text style={styles.txRowCatNote}>✓ Category set manually — will be carried over if you merge</Text>
                    )}
                  </View>

                  {/* VS divider */}
                  <View style={styles.vsDivider}>
                    <Text style={styles.vsText}>vs</Text>
                  </View>

                  {/* Imported row */}
                  <View style={[styles.txRow, styles.importedRow]}>
                    <View style={styles.txRowHeader}>
                      <Text style={styles.txRowTag}>From statement</Text>
                      <Text style={styles.txRowDate}>{pair.importedTx.date}</Text>
                    </View>
                    <Text style={styles.txRowDesc} numberOfLines={2}>
                      {pair.importedTx.description}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.mergeBtn, isMerging && styles.btnDisabled]}
                    onPress={() => handleMerge(pair)}
                    activeOpacity={0.85}
                    disabled={isMerging}
                  >
                    {isMerging
                      ? <ActivityIndicator color={colors.textOnColor} size="small" />
                      : <Text style={styles.mergeBtnText}>Merge — keep statement</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.keepBothBtn, isMerging && styles.btnDisabled]}
                    onPress={() => handleKeepBoth(pair)}
                    activeOpacity={0.8}
                    disabled={isMerging}
                  >
                    <Text style={styles.keepBothBtnText}>Keep both</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: spacing.md, paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },

  doneTitle: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  doneBody:  { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  doneBtn: {
    marginTop: spacing.md, backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  doneBtnText: { fontFamily: font.bold, fontSize: 16, color: colors.textOnColor },

  list: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },

  intro: {
    fontFamily: font.regular, fontSize: 14,
    color: colors.textSecondary, lineHeight: 20,
    marginBottom: spacing.xs,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },

  cardAmount: {
    fontFamily: font.bold, fontSize: 20,
    color: colors.text, textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.separator,
    backgroundColor: colors.surfaceAlt,
  },

  rowsContainer: { gap: 0 },

  txRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  manualRow: {
    borderBottomWidth: 1, borderBottomColor: colors.separator,
    backgroundColor: colors.accentLight,
  },
  importedRow: {
    backgroundColor: colors.primaryLight,
  },

  txRowHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  txRowTag: {
    fontFamily: font.semiBold, fontSize: 11,
    color: colors.textTertiary, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  txRowDate: {
    fontFamily: font.regular, fontSize: 12,
    color: colors.textTertiary,
  },
  txRowDesc: {
    fontFamily: font.semiBold, fontSize: 14,
    color: colors.text,
  },
  txRowCatNote: {
    fontFamily: font.regular, fontSize: 11,
    color: colors.primary, marginTop: 2,
  },

  vsDivider: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.separator,
  },
  vsText: {
    fontFamily: font.semiBold, fontSize: 11,
    color: colors.textTertiary, letterSpacing: 1,
  },

  actions: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.separator,
  },
  mergeBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: 13, alignItems: 'center',
  },
  mergeBtnText: { fontFamily: font.bold, fontSize: 15, color: colors.textOnColor },
  keepBothBtn: {
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, alignItems: 'center',
    backgroundColor: colors.surface,
  },
  keepBothBtnText: { fontFamily: font.semiBold, fontSize: 14, color: colors.textSecondary },
  btnDisabled: { opacity: 0.45 },
});
