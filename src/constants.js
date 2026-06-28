// 属性/タイプの表示色や対応関係など、複数モジュールが参照する静的な定数。
export const DARK_MAP = {
  'Neutral': 'Null',
  'Native':  'DarkNative',
  'Fire':    'DarkFire',
  'Earth':   'DarkEarth',
  'Water':   'DarkWater',
  'Wind':    'DarkWind',
  'Elec':    'DarkElec',
  'Machine': 'DarkMachine',
  'Ice':     'DarkIce',
};

export const ATTR_COLORS = {
  'Neutral':     'bg-gray-200 text-gray-700',
  'Native':      'bg-green-100 text-green-800',
  'Fire':        'bg-red-100 text-red-700',
  'DarkFire':    'bg-red-900 text-red-200',
  'Earth':       'bg-yellow-100 text-yellow-800',
  'DarkEarth':   'bg-yellow-900 text-yellow-200',
  'Water':       'bg-blue-100 text-blue-700',
  'DarkWater':   'bg-blue-900 text-blue-200',
  'Wind':        'bg-sky-100 text-sky-700',
  'DarkWind':    'bg-sky-900 text-sky-200',
  'Elec':        'bg-yellow-200 text-yellow-900',
  'DarkElec':    'bg-yellow-900 text-yellow-200',
  'Machine':     'bg-slate-200 text-slate-700',
  'DarkMachine': 'bg-slate-900 text-slate-200',
  'Virtual':     'bg-purple-100 text-purple-700',
  'Gold':        'bg-amber-100 text-amber-800',
  'Ice':         'bg-cyan-100 text-cyan-700',
  'DarkIce':     'bg-cyan-900 text-cyan-200',
  'DarkNative':  'bg-green-900 text-green-200',
  'Null':        'bg-gray-700 text-gray-200',
};

export const TYPE_LABELS = { tama: 'タマ', appli: 'アプリ', virus: 'ウイルス', patch: 'パッチ' };

// 種族の文字色(scripts/effects_ja.py の _YELLOW と同じ色。効果テキスト内の属性/種族表記と揃える)
export const TRIBE_TEXT_COLOR = '#f5bf42';

export const ALL_CARD_TYPES = ['tama', 'appli', 'patch', 'virus'];

export const SORT_KEYS = {
  'タイプ': 'card_type', 'コスト': 'cost',
  'Lv': 'lv', 'HP': 'hp', 'BP': 'bp',
};

// 種族一覧に添える絵文字(画像サムネイルの代わりに見分けやすくするための軽量な目印)。
// 未定義の種族(None など)はラベルのみ表示する。
export const TRIBE_EMOJI = {
  Fairy: '🧚', Bird: '🐦', Insect: '🐛', Plant: '🌿', Fish: '🐟',
  Lizard: '🦎', Bear: '🐻', Phantasm: '👻', Man: '🧍', Dragon: '🐉',
  Gemstone: '💎', Mouse: '🐭', Mechanica: '⚙️', Building: '🏛️', Wolf: '🐺',
  Amphibian: '🐸', Dinosaur: '🦖', Dummy: '🎭', Fox: '🦊', Mole: '🐾',
  Rabbit: '🐰', Royalkind: '👑', Faunkind: '🌳', Crab: '🦀', Snail: '🐌',
  Cat: '🐱', Cheese: '🧀', Snake: '🐍', Goat: '🐐',
};
