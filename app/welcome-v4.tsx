/**
 * Welcome to v4 sheet — shown ONCE to existing users after upgrading from v3.x.
 * Triggered from app/index.tsx when v4_welcomed preference is unset and the
 * user already has accounts (new users see the normal empty-state onboarding).
 *
 * Writes v4_welcomed = "true" on dismiss so it never shows again.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { setPreference } from '../src/db/queries';
import { Sloth } from '../src/components/Sloth';
import { colors, font, spacing, radius } from '../src/theme';

const WHATS_NEW = [
  {
    emoji: '🍔',
    headline: 'Categories have emojis',
    detail: 'Edit any category to add an emoji and a short description. Makes them easier to scan at a glance.',
  },
  {
    emoji: '🧠',
    headline: "Built-in rules — Rachey knows merchants",
    detail: 'Go to any account → Rules to turn on built-in sorting. Rachey recognizes hundreds of common merchants and can sort them automatically. You control which rules are on and what category they map to.',
  },
  {
    emoji: '📂',
    headline: 'CSVs are deleted after import',
    detail: "Your bank file is removed from the app as soon as it's imported. It never needed to stick around.",
  },
];

async function dismiss(router: ReturnType<typeof useRouter>) {
  await setPreference('v4_welcomed', 'true');
  router.back();
}

export default function WelcomeV4Screen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot + headline */}
          <View style={styles.hero}>
            <Sloth sloth="waving" size={130} />
            <Text style={styles.headline}>I learned some new tricks while you were away.</Text>
          </View>

          {/* What's new list */}
          <Text style={styles.sectionLabel}>WHAT'S NEW</Text>
          <View style={styles.card}>
            {WHATS_NEW.map((item, i) => (
              <View key={i} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
                <Text style={styles.featureEmoji}>{item.emoji}</Text>
                <View style={styles.featureText}>
                  <Text style={styles.featureHeadline}>{item.headline}</Text>
                  <Text style={styles.featureDetail}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tutorial note */}
          <Text style={styles.footerNote}>
            More features — including a guided tour — are coming soon. For now, explore at your own pace.
          </Text>

          {/* CTAs */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setPreference('v4_welcomed', 'true');
              router.replace('/welcome-v4-emoji-suggest');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Suggest emojis for my categories →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => dismiss(router)}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostBtnText}>Got it — let me explore</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
  headline: {
    fontFamily:  font.bold,
    fontSize:    20,
    color:       colors.text,
    textAlign:   'center',
    lineHeight:  28,
    paddingHorizontal: spacing.md,
  },

  sectionLabel: {
    fontFamily:    font.bold,
    fontSize:      11,
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginTop:     spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    padding:       spacing.md,
    gap:           spacing.md,
    alignItems:    'flex-start',
  },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  featureEmoji:     { fontSize: 26, width: 34, textAlign: 'center', marginTop: 2 },
  featureText:      { flex: 1 },
  featureHeadline: {
    fontFamily: font.bold,
    fontSize:   15,
    color:      colors.text,
    marginBottom: 3,
  },
  featureDetail: {
    fontFamily: font.regular,
    fontSize:   14,
    color:      colors.textSecondary,
    lineHeight: 20,
  },

  footerNote: {
    fontFamily:  font.regular,
    fontSize:    13,
    color:       colors.textTertiary,
    textAlign:   'center',
    lineHeight:  18,
    paddingHorizontal: spacing.md,
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.full,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       spacing.sm,
  },
  primaryBtnText: { fontFamily: font.bold, fontSize: 16, color: colors.textOnColor },

  ghostBtn:     { paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { fontFamily: font.semiBold, fontSize: 15, color: colors.textSecondary },
});
