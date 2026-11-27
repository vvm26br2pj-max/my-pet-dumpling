/* My Pet Dumpling — static game data */
window.DG = window.DG || {};
(function (DG) {
  const H = 3600e3;
  DG.HOUR = H;
  DG.DAY = 24 * H;

  DG.STAGES = [
    { id: 'baby',   name: 'Baby',   at: 0,        scale: 0.62, cap: 40,
      unlocks: ['Basic care', 'Gentle (Easy) training', 'Friend battles'] },
    { id: 'small',  name: 'Small',  at: 1 * H,    scale: 0.7,  cap: 50,
      unlocks: ['Arena battles', 'The first two challengers'] },
    { id: 'medium', name: 'Medium', at: 24 * H,   scale: 0.8,  cap: 60,
      unlocks: ['Starter special move', 'Medium training', 'Two new challengers'] },
    { id: 'large',  name: 'Large',  at: 7 * 24 * H,  scale: 1.0,  cap: 80,
      unlocks: ['Advanced (Hard) training', 'A second battle move', 'A new look based on training', 'A tough new challenger'] },
    { id: 'giant',  name: 'Giant',  at: 30 * 24 * H, scale: 1.32, cap: 100,
      unlocks: ['Ultimate move', 'Grand arena entrance', 'The Giant arena', 'The final challengers'] },
  ];

  DG.STAT_KEYS = ['strength', 'stamina', 'agility', 'defense', 'focus'];
  DG.STAT_INFO = {
    strength: { name: 'Strength', icon: '💪', color: '#ff8f7d', game: 'ricesack' },
    stamina:  { name: 'Stamina',  icon: '🔋', color: '#ffc75a', game: 'jumprope' },
    agility:  { name: 'Agility',  icon: '💨', color: '#6fd3b5', game: 'hurdles' },
    defense:  { name: 'Defense',  icon: '🛡️', color: '#7fb2ff', game: 'peadodge' },
    focus:    { name: 'Focus',    icon: '🎯', color: '#c49bff', game: 'balance' },
  };

  DG.MOVES = {
    steampuff:   { name: 'Steam Puff',   desc: 'Releases a cloud that pushes opponents back.' },
    crispydash:  { name: 'Crispy Dash',  desc: 'Dashes forward with a spinning attack.' },
    brothbubble: { name: 'Broth Bubble', desc: 'Creates a temporary protective bubble.' },
    bunslam:     { name: 'Bun Slam',     desc: 'Hops high and lands with a squishy shockwave.' },
    pleatflurry: { name: 'Pleat Flurry', desc: 'A quick flurry of three pleat-slaps.' },
    ladlesplash: { name: 'Ladle Splash', desc: 'Sends a rolling wave of warm broth forward.' },
    grandsteamer:{ name: 'Grand Steamer',     desc: 'ULTIMATE: a giant steam eruption that blasts the whole area.' },
    goldenfry:   { name: 'Golden Fry Tornado',desc: 'ULTIMATE: a sizzling golden whirlwind.' },
    hotpot:      { name: 'Hot Pot Tsunami',   desc: 'ULTIMATE: a cozy tidal wave of broth.' },
  };

  DG.STARTERS = {
    bao: {
      id: 'bao', name: 'Bao', kind: 'Steamed Bun',
      desc: 'A round steamed bun with a little swirl on top. Cheerful and cuddly.',
      strength: 'Balanced',
      base: { strength: 14, stamina: 14, agility: 10, defense: 10, focus: 10 },
      colors: { base: '#f3e6d2', light: '#ffffff', line: '#d6bf9e', hex: 0xfff4e6 },
      moves: { special: 'steampuff', move2: 'bunslam', ult: 'grandsteamer' },
    },
    gyoza: {
      id: 'gyoza', name: 'Gyoza', kind: 'Pan-Fried Dumpling',
      desc: 'A crescent-shaped dumpling with pleated edges. Energetic and mischievous.',
      strength: 'Speed and agility',
      base: { strength: 11, stamina: 10, agility: 18, defense: 9, focus: 10 },
      colors: { base: '#f2d199', light: '#fff4d8', line: '#c99a52', hex: 0xf7dba2 },
      moves: { special: 'crispydash', move2: 'pleatflurry', ult: 'goldenfry' },
    },
    soup: {
      id: 'soup', name: 'Shumai', kind: 'Open-Top Dumpling',
      desc: 'A frilly little cup of a dumpling with an open top. Sleepy and affectionate.',
      strength: 'Defense and recovery',
      base: { strength: 9, stamina: 12, agility: 8, defense: 18, focus: 11 },
      colors: { base: '#f1e3d3', light: '#fffdf8', line: '#cfb9a0', hex: 0xfbf0e2 },
      moves: { special: 'brothbubble', move2: 'ladlesplash', ult: 'hotpot' },
    },
  };

  /* ---------- Appearance choices (picked at adoption, changeable in the Closet) ---------- */
  DG.LOOK_COLORS = {
    classic:  { name: 'Classic',    swatch: null },
    pink:     { name: 'Strawberry', base: '#ffcfdc', light: '#fff1f5', line: '#e39ab0', hex: 0xffd3df },
    peach:    { name: 'Peach',      base: '#ffcbb0', light: '#fff0e6', line: '#e09a78', hex: 0xffd0b8 },
    mango:    { name: 'Mango',      base: '#ffdf85', light: '#fff7d6', line: '#d9ae3f', hex: 0xffe08a },
    matcha:   { name: 'Matcha',     base: '#cbe6b2', light: '#f1fae6', line: '#93bd74', hex: 0xcfe8b8 },
    mint:     { name: 'Mint',       base: '#bfeadb', light: '#effbf6', line: '#7fc6ad', hex: 0xc4ecdf },
    sky:      { name: 'Blueberry',  base: '#c9ddfa', light: '#f0f6ff', line: '#8eaee0', hex: 0xcfe3fb },
    taro:     { name: 'Taro',       base: '#dac8f2', light: '#f6f0ff', line: '#a88dd0', hex: 0xdccbf2 },
    choco:    { name: 'Chocolate',  base: '#d6aa84', light: '#f2dcc6', line: '#a3734c', hex: 0xd9b08c },
    sesame:   { name: 'Sesame',     base: '#a9a9b6', light: '#e1e1ea', line: '#73737f', hex: 0xb0b0bd },
    slate:    { name: 'Slate',      base: '#aab4c4', light: '#e6ebf2', line: '#76839a', hex: 0xb0bacb },
    ocean:    { name: 'Ocean',      base: '#9ec3ee', light: '#e3effd', line: '#5f8fc8', hex: 0xa6c8f0 },
    forest:   { name: 'Forest',     base: '#a9cf96', light: '#e6f4dc', line: '#6c9a58', hex: 0xb0d29e },
    chili:    { name: 'Chili',      base: '#f4a98e', light: '#fde4da', line: '#cf6e52', hex: 0xf5ae94 },
    toast:    { name: 'Toasty',     base: '#e6bd85', light: '#fbecd6', line: '#b48650', hex: 0xe8c08c },
  };
  DG.EYES = {
    round:   { name: 'Round' },
    sparkle: { name: 'Sparkly' },
    dot:     { name: 'Button' },
    lash:    { name: 'Lashes' },
    sleepy:  { name: 'Sleepy' },
    wide:    { name: 'Big Wide' },
    fierce:  { name: 'Determined' },
    cool:    { name: 'Cool' },
  };
  DG.CHEEKS = {
    blush:    { name: 'Rosy' },
    big:      { name: 'Extra Rosy' },
    hearts:   { name: 'Hearts' },
    freckles: { name: 'Freckles' },
    stars:    { name: 'Stars' },
    bandage:  { name: 'Bandage' },
    none:     { name: 'None' },
  };
  DG.lookColors = function (type, look) {
    const c = look && DG.LOOK_COLORS[look.color];
    return c && c.base ? c : DG.STARTERS[type].colors;
  };

  /* ---------- Home customization ---------- */
  DG.WALLS = {
    peach:    { name: 'Peach',     a: '#fde8d6', b: '#fbdcc6', trim: '#f2c3a6' },
    mint:     { name: 'Mint',      a: '#dff5ea', b: '#cfeedf', trim: '#a9d9c2' },
    sky:      { name: 'Sky',       a: '#e2efff', b: '#d2e5fd', trim: '#a9c6ec' },
    lavender: { name: 'Lavender',  a: '#efe6ff', b: '#e4d8fb', trim: '#c4b0e6' },
    lemon:    { name: 'Lemon',     a: '#fff6d2', b: '#fdefb8', trim: '#ecd486' },
    rose:     { name: 'Rose',      a: '#ffe4ec', b: '#fdd6e2', trim: '#efb0c3' },
    cream:    { name: 'Cream',     a: '#fbf6ee', b: '#f3ebdf', trim: '#ddcdb6' },
    navy:     { name: 'Starry Navy', a: '#3a4278', b: '#343b6e', trim: '#252b55', dark: true },
    sage:     { name: 'Sage',      a: '#e3ecd9', b: '#d4e2c6', trim: '#a9bf94' },
    forest:   { name: 'Forest',    a: '#5f8a63', b: '#557d59', trim: '#3f6244', dark: true },
    ocean:    { name: 'Ocean',     a: '#cfe4f2', b: '#bcd7ea', trim: '#86afcd' },
    slate:    { name: 'Slate',     a: '#d9dee6', b: '#cbd2dc', trim: '#9aa6b6' },
    sand:     { name: 'Sand',      a: '#f1e2c8', b: '#e8d5b4', trim: '#c9ae84' },
    brick:    { name: 'Brick Red', a: '#c9715e', b: '#ba6452', trim: '#8f4638', dark: true },
    charcoal: { name: 'Charcoal',  a: '#4a4e58', b: '#42464f', trim: '#2e3138', dark: true },
    custom:   { name: 'Custom',    a: '#ffe9d6', b: '#fbdcc6', trim: '#e9bfa0', custom: true },
  };
  DG.PATTERNS = {
    stripes: { name: 'Stripes' },
    dots:    { name: 'Polka Dots' },
    hearts:  { name: 'Hearts' },
    stars:   { name: 'Stars' },
    plaid:   { name: 'Plaid' },
    brick:   { name: 'Bricks' },
    planks:  { name: 'Wood Panels' },
    zigzag:  { name: 'Zigzag' },
    diamonds:{ name: 'Diamonds' },
    clouds:  { name: 'Clouds' },
    rockets: { name: 'Rockets' },
    plain:   { name: 'Plain' },
  };
  DG.FLOORS = {
    wood:    { name: 'Honey Wood',  a: '#eac9a0', b: '#ddb487', line: 'rgba(160,110,60,0.25)' },
    dark:    { name: 'Walnut',      a: '#b98a62', b: '#a3764f', line: 'rgba(80,50,25,0.3)' },
    checker: { name: 'Checkers',    a: '#fff4e6', b: '#f4c7c7', line: null, checker: true },
    tatami:  { name: 'Tatami',      a: '#dfe3b0', b: '#cfd59a', line: 'rgba(110,120,50,0.3)', tatami: true },
    carpet:  { name: 'Fluffy Carpet', a: '#d9cdf2', b: '#cbbdea', line: null },
  };

  DG.FOODS = {
    rice:   { name: 'Rice Bowl',         icon: '🍚', price: 0,  free: true, full: 25, hap: 2,  en: 0,
              desc: 'Free everyday meal. Always available!' },
    veg:    { name: 'Vegetable Platter', icon: '🥦', price: 6,  full: 22, hap: 2, en: 8,
              desc: 'Fullness + a little energy.' },
    tofu:   { name: 'Tofu Bites',        icon: '🍢', price: 12, full: 18, hap: 3, en: 0,
              bonus: { type: 'strength', label: '+10% attack power' },
              desc: 'Fullness + small strength boost for the next battle.' },
    noodle: { name: 'Noodle Nest',       icon: '🍜', price: 12, full: 20, hap: 3, en: 0,
              bonus: { type: 'stamina', label: '+20% battle stamina' },
              desc: 'Fullness + small stamina boost for the next battle.' },
    broth:  { name: 'Warm Broth',        icon: '🥣', price: 8,  full: 12, hap: 3, en: 18,
              desc: 'Some fullness + extra energy.' },
    berry:  { name: 'Berry Bites',       icon: '🫐', price: 6,  full: 6,  hap: 14, en: 0,
              desc: 'Light snack that lifts happiness.' },
    peach:  { name: 'Peach Slices',      icon: '🍑', price: 8,  full: 6,  hap: 8, en: 7,
              desc: 'Refreshing! A little energy and happiness.' },
    cake:   { name: 'Celebration Cake',  icon: '🎂', price: 40, full: 10, hap: 35, en: 0, rare: true,
              desc: 'Rare treat: huge happiness and a party!' },
  };
  DG.FOOD_ORDER = ['rice', 'veg', 'tofu', 'noodle', 'broth', 'berry', 'peach', 'cake'];

  DG.ACCESSORIES = {
    bow:      { name: 'Pink Bow',        icon: '🎀', price: 15, starter: true, tint: '#ff8fb4' },
    tinyhat:  { name: 'Tiny Top Hat',    icon: '🎩', price: 15, tint: '#7c7590' },
    headband: { name: 'Polka Headband',  icon: '💜', price: 15, tint: '#c9a8f5' },
    cap:      { name: 'Baseball Cap',    icon: '🧢', price: 15, starter: true, tint: '#5a95e6' },
    bowtie:   { name: 'Bow Tie',         icon: '👔', price: 15, tint: '#4a6bb0' },
    shades:   { name: 'Cool Shades',     icon: '🕶️', price: 25, tint: '#5d6375' },
    headphones: { name: 'Headphones',    icon: '🎧', price: 30, starter: true, tint: '#3fbf7a' },
    ninja:    { name: 'Ninja Headband',  icon: '🥷', price: 30, tint: '#5a6680' },
    viking:   { name: 'Viking Helmet',   icon: '⚔️', price: 45, starter: true, tint: '#b8875a' },
    mustache: { name: 'Mustache',        icon: '🥸', price: 20, tint: '#9a6a44' },
    chef:     { name: 'Chef Hat',        icon: '👨‍🍳', price: 30, tint: '#a9bccf' },
    party:    { name: 'Party Hat',       icon: '🥳', price: 25, tint: '#6fc3ff' },
    flower:   { name: 'Flower Crown',    icon: '🌼', price: 35, tint: '#ffcf5a' },
    beret:    { name: 'Artist Beret',    icon: '🎨', price: 30, tint: '#e0626f' },
    glasses:  { name: 'Round Glasses',   icon: '👓', price: 25, tint: '#8a78bd' },
    crown:    { name: 'Golden Crown',    icon: '👑', price: 120, tint: '#ffc93a' },
  };

  DG.TRAITS = {
    strength: { name: 'Power Headband', icon: '🔴', desc: 'Earned from strength training.' },
    agility:  { name: 'Sporty Scarf',   icon: '🧣', desc: 'Earned from agility training.' },
    defense:  { name: 'Padded Vest',    icon: '🦺', desc: 'Earned from defense training.' },
  };

  DG.TOYS = {
    ball:     { name: 'Bouncy Ball',      icon: '⚽', price: 0,  tip: 'Tap the floor to throw the ball!' },
    mushroom: { name: 'Squeaky Mushroom', icon: '🍄', price: 0,  tip: 'Tap the squeaky mushroom!' },
    hoop:     { name: 'Rolling Hoop',     icon: '⭕', price: 20, tip: 'Tap anywhere to roll the hoop!' },
    bubbles:  { name: 'Bubble Wand',      icon: '🫧', price: 15, tip: 'Tap to blow bubbles for your dumpling to pop!' },
    drum:     { name: 'Tiny Drum',        icon: '🥁', price: 20, tip: 'Tap the drum. Your dumpling dances to the beat!' },
    feather:  { name: 'Feather Wand',     icon: '🪶', price: 20, tip: 'Tap around the room. Your dumpling pounces on the feather!' },
    blocks:   { name: 'Stacking Blocks',  icon: '🧱', price: 25, tip: 'Tap to stack blocks, then watch the crash!' },
    kite:     { name: 'Little Kite',      icon: '🪁', price: 30, tip: 'Tap to make the kite swoop. Your dumpling jumps for it!' },
  };

  DG.DECOR = {
    rug:      { name: 'Cozy Rug',        icon: '🟣', price: 20 },
    plant:    { name: 'Potted Plant',    icon: '🪴', price: 20 },
    poster:   { name: 'Dumpling Poster', icon: '🖼️', price: 25 },
    lantern:  { name: 'Paper Lantern',   icon: '🏮', price: 30 },
    lights:   { name: 'Fairy Lights',    icon: '✨', price: 40 },
    clock:    { name: 'Wall Clock',      icon: '🕰️', price: 20 },
    painting: { name: 'Mountain Painting', icon: '🏞️', price: 25 },
    shelf:    { name: 'Bookshelf',       icon: '📚', price: 35 },
    fish:     { name: 'Fishbowl',        icon: '🐠', price: 35 },
    beanbag:  { name: 'Beanbag',         icon: '🛋️', price: 30 },
    teddy:    { name: 'Teddy Bear',      icon: '🧸', price: 25 },
  };

  DG.ARENAS = {
    classic: { name: 'Classic Bamboo',  icon: '🎋', price: 0,  sky: 0xffe9cf, floor: '#e8c48c', wall: '#c99b55', ground: 0xf1d6a8 },
    night:   { name: 'Night Market',    icon: '🏮', price: 60, sky: 0x1f2552, floor: '#b88c5c', wall: '#8e6a3d', ground: 0x2c2f5c },
    blossom: { name: 'Cherry Blossom',  icon: '🌸', price: 60, sky: 0xffdbe8, floor: '#f0c9a2', wall: '#d79b9b', ground: 0xffe6ef },
  };

  DG.STYLES = {
    charger: { name: 'Charger', icon: '🔥', tip: 'Rushes in and swings often. Dodge its wind-up, then counter!' },
    blocker: { name: 'Blocker', icon: '🛡️', tip: 'Guards a lot and counterattacks. Wait until its stamina is low, or use your special.' },
    dodger:  { name: 'Dodger',  icon: '💨', tip: 'Darts around and dodges. Attack right after it dodges.' },
    mixed:   { name: 'Champion', icon: '⭐', tip: 'Switches styles. Watch closely!' },
  };

  DG.OPPONENTS = [
    { id: 'chili',    name: 'Chili Wonton',      shape: 'gyoza', color: '#ffb08a', hex: 0xffb08a, style: 'charger', tier: 0, minStage: 1, acc: 'headband' },
    { id: 'shumai',   name: 'Sir Shumai',        shape: 'soup',  color: '#ffe08a', hex: 0xffe08a, style: 'blocker', tier: 1, minStage: 1, acc: 'tinyhat' },
    { id: 'hargow',   name: 'Zippy Har Gow',     shape: 'gyoza', color: '#ffd3df', hex: 0xffd3df, style: 'dodger',  tier: 2, minStage: 2, acc: 'bow' },
    { id: 'pierogi',  name: 'Big Pierogi',       shape: 'gyoza', color: '#f2d7a6', hex: 0xf2d7a6, style: 'charger', tier: 3, minStage: 2, acc: 'beret' },
    { id: 'momo',     name: 'Momo the Wall',     shape: 'soup',  color: '#d4ecc4', hex: 0xd4ecc4, style: 'blocker', tier: 4, minStage: 3, acc: 'chef' },
    { id: 'mandu',    name: 'Mandu Flash',       shape: 'gyoza', color: '#c9dbf5', hex: 0xc9dbf5, style: 'dodger',  tier: 5, minStage: 4, acc: 'glasses' },
    { id: 'champion', name: 'Grand Bao Champion',shape: 'bao',   color: '#ffd76a', hex: 0xffd76a, style: 'mixed',   tier: 6, minStage: 4, acc: 'crown' },
  ];

  DG.ACHIEVEMENTS = {
    adopted:      { name: 'New Family',         icon: '🥟', desc: 'Adopt a baby dumpling.', coins: 5 },
    firstMeal:    { name: 'First Meal',         icon: '🍚', desc: 'Feed your dumpling.', coins: 5 },
    firstBath:    { name: 'First Bath',         icon: '🛁', desc: 'Give your dumpling a full bath.', coins: 10 },
    bestBuds:     { name: 'Best Buds',          icon: '💕', desc: 'Pet your dumpling 25 times.', coins: 10 },
    favorite:     { name: 'Favorite Food',      icon: '⭐', desc: 'Discover your dumpling\'s favorite food.', coins: 10 },
    party:        { name: 'Party Time',         icon: '🎂', desc: 'Share a Celebration Cake.', coins: 5 },
    firstTrain:   { name: 'Warm-Up',            icon: '🏋️', desc: 'Finish a training session.', coins: 5 },
    tenPerfect:   { name: 'Ten Perfect Jumps',  icon: '🪢', desc: 'Land 10 perfect jumps in Jump Rope.', coins: 15 },
    allTraining:  { name: 'Well-Rounded',       icon: '🌈', desc: 'Try all five training games.', coins: 15 },
    firstWin:     { name: 'First Arena Win',    icon: '🏆', desc: 'Win an arena battle.', coins: 20 },
    champion:     { name: 'Steamer Champion',   icon: '👑', desc: 'Defeat every arena opponent.', coins: 100 },
    grownMedium:  { name: 'Growing Up',         icon: '🌱', desc: 'Reach the Medium stage.', coins: 10 },
    grownLarge:   { name: 'Big Dumpling',       icon: '🌿', desc: 'Reach the Large stage.', coins: 20 },
    fullyGrown:   { name: 'Fully Grown',        icon: '🌳', desc: 'Reach the Giant stage.', coins: 50 },
    shopper:      { name: 'Treat Yourself',     icon: '🛍️', desc: 'Buy something from the shop.', coins: 5 },
    firstWalk:    { name: 'Fresh Air',          icon: '🌳', desc: 'Take your dumpling on a walk.', coins: 10 },
    decorator:    { name: 'Interior Designer',  icon: '🎨', desc: 'Change your home\'s wall or floor.', coins: 5 },
  };
})(window.DG);
