/**
 * Foundational Rules — built-in merchant patterns that ship with the app.
 *
 * ARCHITECTURE:
 *   - The rule LOGIC lives here in code (patterns, names, emojis, descriptions).
 *   - The per-account USER STATE (enabled flag + category mapping) lives in
 *     the `foundational_rule_settings` DB table (see queries.ts).
 *   - The engine merges these at runtime via getActiveFoundationalRulesAsRules().
 *
 * ORDERING CONTRACT:
 *   User rules always run BEFORE foundational rules. The engine appends foundational
 *   rules at the END of the merged array. applyRulesToTransactions is first-match-wins,
 *   so a user rule always wins when both would match the same transaction.
 */

import type { RuleCondition } from '../db/queries';

export interface FoundationalRule {
  id:                  string;           // stable key, e.g. "food-dining"
  name:                string;           // "Food & Dining"
  emoji:               string;           // "🍔"
  description:         string;           // "Restaurants, takeout, coffee, fast food"
  defaultCategoryName: string;           // matches the starter category name for auto-mapping
  conditions:          RuleCondition[];  // all OR'd together — see logic field
  logic:               'OR';            // always OR; one match is enough
}

export const FOUNDATIONAL_RULES: FoundationalRule[] = [
  {
    id: 'food-dining',
    name: 'Food & Dining',
    emoji: '🍔',
    description: 'Restaurants, takeout, coffee, fast food',
    defaultCategoryName: 'Food & Dining',
    logic: 'OR',
    conditions: [
      // Fast food
      { match_type: 'contains', match_text: 'mcdonald' },
      { match_type: 'contains', match_text: 'burger king' },
      { match_type: 'contains', match_text: 'wendy' },
      { match_type: 'contains', match_text: 'chick-fil-a' },
      { match_type: 'contains', match_text: 'taco bell' },
      { match_type: 'contains', match_text: 'chipotle' },
      { match_type: 'contains', match_text: 'subway' },
      { match_type: 'contains', match_text: 'panera' },
      { match_type: 'contains', match_text: 'five guys' },
      { match_type: 'contains', match_text: 'shake shack' },
      { match_type: 'contains', match_text: 'in-n-out' },
      { match_type: 'contains', match_text: 'whataburger' },
      { match_type: 'contains', match_text: 'raising cane' },
      { match_type: 'contains', match_text: 'wingstop' },
      { match_type: 'contains', match_text: 'popeye' },
      { match_type: 'contains', match_text: 'panda express' },
      { match_type: 'contains', match_text: 'jack in the box' },
      { match_type: 'contains', match_text: 'dairy queen' },
      { match_type: 'contains', match_text: 'sonic drive' },
      { match_type: 'contains', match_text: 'jersey mike' },
      { match_type: 'contains', match_text: 'jimmy john' },
      { match_type: 'contains', match_text: 'qdoba' },
      { match_type: 'contains', match_text: 'moe\'s southwest' },
      { match_type: 'contains', match_text: 'habit burger' },
      // Pizza
      { match_type: 'contains', match_text: 'pizza hut' },
      { match_type: 'contains', match_text: 'papa john' },
      { match_type: 'contains', match_text: 'domino' },
      { match_type: 'contains', match_text: 'little caesar' },
      { match_type: 'contains', match_text: 'papa murphy' },
      { match_type: 'contains', match_text: 'mod pizza' },
      { match_type: 'contains', match_text: 'blaze pizza' },
      // Coffee
      { match_type: 'contains', match_text: 'starbucks' },
      { match_type: 'contains', match_text: 'dunkin' },
      { match_type: 'contains', match_text: 'dutch bros' },
      { match_type: 'contains', match_text: 'peet\'s coffee' },
      { match_type: 'contains', match_text: 'caribou coffee' },
      { match_type: 'contains', match_text: 'coffee bean' },
      { match_type: 'contains', match_text: 'tim horton' },
      // Sit-down chains
      { match_type: 'contains', match_text: 'chili\'s' },
      { match_type: 'contains', match_text: 'applebee' },
      { match_type: 'contains', match_text: 'olive garden' },
      { match_type: 'contains', match_text: 'outback' },
      { match_type: 'contains', match_text: 'texas roadhouse' },
      { match_type: 'contains', match_text: 'red lobster' },
      { match_type: 'contains', match_text: 'longhorn steakhouse' },
      { match_type: 'contains', match_text: 'ihop' },
      { match_type: 'contains', match_text: 'dennys' },
      { match_type: 'contains', match_text: 'denny\'s' },
      { match_type: 'contains', match_text: 'waffle house' },
      { match_type: 'contains', match_text: 'cracker barrel' },
      { match_type: 'contains', match_text: 'buffalo wild wings' },
      { match_type: 'contains', match_text: 'cheesecake factory' },
      { match_type: 'contains', match_text: 'red robin' },
      { match_type: 'contains', match_text: 'sweetgreen' },
      { match_type: 'contains', match_text: 'noodles & company' },
      // Additional national chains
      { match_type: 'contains', match_text: 'kfc' },
      { match_type: 'contains', match_text: 'culver' },
      { match_type: 'contains', match_text: 'el pollo loco' },
      { match_type: 'contains', match_text: 'del taco' },
      { match_type: 'contains', match_text: "arby'" },           // Arby's — trailing apostrophe avoids "Warby Parker"
      { match_type: 'contains', match_text: 'hardee' },
      { match_type: 'contains', match_text: 'carl\'s jr' },
      { match_type: 'contains', match_text: 'church\'s chicken' },
      { match_type: 'contains', match_text: 'bojangle' },
      { match_type: 'contains', match_text: 'zaxby' },
      { match_type: 'contains', match_text: 'crumbl' },
      { match_type: 'contains', match_text: 'cinnabon' },
      { match_type: 'contains', match_text: 'auntie anne' },
      { match_type: 'contains', match_text: 'jamba juice' },
      { match_type: 'contains', match_text: 'smoothie king' },
      { match_type: 'contains', match_text: 'tropical smoothie' },
      { match_type: 'contains', match_text: 'firehouse subs' },
      { match_type: 'contains', match_text: 'potbelly' },
      { match_type: 'contains', match_text: 'boston market' },
      { match_type: 'contains', match_text: 'freebirds' },
      { match_type: 'contains', match_text: 'mister softee' },
      // Food delivery apps
      { match_type: 'contains', match_text: 'doordash' },
      { match_type: 'contains', match_text: 'uber eats' },
      { match_type: 'contains', match_text: 'grubhub' },
      { match_type: 'contains', match_text: 'seamless' },
      { match_type: 'contains', match_text: 'postmates' },
      { match_type: 'contains', match_text: 'caviar' },
      // Restaurant-specific POS prefix (Toast — restaurant industry only)
      { match_type: 'contains', match_text: 'tst*' },
      // Generic food lexicon — broad nouns that almost always indicate a
      // restaurant, café, bakery, etc. Each was vetted against real backup
      // data with FP=0; intentionally excluded: `deli` (collides with
      // "delivery"), `kitchen` (collides with cookware/home goods),
      // `bar` (too short, hits "barber", bar associations, etc.).
      { match_type: 'contains', match_text: 'cafe' },
      { match_type: 'contains', match_text: 'caffe' },         // Italian/Portuguese spelling: Caffe Nero, Caffe Umbria, etc.
      { match_type: 'contains', match_text: 'coffee' },
      { match_type: 'contains', match_text: 'espresso' },
      { match_type: 'contains', match_text: 'bakery' },
      { match_type: 'contains', match_text: 'bagel' },
      { match_type: 'contains', match_text: 'pizza' },
      { match_type: 'contains', match_text: 'taqueria' },
      { match_type: 'contains', match_text: 'bistro' },
      { match_type: 'contains', match_text: 'brasserie' },
      { match_type: 'contains', match_text: 'diner' },
      { match_type: 'contains', match_text: 'tavern' },
      { match_type: 'contains', match_text: 'grill' },
      { match_type: 'contains', match_text: 'bbq' },
      { match_type: 'contains', match_text: 'barbecue' },
      { match_type: 'contains', match_text: 'smokehouse' },
      { match_type: 'contains', match_text: 'steakhouse' },
      { match_type: 'contains', match_text: 'donut' },
      { match_type: 'contains', match_text: 'brewing' },
      { match_type: 'contains', match_text: 'creamery' },
      { match_type: 'contains', match_text: 'ice cream' },
      { match_type: 'contains', match_text: 'gelato' },
      { match_type: 'contains', match_text: 'restaurant' },
      { match_type: 'contains', match_text: 'restaura' },      // catches 22-char-truncated forms: "CHINESE RESTAURA..."
      { match_type: 'contains', match_text: 'eatery' },
      { match_type: 'contains', match_text: 'takeaway' },      // UK/AU independent restaurants
      { match_type: 'contains', match_text: 'chippy' },        // UK fish & chip shops
      { match_type: 'contains', match_text: 'sushi' },
      { match_type: 'contains', match_text: 'ramen' },
      { match_type: 'contains', match_text: 'pho ' },          // trailing space avoids "phoenix", "phosphate"
      { match_type: 'contains', match_text: 'noodle' },
      { match_type: 'contains', match_text: 'dumpling' },
      { match_type: 'contains', match_text: 'dim sum' },
      { match_type: 'contains', match_text: 'teriyaki' },
      { match_type: 'contains', match_text: 'wok' },
      { match_type: 'contains', match_text: 'gyro' },
      { match_type: 'contains', match_text: 'falafel' },
      { match_type: 'contains', match_text: 'kebab' },
      { match_type: 'contains', match_text: 'peri peri' },
      { match_type: 'contains', match_text: 'poke bowl' },
      { match_type: 'contains', match_text: 'catering' },
      { match_type: 'contains', match_text: 'vegan' },
      { match_type: 'contains', match_text: 'trattoria' },
      { match_type: 'contains', match_text: 'patisserie' },
      { match_type: 'contains', match_text: 'boba' },
      { match_type: 'contains', match_text: 'smoothie' },
      { match_type: 'contains', match_text: 'cuisine' },
      { match_type: 'contains', match_text: 'bowls' },         // "BACKYARD BOWLS", açaí bowls; "bowls" avoids "bowling" collision
      { match_type: 'contains', match_text: 'too good to go' },
      // Additional US chains
      { match_type: 'contains', match_text: 'jollibee' },
      { match_type: 'contains', match_text: 'baja fresh' },
      { match_type: 'contains', match_text: 'taco time' },
      { match_type: 'contains', match_text: 'taco del mar' },
      { match_type: 'contains', match_text: 'l&l hawaiian' },
      { match_type: 'contains', match_text: 'krispy kreme' },
      { match_type: 'contains', match_text: 'insomnia cookie' },
      { match_type: 'contains', match_text: 'steak n shake' },
      { match_type: 'contains', match_text: 'white castle' },
      { match_type: 'contains', match_text: 'portillo' },
      { match_type: 'contains', match_text: 'cook out' },
      { match_type: 'contains', match_text: 'cookout' },
      { match_type: 'contains', match_text: 'burgerville' },
      { match_type: 'contains', match_text: '7 brew' },
      // UK chains (observed via Emma App & real UK statement data)
      { match_type: 'contains', match_text: 'greggs' },
      { match_type: 'contains', match_text: 'pret a manger' },
      { match_type: 'contains', match_text: 'nando' },         // Nando's (UK/AU/CA/ZA) — apostrophe variants both covered
      { match_type: 'contains', match_text: 'wagamama' },
      { match_type: 'contains', match_text: 'itsu' },
      { match_type: 'contains', match_text: 'wasabi' },
      { match_type: 'contains', match_text: 'tortilla' },      // UK Mexican wrap chain, not the ingredient
      // Canadian chains
      { match_type: 'contains', match_text: 'harvey\'s' },     // Harvey's burgers; "harvey's" ≠ "harvey norman" (no trailing s)
      { match_type: 'contains', match_text: 'harveys' },       // apostrophe-stripped descriptor variant
      { match_type: 'contains', match_text: 'swiss chalet' },
      { match_type: 'contains', match_text: 'a&w' },
      { match_type: 'contains', match_text: 'mucho burrito' },
      { match_type: 'contains', match_text: 'poutinerie' },
      { match_type: 'contains', match_text: 'new york fries' },
      { match_type: 'contains', match_text: 'east side mario' },
      { match_type: 'contains', match_text: 'the keg' },
      { match_type: 'contains', match_text: 'cactus club' },
      // Australian / NZ chains
      { match_type: 'contains', match_text: 'hungry jack' },   // Australian name for Burger King
      { match_type: 'contains', match_text: 'red rooster' },
      { match_type: 'contains', match_text: 'guzman' },        // Guzman y Gomez (GYG)
      { match_type: 'contains', match_text: 'boost juice' },
      { match_type: 'contains', match_text: 'zambrero' },
      { match_type: 'contains', match_text: 'oporto' },
      { match_type: 'contains', match_text: 'chatime' },
      { match_type: 'contains', match_text: 'mad mex' },
      { match_type: 'contains', match_text: 'schnitz' },
      { match_type: 'contains', match_text: 'burger fuel' },   // NZ chain
      // Irish chains
      { match_type: 'contains', match_text: 'supermac' },
      { match_type: 'contains', match_text: 'eddie rocket' },
      // International delivery & meal kits
      { match_type: 'contains', match_text: 'deliveroo' },     // UK/IE/AU/CA delivery
      { match_type: 'contains', match_text: 'just eat' },      // UK/IE/CA/AU delivery
      { match_type: 'contains', match_text: 'skipthedish' },   // Canadian delivery (SkipTheDishes)
      { match_type: 'contains', match_text: 'hellofresh' },
      { match_type: 'contains', match_text: 'blue apron' },
      { match_type: 'contains', match_text: 'blueapron' },     // no-space descriptor variant
      { match_type: 'contains', match_text: 'home chef' },
      { match_type: 'contains', match_text: 'everyplate' },
      { match_type: 'contains', match_text: 'green chef' },
      { match_type: 'contains', match_text: 'sunbasket' },
      { match_type: 'contains', match_text: 'factor 75' },
      { match_type: 'contains', match_text: 'gopuff' },
      { match_type: 'contains', match_text: 'ezcater' },       // B2B catering platform (observed in government P-card data)
    ],
  },

  {
    id: 'groceries',
    name: 'Groceries',
    emoji: '🛒',
    description: 'Supermarkets, grocery stores, and grocery delivery',
    defaultCategoryName: 'Groceries',
    logic: 'OR',
    conditions: [
      { match_type: 'contains', match_text: 'kroger' },
      { match_type: 'contains', match_text: 'safeway' },
      { match_type: 'contains', match_text: 'trader joe' },
      { match_type: 'contains', match_text: 'whole foods' },
      { match_type: 'contains', match_text: 'publix' },
      { match_type: 'contains', match_text: 'heb ' },
      { match_type: 'contains', match_text: 'h-e-b' },
      { match_type: 'contains', match_text: 'wegman' },
      { match_type: 'contains', match_text: 'giant food' },
      { match_type: 'contains', match_text: 'stop & shop' },
      { match_type: 'contains', match_text: 'food lion' },
      { match_type: 'contains', match_text: 'winn-dixie' },
      { match_type: 'contains', match_text: 'winndixie' },
      { match_type: 'contains', match_text: 'aldi' },
      { match_type: 'contains', match_text: 'sprouts' },
      { match_type: 'contains', match_text: 'fresh market' },
      { match_type: 'contains', match_text: 'market basket' },
      { match_type: 'contains', match_text: 'meijer' },
      { match_type: 'contains', match_text: 'harris teeter' },
      { match_type: 'contains', match_text: 'natural grocers' },
      { match_type: 'contains', match_text: 'stater bros' },
      { match_type: 'contains', match_text: 'lucky supermarket' },
      { match_type: 'contains', match_text: 'fry\'s food' },
      { match_type: 'contains', match_text: 'king soopers' },
      { match_type: 'contains', match_text: 'vons' },
      { match_type: 'contains', match_text: 'ralphs' },
      { match_type: 'contains', match_text: 'smith\'s food' },
      { match_type: 'contains', match_text: 'fred meyer' },
      { match_type: 'contains', match_text: 'giant eagle' },
      { match_type: 'contains', match_text: 'price chopper' },
      { match_type: 'contains', match_text: 'brookshire' },
      { match_type: 'contains', match_text: 'piggly wiggly' },
      { match_type: 'contains', match_text: 'bi-lo' },
      { match_type: 'contains', match_text: 'food 4 less' },
      { match_type: 'contains', match_text: 'save-a-lot' },
      { match_type: 'contains', match_text: 'lidl' },
      // Additional US chains (confirmed gaps from real data or wide regional coverage)
      { match_type: 'contains', match_text: 'albertsons' },      // major national chain — largest observed gap
      { match_type: 'contains', match_text: 'grocery outlet' },
      { match_type: 'contains', match_text: 'smart and final' },
      { match_type: 'contains', match_text: 'weee' },            // Weee! Asian grocery delivery
      { match_type: 'contains', match_text: 'weis ' },            // Weis Markets (Mid-Atlantic) — trailing space avoids "Edelweiss" substring
      { match_type: 'contains', match_text: 'hannaford' },
      { match_type: 'contains', match_text: 'hy-vee' },
      { match_type: 'contains', match_text: 'winco' },           // WinCo Foods (Pacific/Mountain West)
      { match_type: 'contains', match_text: 'raley' },           // Raley's (CA/NV) — catches Raleys and Raley's
      { match_type: 'contains', match_text: 'bashas' },
      { match_type: 'contains', match_text: 'ingles' },          // Ingles Markets (Southeast)
      { match_type: 'contains', match_text: 'shoprite' },
      { match_type: 'contains', match_text: 'acme markets' },    // safer than bare `acme` (ACME TOOLS collision)
      { match_type: 'contains', match_text: 'dillons' },         // Kroger subsidiary (Midwest)
      { match_type: 'contains', match_text: 'food city' },
      { match_type: 'contains', match_text: 'fareway' },
      { match_type: 'contains', match_text: 'coborn' },
      { match_type: 'contains', match_text: 'woodman' },         // Woodman's Markets (Wisconsin)
      { match_type: 'contains', match_text: 'heinen' },
      { match_type: 'contains', match_text: 'stew leonard' },
      // Specialty / online grocery (US)
      { match_type: 'contains', match_text: 'thrive market' },
      { match_type: 'contains', match_text: 'imperfect foods' },
      { match_type: 'contains', match_text: 'misfits market' },
      { match_type: 'contains', match_text: 'butcherbox' },
      { match_type: 'contains', match_text: 'crowd cow' },
      // UK supermarkets (observed via Emma App / real UK statement data)
      { match_type: 'contains', match_text: 'tesco' },           // UK's largest grocer — also Ireland
      { match_type: 'contains', match_text: 'sainsbury' },       // "J SAINSBURY PLC" or "SAINSBURYS"
      { match_type: 'contains', match_text: 'asda' },
      { match_type: 'contains', match_text: 'morrison' },        // "WM MORRISON SUPERMARKETS" or "MORRISONS"
      { match_type: 'contains', match_text: 'waitrose' },
      { match_type: 'contains', match_text: 'ocado' },
      { match_type: 'contains', match_text: 'iceland foods' },   // UK frozen/budget grocer; not the country
      { match_type: 'contains', match_text: 'co-op food' },
      { match_type: 'contains', match_text: 'coop food' },       // hyphen-stripped variant
      { match_type: 'contains', match_text: 'm&s food' },        // M&S Food Hall; bare "marks and spencer" in Shopping catches apparel
      { match_type: 'contains', match_text: 'booths' },          // Northwest England grocer
      { match_type: 'contains', match_text: 'budgens' },
      // Canadian supermarkets
      { match_type: 'contains', match_text: 'loblaws' },         // Canada's largest grocer
      { match_type: 'contains', match_text: 'no frills' },
      { match_type: 'contains', match_text: 'food basics' },
      { match_type: 'contains', match_text: 'sobeys' },
      { match_type: 'contains', match_text: 'iga canada' },      // qualified — bare "iga" too short globally
      { match_type: 'contains', match_text: 'freshco' },
      { match_type: 'contains', match_text: 'metro grocery' },   // qualified — bare "metro" too generic
      { match_type: 'contains', match_text: 'provigo' },         // Quebec
      { match_type: 'contains', match_text: 'farm boy' },
      { match_type: 'contains', match_text: 't&t supermarket' },
      { match_type: 'contains', match_text: 'bulk barn' },
      // Australian supermarkets
      { match_type: 'contains', match_text: 'woolworths' },      // Australia's largest grocer (also NZ via Countdown rebrand)
      { match_type: 'contains', match_text: 'coles' },
      { match_type: 'contains', match_text: 'foodland' },
      { match_type: 'contains', match_text: 'harris farm' },     // Harris Farm Markets AU (≠ Harris Teeter US)
      // New Zealand supermarkets
      { match_type: 'contains', match_text: 'countdown' },       // Woolworths NZ brand
      { match_type: 'contains', match_text: 'pak n save' },
      { match_type: 'contains', match_text: 'paknsave' },        // space-stripped variant
      { match_type: 'contains', match_text: 'four square' },     // NZ convenience/grocery
      // Irish supermarkets
      { match_type: 'contains', match_text: 'dunnes' },          // Dunnes Stores — largest Irish grocer
      { match_type: 'contains', match_text: 'supervalu' },       // SuperValu Ireland
      // Grocery delivery
      { match_type: 'contains', match_text: 'instacart' },
      { match_type: 'contains', match_text: 'shipt' },
      { match_type: 'contains', match_text: 'amazon fresh' },
      { match_type: 'contains', match_text: 'freshly' },
    ],
  },

  {
    id: 'transportation',
    name: 'Transportation',
    emoji: '🚗',
    description: 'Gas stations, rideshare, transit, and parking',
    defaultCategoryName: 'Transportation',
    logic: 'OR',
    conditions: [
      // Gas stations — US
      { match_type: 'contains', match_text: 'shell ' },           // trailing space avoids "shellfish" substring matches
      { match_type: 'contains', match_text: 'chevron' },
      { match_type: 'contains', match_text: 'exxon' },
      { match_type: 'contains', match_text: 'mobil ' },           // trailing space avoids "tmobile" / "mobile" substring matches
      { match_type: 'contains', match_text: 'bp ' },
      { match_type: 'contains', match_text: 'valero' },
      { match_type: 'contains', match_text: 'marathon' },
      { match_type: 'contains', match_text: 'sunoco' },
      { match_type: 'contains', match_text: 'circle k' },
      { match_type: 'contains', match_text: 'speedway' },
      { match_type: 'contains', match_text: 'quiktrip' },
      { match_type: 'contains', match_text: 'wawa' },
      { match_type: 'contains', match_text: 'racetrac' },
      { match_type: 'contains', match_text: 'pilot flying' },
      { match_type: 'contains', match_text: 'love\'s travel' },
      { match_type: 'contains', match_text: 'phillips 66' },
      { match_type: 'contains', match_text: 'conoco' },
      { match_type: 'contains', match_text: 'arco ' },            // trailing space avoids "marcos" substring (m+arco+s)
      { match_type: 'contains', match_text: 'murphy usa' },
      { match_type: 'contains', match_text: 'murphy express' },
      { match_type: 'contains', match_text: 'casey\'s general' },
      { match_type: 'contains', match_text: 'gate petroleum' },
      { match_type: 'contains', match_text: 'sheetz' },
      // Gas stations — UK / international
      { match_type: 'contains', match_text: 'esso ' },            // ExxonMobil brand in UK/Europe/CA/AU — trailing space avoids "espresso" substring
      { match_type: 'contains', match_text: 'texaco' },
      // Gas stations — Canada
      { match_type: 'contains', match_text: 'petro canada' },
      { match_type: 'contains', match_text: 'petrocanada' },
      { match_type: 'contains', match_text: 'ultramar' },         // Quebec/Atlantic Canada
      { match_type: 'contains', match_text: 'husky' },            // Husky Energy / Canco
      { match_type: 'contains', match_text: 'pioneer gas' },
      // Gas stations — Australia / NZ
      { match_type: 'contains', match_text: 'ampol' },            // Largest AU fuel brand (ex-Caltex AU)
      { match_type: 'contains', match_text: 'caltex' },           // Still used in NZ and some AU descriptors
      { match_type: 'contains', match_text: 'puma energy' },
      { match_type: 'contains', match_text: 'z energy' },         // Largest NZ fuel chain
      // Rideshare
      { match_type: 'contains', match_text: 'uber' },
      { match_type: 'contains', match_text: 'lyft' },
      { match_type: 'contains', match_text: 'waymo' },
      { match_type: 'contains', match_text: 'didi' },             // DiDi AU/NZ/global rideshare
      { match_type: 'contains', match_text: 'ola cabs' },         // Ola — UK, AU, NZ
      { match_type: 'contains', match_text: 'bolt ride' },        // Bolt (Taxify) — UK/Ireland/EU
      // Car rental
      { match_type: 'contains', match_text: 'enterprise' },
      { match_type: 'contains', match_text: 'hertz' },
      { match_type: 'contains', match_text: 'avis rent' },
      { match_type: 'contains', match_text: 'budget car' },
      { match_type: 'contains', match_text: 'national car' },
      { match_type: 'contains', match_text: 'alamo rent' },       // Alamo Rent A Car — bare "alamo" hits "Los Alamos" city names
      { match_type: 'contains', match_text: 'sixt' },
      { match_type: 'contains', match_text: 'turo' },             // Peer-to-peer car rental
      { match_type: 'contains', match_text: 'zipcar' },
      { match_type: 'contains', match_text: 'europcar' },
      { match_type: 'contains', match_text: 'discount car' },     // Discount Car & Truck Rentals CA
      // Auto services
      { match_type: 'contains', match_text: 'autozone' },
      { match_type: 'contains', match_text: 'jiffy lube' },
      { match_type: 'contains', match_text: 'towing' },
      { match_type: 'contains', match_text: 'firestone' },
      { match_type: 'contains', match_text: 'discount tire' },
      { match_type: 'contains', match_text: 'les schwab' },
      { match_type: 'contains', match_text: 'valvoline' },
      { match_type: 'contains', match_text: 'midas' },
      { match_type: 'contains', match_text: 'pep boys' },
      { match_type: 'contains', match_text: 'napa auto' },
      { match_type: 'contains', match_text: 'advance auto' },
      { match_type: 'contains', match_text: 'oreilly auto' },
      { match_type: 'contains', match_text: 'o reilly auto' },
      { match_type: 'contains', match_text: 'goodyear tire' },
      { match_type: 'contains', match_text: 'mavis discount' },
      { match_type: 'contains', match_text: 'ntb ' },             // National Tire & Battery (trailing space avoids "ntb" substrings)
      // EV charging
      { match_type: 'contains', match_text: 'chargepoint' },
      { match_type: 'contains', match_text: 'electrify america' },
      { match_type: 'contains', match_text: 'evgo' },
      { match_type: 'contains', match_text: 'tesla supercharger' },
      { match_type: 'contains', match_text: 'blink charging' },
      { match_type: 'contains', match_text: 'pod point' },        // UK's largest EV network
      { match_type: 'contains', match_text: 'bp pulse' },         // BP EV charging UK/EU
      { match_type: 'contains', match_text: 'chargefox' },        // Australia's largest EV network
      // Auto repair & tire
      { match_type: 'contains', match_text: 'garage' },           // auto repair shops ("Old Town Garage", "Joe's Garage")
      // Car loan / financing ACH payments
      { match_type: 'contains', match_text: 'toyota' },           // Toyota Financial Services ACH
      { match_type: 'contains', match_text: 'honda financial' },
      { match_type: 'contains', match_text: 'ford credit' },
      { match_type: 'contains', match_text: 'gm financial' },
      { match_type: 'contains', match_text: 'hyundai capital' },
      { match_type: 'contains', match_text: 'kia motors finance' },
      { match_type: 'contains', match_text: 'subaru finance' },
      { match_type: 'contains', match_text: 'bmw financial' },
      { match_type: 'contains', match_text: 'volkswagen credit' },
      // DMV / vehicle registration
      { match_type: 'contains', match_text: 'dmv' },
      // US transit — systems
      { match_type: 'contains', match_text: 'mta ' },
      { match_type: 'contains', match_text: 'bart ' },
      { match_type: 'contains', match_text: 'cta ' },
      { match_type: 'contains', match_text: 'metro transit' },
      { match_type: 'contains', match_text: 'metra' },
      { match_type: 'contains', match_text: 'amtrak' },
      { match_type: 'contains', match_text: 'greyhound' },
      { match_type: 'contains', match_text: 'megabus' },
      // UK / Ireland rail & transit
      { match_type: 'contains', match_text: 'trainline' },        // UK's largest rail ticket platform
      { match_type: 'contains', match_text: 'tfl ' },             // Transport for London (trailing space avoids "tfl" substrings)
      { match_type: 'contains', match_text: 'oyster card' },
      { match_type: 'contains', match_text: 'lner' },             // London North Eastern Railway
      { match_type: 'contains', match_text: 'gwr' },              // Great Western Railway
      { match_type: 'contains', match_text: 'avanti west' },
      { match_type: 'contains', match_text: 'stagecoach' },
      { match_type: 'contains', match_text: 'national express' },
      { match_type: 'contains', match_text: 'arriva' },
      { match_type: 'contains', match_text: 'crosscountry' },
      { match_type: 'contains', match_text: 'irish rail' },
      { match_type: 'contains', match_text: 'iarnrod' },          // Iarnród Éireann (Irish Rail)
      { match_type: 'contains', match_text: 'translink' },        // NI/BC/QLD/SE QLD transit authority
      // Canada transit & tolls
      { match_type: 'contains', match_text: 'presto card' },      // Ontario transit payment card
      { match_type: 'contains', match_text: 'via rail' },         // VIA Rail Canada intercity train
      { match_type: 'contains', match_text: 'oc transpo' },       // Ottawa transit
      { match_type: 'contains', match_text: '407 etr' },          // Ontario's 407 Express Toll Route
      // Australia / NZ transit & tolls
      { match_type: 'contains', match_text: 'linkt' },            // AU multi-state toll operator
      { match_type: 'contains', match_text: 'myki' },             // Melbourne transit card
      { match_type: 'contains', match_text: 'smartrider' },       // Perth transit card
      { match_type: 'contains', match_text: 'opal card' },        // Sydney transit card
      { match_type: 'contains', match_text: 'at hop' },           // Auckland transit card
      { match_type: 'contains', match_text: 'go card' },          // Brisbane/SE QLD transit card
      // Tolls — US
      { match_type: 'contains', match_text: 'e-zpass' },
      { match_type: 'contains', match_text: 'sunpass' },
      { match_type: 'contains', match_text: 'fastrak' },
      { match_type: 'contains', match_text: 'peach pass' },       // Georgia toll
      { match_type: 'contains', match_text: 'kpass' },            // Kansas Turnpike
      { match_type: 'contains', match_text: 'nc quick pass' },
      // Parking
      { match_type: 'contains', match_text: 'parking' },
      { match_type: 'contains', match_text: 'spothero' },
      { match_type: 'contains', match_text: 'parkwhiz' },
      { match_type: 'contains', match_text: 'paybyphone' },       // Dominant parking app US/UK/CA/AU
      { match_type: 'contains', match_text: 'parkmobile' },
      { match_type: 'contains', match_text: 'laz parking' },
      { match_type: 'contains', match_text: 'ncp ' },             // NCP Parking UK (trailing space)
      { match_type: 'contains', match_text: 'qpark' },            // Q-Park UK/Europe
      { match_type: 'contains', match_text: 'apcoa' },            // APCOA UK/Europe
      { match_type: 'contains', match_text: 'ringgo' },           // RingGo UK parking app
      { match_type: 'contains', match_text: 'justpark' },         // JustPark UK
    ],
  },

  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '🎬',
    description: 'Streaming, movies, music, and events',
    defaultCategoryName: 'Entertainment',
    logic: 'OR',
    conditions: [
      // Streaming — US
      { match_type: 'contains', match_text: 'netflix' },
      { match_type: 'contains', match_text: 'hulu' },
      { match_type: 'contains', match_text: 'disney plus' },
      { match_type: 'contains', match_text: 'disney+' },
      { match_type: 'contains', match_text: 'disneyplus' },          // disneyplus.com variant
      { match_type: 'contains', match_text: 'hbo max' },
      { match_type: 'contains', match_text: 'hbo now' },
      { match_type: 'contains', match_text: 'max.com' },
      { match_type: 'contains', match_text: 'peacock' },
      { match_type: 'contains', match_text: 'paramount+' },
      { match_type: 'contains', match_text: 'paramount plus' },
      { match_type: 'contains', match_text: 'paramount stream' },    // "PARAMOUNT STREAMING" variant
      { match_type: 'contains', match_text: 'discovery+' },
      { match_type: 'contains', match_text: 'discovery plus' },
      { match_type: 'contains', match_text: 'apple tv' },
      { match_type: 'contains', match_text: 'amazon prime video' },
      { match_type: 'contains', match_text: 'prime video' },
      { match_type: 'contains', match_text: 'fubo' },
      { match_type: 'contains', match_text: 'sling tv' },
      { match_type: 'contains', match_text: 'youtube premium' },
      { match_type: 'contains', match_text: 'youtube tv' },
      { match_type: 'contains', match_text: 'philo tv' },
      { match_type: 'contains', match_text: 'directv' },
      // Streaming — UK / AU / international
      { match_type: 'contains', match_text: 'britbox' },             // UK drama service (US/UK/CA/AU)
      { match_type: 'contains', match_text: 'acorn tv' },            // UK/Irish content service
      { match_type: 'contains', match_text: 'hayu' },                // Reality TV service UK/IE
      { match_type: 'contains', match_text: 'now tv' },              // Sky streaming UK
      { match_type: 'contains', match_text: 'sky go' },              // Sky UK streaming
      { match_type: 'contains', match_text: 'stan streaming' },      // AU streaming service
      { match_type: 'contains', match_text: 'binge au' },            // AU Foxtel streaming
      { match_type: 'contains', match_text: 'kayo sports' },         // AU sports streaming
      // Music
      { match_type: 'contains', match_text: 'spotify' },
      { match_type: 'contains', match_text: 'apple music' },
      { match_type: 'contains', match_text: 'amazon music' },
      { match_type: 'contains', match_text: 'youtube music' },
      { match_type: 'contains', match_text: 'tidal' },
      { match_type: 'contains', match_text: 'pandora' },
      { match_type: 'contains', match_text: 'sirius xm' },
      { match_type: 'contains', match_text: 'siriusxm' },
      { match_type: 'contains', match_text: 'deezer' },              // global music service
      // Movies & theaters — US
      { match_type: 'contains', match_text: 'amc theatres' },
      { match_type: 'contains', match_text: 'amc stubs' },
      { match_type: 'contains', match_text: 'regal cinemas' },
      { match_type: 'contains', match_text: 'cinemark' },
      { match_type: 'contains', match_text: 'fandango' },
      { match_type: 'contains', match_text: 'atom tickets' },
      // Movies & theaters — UK / AU / international
      { match_type: 'contains', match_text: 'odeon cinema' },        // UK/EU chain
      { match_type: 'contains', match_text: 'cineworld' },           // UK chain
      { match_type: 'contains', match_text: 'vue cinema' },          // UK chain
      { match_type: 'contains', match_text: 'event cinema' },        // AU chain
      { match_type: 'contains', match_text: 'hoyts' },               // AU/NZ chain
      // Live events & tickets
      { match_type: 'contains', match_text: 'ticketmaster' },
      { match_type: 'contains', match_text: 'stubhub' },
      { match_type: 'contains', match_text: 'vivid seats' },
      { match_type: 'contains', match_text: 'seatgeek' },
      { match_type: 'contains', match_text: 'eventbrite' },
      { match_type: 'contains', match_text: 'axs ticket' },          // AXS Tickets
      { match_type: 'contains', match_text: 'dice music' },          // DICE — UK/global live event app
      { match_type: 'contains', match_text: 'skiddle' },             // UK events
      { match_type: 'contains', match_text: 'ticketek' },            // AU/NZ events
      // Gaming
      { match_type: 'contains', match_text: 'steam ' },              // Steam (Valve) — trailing space avoids "steamboat"
      { match_type: 'contains', match_text: 'playstation' },         // covers PSN, PlayStation Network, PS Plus
      { match_type: 'contains', match_text: 'psn ' },                // PSN Digital — trailing space
      { match_type: 'contains', match_text: 'xbox' },                // covers Xbox Game Pass, Microsoft Xbox
      { match_type: 'contains', match_text: 'nintendo' },
      { match_type: 'contains', match_text: 'apple arcade' },
      { match_type: 'contains', match_text: 'google play' },         // Google Play games/apps
      { match_type: 'contains', match_text: 'epic games' },
      { match_type: 'contains', match_text: 'twitch' },
      { match_type: 'contains', match_text: 'roblox' },
      { match_type: 'contains', match_text: 'ea games' },
      { match_type: 'contains', match_text: 'electronic arts' },
      // Sports
      { match_type: 'contains', match_text: 'espn+' },
      { match_type: 'contains', match_text: 'espn plus' },
      { match_type: 'contains', match_text: 'dazn' },                // global sport streaming
      { match_type: 'contains', match_text: 'nba league pass' },
      { match_type: 'contains', match_text: 'nfl sunday ticket' },
      // Recreation
      { match_type: 'contains', match_text: 'dave & busters' },
      { match_type: 'contains', match_text: 'dave and busters' },
      { match_type: 'contains', match_text: 'topgolf' },
      { match_type: 'contains', match_text: 'disneyland' },
      { match_type: 'contains', match_text: 'universal studios' },
      { match_type: 'contains', match_text: 'six flags' },
    ],
  },

  {
    id: 'shopping',
    name: 'Shopping',
    emoji: '🛍️',
    description: 'Online and retail purchases',
    defaultCategoryName: 'Shopping',
    logic: 'OR',
    conditions: [
      { match_type: 'contains', match_text: 'amazon' },
      { match_type: 'contains', match_text: 'walmart' },
      { match_type: 'contains', match_text: 'target' },
      { match_type: 'contains', match_text: 'best buy' },
      { match_type: 'contains', match_text: 'home depot' },
      { match_type: 'contains', match_text: 'lowe\'s' },
      { match_type: 'contains', match_text: 'lowes' },
      { match_type: 'contains', match_text: 'costco' },
      { match_type: 'contains', match_text: 'sam\'s club' },
      { match_type: 'contains', match_text: 'bj\'s wholesale' },
      { match_type: 'contains', match_text: 'ikea' },
      { match_type: 'contains', match_text: 'wayfair' },
      { match_type: 'contains', match_text: 'chewy' },
      { match_type: 'contains', match_text: 'ebay' },
      { match_type: 'contains', match_text: 'etsy' },
      { match_type: 'contains', match_text: 'nordstrom' },
      { match_type: 'contains', match_text: 'macy\'s' },
      { match_type: 'contains', match_text: 'macys' },
      { match_type: 'contains', match_text: 'kohls' },
      { match_type: 'contains', match_text: 'kohl\'s' },
      { match_type: 'contains', match_text: 'jcpenney' },
      { match_type: 'contains', match_text: 'sears' },
      { match_type: 'contains', match_text: 'old navy' },
      { match_type: 'contains', match_text: 'gap store' },
      { match_type: 'contains', match_text: 'banana republic' },
      { match_type: 'contains', match_text: 'h&m' },
      { match_type: 'contains', match_text: 'zara' },
      { match_type: 'contains', match_text: 'uniqlo' },
      { match_type: 'contains', match_text: 'tj maxx' },
      { match_type: 'contains', match_text: 't.j. maxx' },
      { match_type: 'contains', match_text: 'marshalls' },
      { match_type: 'contains', match_text: 'ross stores' },
      { match_type: 'contains', match_text: 'burlington' },
      { match_type: 'contains', match_text: 'dollar tree' },
      { match_type: 'contains', match_text: 'dollar general' },
      { match_type: 'contains', match_text: 'five below' },
      { match_type: 'contains', match_text: 'menards' },
      { match_type: 'contains', match_text: 'ace hardware' },
      { match_type: 'contains', match_text: 'michaels store' },
      { match_type: 'contains', match_text: 'hobby lobby' },
      { match_type: 'contains', match_text: 'joann fabric' },
      { match_type: 'contains', match_text: 'petco' },
      { match_type: 'contains', match_text: 'petsmart' },
      { match_type: 'contains', match_text: 'bath & body' },
      { match_type: 'contains', match_text: 'victoria\'s secret' },
      { match_type: 'contains', match_text: 'vs pink' },
      { match_type: 'contains', match_text: 'nike' },
      { match_type: 'contains', match_text: 'adidas' },
      { match_type: 'contains', match_text: 'apple store' },
      { match_type: 'contains', match_text: 'apple.com' },
      { match_type: 'contains', match_text: 'microsoft store' },
      // Online retail — additional
      { match_type: 'contains', match_text: 'wish.com' },
      { match_type: 'contains', match_text: 'overstock' },
      { match_type: 'contains', match_text: 'shein' },
      { match_type: 'contains', match_text: 'temu' },
      { match_type: 'contains', match_text: 'newegg' },
      { match_type: 'contains', match_text: 'b&h photo' },
      { match_type: 'contains', match_text: 'adorama' },             // photo/video gear retailer
      // Department stores — additional
      { match_type: 'contains', match_text: 'bloomingdale' },
      { match_type: 'contains', match_text: 'dillard' },
      { match_type: 'contains', match_text: 'belk' },
      { match_type: 'contains', match_text: 'jc penney' },           // "JC PENNEY" space variant (jcpenney already covered)
      { match_type: 'contains', match_text: 'ross dress' },          // Ross Dress for Less
      // Home & decor — additional
      { match_type: 'contains', match_text: 'bed bath' },
      { match_type: 'contains', match_text: 'crate and barrel' },
      { match_type: 'contains', match_text: 'williams sonoma' },
      { match_type: 'contains', match_text: 'pottery barn' },
      { match_type: 'contains', match_text: 'restoration hardware' },
      { match_type: 'contains', match_text: 'harbor freight' },
      // Clothing — additional
      { match_type: 'contains', match_text: 'h and m' },             // H&M space-spelled variant
      { match_type: 'contains', match_text: 'forever 21' },
      { match_type: 'contains', match_text: 'american eagle' },
      { match_type: 'contains', match_text: 'abercrombie' },
      { match_type: 'contains', match_text: 'hollister' },
      { match_type: 'contains', match_text: 'anthropologie' },
      { match_type: 'contains', match_text: 'free people' },
      { match_type: 'contains', match_text: 'lululemon' },
      { match_type: 'contains', match_text: 'foot locker' },
    ],
  },

  {
    id: 'health',
    name: 'Health',
    emoji: '💊',
    description: 'Pharmacy, doctor, gym, and insurance',
    defaultCategoryName: 'Health',
    logic: 'OR',
    conditions: [
      // Pharmacies — US
      { match_type: 'contains', match_text: 'cvs' },                 // covers CVS PHARMACY, CVS #, CVS/PHARMACY
      { match_type: 'contains', match_text: 'walgreen' },
      { match_type: 'contains', match_text: 'rite aid' },
      { match_type: 'contains', match_text: 'duane reade' },
      { match_type: 'contains', match_text: 'bartell drug' },        // Bartell Drugs (PNW)
      { match_type: 'contains', match_text: 'express scripts' },
      { match_type: 'contains', match_text: 'caremark' },
      { match_type: 'contains', match_text: 'optumrx' },
      { match_type: 'contains', match_text: 'goodrx' },
      { match_type: 'contains', match_text: 'amazon pharmacy' },
      // Pharmacies — UK / international
      { match_type: 'contains', match_text: 'boots pharmacy' },      // Boots UK — bare "boots" too risky (Boot Barn)
      { match_type: 'contains', match_text: 'lloyds pharmacy' },
      { match_type: 'contains', match_text: 'superdrug' },
      { match_type: 'contains', match_text: 'nhs ' },               // NHS Prescription (trailing space)
      // Pharmacies — Canada
      { match_type: 'contains', match_text: 'shoppers drug mart' },
      { match_type: 'contains', match_text: 'rexall' },
      // Pharmacies — AU
      { match_type: 'contains', match_text: 'priceline pharmacy' },
      { match_type: 'contains', match_text: 'chemist warehouse' },
      { match_type: 'contains', match_text: 'terry white' },         // Terry White Chemmart AU
      // Healthcare providers
      { match_type: 'contains', match_text: 'urgent care' },
      { match_type: 'contains', match_text: 'american family care' },
      { match_type: 'contains', match_text: 'patient first' },
      { match_type: 'contains', match_text: 'concentra' },
      { match_type: 'contains', match_text: 'nextcare' },
      { match_type: 'contains', match_text: 'aspen dental' },
      { match_type: 'contains', match_text: 'dental office' },
      { match_type: 'contains', match_text: 'labcorp' },
      { match_type: 'contains', match_text: 'quest diagnostics' },
      { match_type: 'contains', match_text: 'planned parenthood' },
      { match_type: 'contains', match_text: 'doctor' },
      // Vision
      { match_type: 'contains', match_text: 'vision works' },
      { match_type: 'contains', match_text: 'lenscrafters' },
      { match_type: 'contains', match_text: 'warby parker' },        // also fixes food FP — arby catches arby's, not warby
      { match_type: 'contains', match_text: 'america\'s best contacts' },
      // Health insurance
      { match_type: 'contains', match_text: 'kaiser permanente' },
      { match_type: 'contains', match_text: 'blue cross' },
      { match_type: 'contains', match_text: 'bluecross' },
      { match_type: 'contains', match_text: 'aetna' },
      { match_type: 'contains', match_text: 'cigna' },
      { match_type: 'contains', match_text: 'united healthcare' },   // "UNITED HEALTHCARE" (space variant)
      { match_type: 'contains', match_text: 'unitedhealth' },        // "UNITEDHEALTH" (run-together variant)
      { match_type: 'contains', match_text: 'anthem' },
      { match_type: 'contains', match_text: 'humana' },
      { match_type: 'contains', match_text: 'bupa' },               // UK/AU/global health insurer
      // Gyms & fitness
      { match_type: 'contains', match_text: 'planet fitness' },
      { match_type: 'contains', match_text: 'la fitness' },
      { match_type: 'contains', match_text: 'anytime fitness' },
      { match_type: 'contains', match_text: '24 hour fitness' },
      { match_type: 'contains', match_text: 'gold\'s gym' },
      { match_type: 'contains', match_text: 'golds gym' },
      { match_type: 'contains', match_text: 'equinox' },
      { match_type: 'contains', match_text: 'crunch fitness' },
      { match_type: 'contains', match_text: 'ymca' },
      { match_type: 'contains', match_text: 'classpass' },
      { match_type: 'contains', match_text: 'peloton' },
      { match_type: 'contains', match_text: 'lifetime fitness' },
      { match_type: 'contains', match_text: 'orangetheory' },
      { match_type: 'contains', match_text: 'pure barre' },
      { match_type: 'contains', match_text: 'crossfit' },
      { match_type: 'contains', match_text: 'f45 training' },
      { match_type: 'contains', match_text: 'soulcycle' },
      { match_type: 'contains', match_text: 'barry\'s bootcamp' },
      { match_type: 'contains', match_text: 'mindbody' },
      { match_type: 'contains', match_text: 'strava' },
      // Digital health & wellness
      { match_type: 'contains', match_text: 'betterhelp' },
      { match_type: 'contains', match_text: 'talkspace' },
      { match_type: 'contains', match_text: 'headspace' },
      { match_type: 'contains', match_text: 'calm app' },
      { match_type: 'contains', match_text: 'noom' },
      { match_type: 'contains', match_text: 'beachbody' },
      { match_type: 'contains', match_text: 'mirror fitness' },
      // Telehealth
      { match_type: 'contains', match_text: 'teladoc' },
      { match_type: 'contains', match_text: 'mdlive' },
      { match_type: 'contains', match_text: 'sesamecare' },
    ],
  },
];
