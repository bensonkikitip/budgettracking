import React from 'react';
import { View, Image } from 'react-native';

// Sprite sheet dimensions (1275 × 1234, 4×4 grid)
const IMG_W = 1275;
const IMG_H = 1234;
const CELL_W = IMG_W / 4; // 318.75
const CELL_H = IMG_H / 4; // 308.5

const SHEET = require('../../assets/sloth-sheet.png');

// Named positions — row/col within the 4×4 grid (0-indexed)
export const SLOTHS = {
  mug:         { row: 0, col: 0 }, // holding a coffee mug — cozy
  laptop:      { row: 0, col: 1 }, // on a laptop — no accounts yet
  piggyBank:   { row: 0, col: 2 }, // with piggy bank — home/savings
  waving:      { row: 0, col: 3 }, // waving + sparkles — celebration
  writing:     { row: 1, col: 0 }, // writing — notes
  receipt:     { row: 1, col: 1 }, // holding receipt — no transactions
  phoneDollar: { row: 1, col: 2 }, // phone with $ — import
  meditating:  { row: 1, col: 3 }, // meditating — all accounts
  dreaming:    { row: 2, col: 0 }, // daydreaming ♡ — onboarding
  books:       { row: 2, col: 1 }, // stacked books — learning
  watering:    { row: 2, col: 2 }, // watering plant — growth
  budgetGoals: { row: 2, col: 3 }, // BUDGET GOALS sign — goals
  box:         { row: 3, col: 0 }, // in a box — empty / unknown
  coin:        { row: 3, col: 1 }, // gold coin — income
  sleeping:    { row: 3, col: 2 }, // sleeping zzz — loading
  thumbsUp:    { row: 3, col: 3 }, // thumbs up ♡ — success / done
} as const;

export type SlothKey = keyof typeof SLOTHS;

interface Props {
  sloth: SlothKey;
  size?: number;
}

export function Sloth({ sloth, size = 120 }: Props) {
  const { row, col } = SLOTHS[sloth];
  const scale = size / CELL_W;
  const scaledH = CELL_H * scale; // keeps aspect ratio correct per cell

  return (
    <View style={{ width: size, height: scaledH, overflow: 'hidden' }}>
      <Image
        source={SHEET}
        style={{
          width:  IMG_W * scale,
          height: IMG_H * scale,
          marginLeft: -(col * CELL_W * scale),
          marginTop:  -(row * CELL_H * scale),
        }}
      />
    </View>
  );
}
