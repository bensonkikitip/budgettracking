import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

// Individual transparent PNGs — one per pose.
// Each file was extracted from the original sprite sheet with the white
// background stripped so Rachey renders free-standing on any background.
const SOURCES = {
  mug:         require('../../assets/sloth/mug.png'),
  laptop:      require('../../assets/sloth/laptop.png'),
  piggyBank:   require('../../assets/sloth/piggyBank.png'),
  waving:      require('../../assets/sloth/waving.png'),
  writing:     require('../../assets/sloth/writing.png'),
  receipt:     require('../../assets/sloth/receipt.png'),
  phoneDollar: require('../../assets/sloth/phoneDollar.png'),
  meditating:  require('../../assets/sloth/meditating.png'),
  dreaming:    require('../../assets/sloth/dreaming.png'),
  books:       require('../../assets/sloth/books.png'),
  watering:    require('../../assets/sloth/watering.png'),
  budgetGoals: require('../../assets/sloth/budgetGoals.png'),
  box:         require('../../assets/sloth/box.png'),
  coin:        require('../../assets/sloth/coin.png'),
  sleeping:    require('../../assets/sloth/sleeping.png'),
  thumbsUp:    require('../../assets/sloth/thumbsUp.png'),
} as const;

export type SlothKey = keyof typeof SOURCES;

// Re-export SLOTHS for any code that imported it from the old sprite-sheet
// implementation — it now just maps each key to itself.
export const SLOTHS = Object.fromEntries(
  Object.keys(SOURCES).map(k => [k, k])
) as Record<SlothKey, SlothKey>;

interface Props {
  sloth: SlothKey;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function Sloth({ sloth, size = 120, style }: Props) {
  return (
    <Image
      source={SOURCES[sloth]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
