/**
 * Merge Category screen — lets the user pick a target category to merge the
 * current category into. All transactions, rules, and spending goals are moved
 * to the target; the source category is then deleted.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { getAllCategories, mergeCategory } from '../../../src/db/queries';
import type { Category } from '../../../src/db/queries';
import { friendlyError } from '../../../src/domain/errors';
import { colors, font, spacing, radius } from '../../../src/theme';

export default function MergeCategoryScreen() {
  const { id }           = useLocalSearchParams<{ id: string }>();
  const router           = useRouter();
  const [sourceName,     setSourceName]     = useState('');
  const [targets,        setTargets]        = useState<Category[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [merging,        setMerging]        = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllCategories();
        const src = all.find(c => c.id === id);
        setSourceName(src?.name ?? 'Category');
        setTargets(all.filter(c => c.id !== id));
      } catch (e) {
        Alert.alert('Error', friendlyError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function handlePickTarget(target: Category) {
    Alert.alert(
      'Merge categories?',
      `All transactions, rules, and spending goals from "${sourceName}" will be moved to "${target.name}". "${sourceName}" will then be deleted.\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          style: 'destructive',
          onPress: async () => {
            setMerging(true);
            try {
              await mergeCategory(id, target.id);
              // Source is gone — pop all the way back to the categories list
              router.replace('/');
            } catch (e) {
              Alert.alert('Could not merge', friendlyError(e));
              setMerging(false);
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Merge "${sourceName}" into…` }} />

      {loading || merging ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          {merging && <Text style={styles.mergingText}>Merging…</Text>}
        </View>
      ) : targets.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No other categories to merge into. Create another category first.
          </Text>
        </View>
      ) : (
        <FlatList
          data={targets}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View>
              {index > 0 && <View style={styles.separator} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => handlePickTarget(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.swatch, { backgroundColor: item.color }]}>
                  {item.emoji ? (
                    <Text style={styles.swatchEmoji}>{item.emoji}</Text>
                  ) : null}
                </View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  mergingText: {
    marginTop: spacing.sm,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.textSecondary,
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.md,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  separator: {
    height: 1,
    backgroundColor: colors.separator,
    marginLeft: spacing.md,
  },

  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmoji: {
    fontSize: 16,
  },

  name: {
    flex: 1,
    fontFamily: font.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  chevron: {
    fontFamily: font.regular,
    fontSize: 20,
    color: colors.textTertiary,
  },
});
