export interface Answer {
  question: string
  answer: string
  tip?: string
}

interface Entry {
  keywords: string[]
  question: string
  answer: string
  tip?: string
}

const KB: Entry[] = [
  {
    keywords: ['sour', 'acid', 'acidic', 'sharp', 'under', 'tart', 'bright too'],
    question: 'Why is my coffee sour?',
    answer: 'Sourness means under-extraction — the water didn\'t dissolve enough from the coffee. The acids come out first; the sweetness and body come later. Fix: grind finer (more surface area), brew hotter, or steep longer.',
    tip: 'Espresso tip: if sour without bitter, grind finer and pull a touch longer. If both sour AND bitter, try a finer grind but reduce your dose slightly.'
  },
  {
    keywords: ['bitter', 'harsh', 'over', 'burnt', 'astringent', 'dry finish'],
    question: 'Why is my coffee bitter?',
    answer: 'Bitterness = over-extraction — too many compounds pulled out, including the unpleasant ones. Causes: grind too fine, brew too hot, too long, or too much coffee relative to water. Fix: grind coarser, brew cooler, or shorten steep time.',
    tip: 'A little bitterness is normal and desirable — it adds balance. Pure harshness is the problem. Also check your water temperature — above 96°C amplifies bitterness significantly.'
  },
  {
    keywords: ['fast', 'quick', 'too short', 'rushed', 'coarse', 'watery thin'],
    question: 'Why is my shot pulling too fast?',
    answer: 'A fast shot (under 20–22s) means the water flows through too easily. Grind is too coarse, dose is too low, or tamp pressure is insufficient. Finer grind is usually the first fix.',
    tip: 'Go finer in small steps — one click at a time on most grinders. A coarser grind also reduces body and extraction, so you\'ll likely taste it in the cup too.'
  },
  {
    keywords: ['slow', 'choked', 'clog', 'blocked', 'no flow', 'drip', 'stuck'],
    question: 'Why is my shot choked or too slow?',
    answer: 'Choked shot = grind too fine, dose too high, or over-tamped. Water can\'t find a path through the puck. Fix: grind coarser, reduce dose slightly, or check that your tamp isn\'t excessive (20–30 lbs is enough).',
    tip: 'Go coarser in small steps. If the shot doesn\'t start within 10 seconds, stop — you\'re wasting the puck and burning the coffee.'
  },
  {
    keywords: ['rest', 'wait', 'fresh', 'roast date', 'degass', 'bloom', 'co2', 'too fresh', 'when brew'],
    question: 'When should I brew after the roast date?',
    answer: 'Beans release CO₂ after roasting. Brewing too early = CO₂ disrupts extraction (sour, grassy, uneven). Brewing too late = oxidation kills aromas.\n\nGeneral windows:\n• Light roast, espresso: 11–14 days post-roast\n• Medium roast, espresso: 8–12 days\n• Dark roast, espresso: 3–7 days\n• Light roast, V60: 8–14 days\n• Medium roast, V60: 6–11 days\n\nNatural and honey process beans need 3–7 extra days vs. washed.',
    tip: 'No roast date on the bag? That\'s a red flag. Specialty roasters always print it. "Best by" dates alone are not useful.'
  },
  {
    keywords: ['grind fresh', 'pre-ground', 'pre ground', 'already ground', 'grinding', 'stale'],
    question: 'How important is grinding fresh?',
    answer: 'Critically important. Research shows 84% of aromatic volatile compounds are lost within 60 minutes of grinding. Pre-ground coffee is essentially flavourless compared to fresh-ground — regardless of how good the beans are.',
    tip: 'If you only make one upgrade: buy a grinder. Even a basic burr grinder ($50–80) transforms cup quality more than any expensive machine upgrade.'
  },
  {
    keywords: ['ratio', 'dose', 'how much coffee', 'grams', 'weight', 'how much water', 'recipe'],
    question: 'What is the ideal brew ratio?',
    answer: 'Ratios by method:\n\n• Espresso: 1:2 to 1:2.5 (18g in → 36–45g out). Light roasts: up to 1:3. Dark roasts: 1:1.8–2.\n• V60: 1:15–1:17 (15g coffee → 225–255g water)\n• AeroPress: 1:12–1:15 (15g coffee → 180–225g water)\n\nThese are starting points — your grinder, water, and beans all affect the ideal ratio.',
  },
  {
    keywords: ['ethiopia', 'ethiopian', 'kenyan', 'kenya', 'east africa', 'rwanda', 'burundi', 'tanzania', 'african'],
    question: 'Which method for East African beans?',
    answer: 'East African coffees (Ethiopia, Kenya, Rwanda) are naturally high in acidity with bright, fruit-forward, floral notes. V60 is the ideal method — it highlights these qualities beautifully.\n\nFor espresso, the acidity becomes very intense under pressure. Use a higher yield ratio (1:2.5–3×) to tame the sharpness. Many specialty baristas avoid East African light roasts on espresso entirely.',
    tip: 'Ethiopian washed on V60 = textbook specialty coffee. Expect jasmine, bergamot, stone fruit, lemon. If brewing as espresso, ensure the beans are medium roast at minimum.'
  },
  {
    keywords: ['brazil', 'brazilian', 'south america', 'colombia', 'guatemala', 'central america'],
    question: 'Which method for Brazilian / South American beans?',
    answer: 'Brazilian beans are low-acid, body-forward, with chocolate, hazelnut, and caramel notes. They are the classic espresso base bean.\n\n• Espresso: excellent. Low acidity is a major advantage under pressure. Use lower ratios (1:1.8–2×) to emphasise sweetness and body.\n• AeroPress: also great — brings out body and chocolate.\n• V60: works but produces a mild, flat cup. The clarity of V60 doesn\'t benefit these beans much.',
  },
  {
    keywords: ['indonesia', 'sumatra', 'java', 'sulawesi', 'earthy', 'heavy body', 'full body'],
    question: 'Which method for Indonesian beans?',
    answer: 'Indonesian origins (Sumatra, Java, Sulawesi) are earthy, full-bodied, and low-acid. They produce intense, syrupy espresso — great for milk drinks.\n\n• Espresso: very well suited. Keep the ratio tight (1:1.8–2×) for a rich, thick shot.\n• AeroPress: also works well.\n• V60: avoid — the earthy heaviness turns muddy in filter brewing.',
    tip: 'Sumatran naturals are often wet-hulled (Giling Basah) — a unique process that gives an earthy, herbal, almost savory character. Not for everyone, but very distinctive.'
  },
  {
    keywords: ['natural', 'natural process', 'honey', 'honey process', 'washed', 'process'],
    question: 'What does natural or honey process mean?',
    answer: 'Processing = how the coffee fruit is removed from the bean after harvest.\n\n• Washed (wet): fruit is removed before drying. Clean, bright, high clarity. The terroir of the bean comes through.\n• Honey: fruit pulp partially removed, some mucilage left during drying. Sweeter, more body than washed, less than natural.\n• Natural (dry): entire fruit dried around the bean. Fruity, wine-like, fermented notes. Highest body. Needs more rest time before brewing.',
    tip: 'Natural process coffees taste more "processed" — the fruit imparts flavour to the bean. If you want to taste the origin clearly, washed is more transparent.'
  },
  {
    keywords: ['water temp', 'temperature', 'hot', 'degrees', 'celsius', 'boil', 'brew temp'],
    question: 'What temperature should the water be?',
    answer: 'General rule: 90–96°C (194–205°F).\n\n• Light roasts: 94–96°C — needs more heat to extract the denser, less soluble compounds\n• Medium roasts: 92–94°C\n• Dark roasts: 88–92°C — already very soluble; too hot = harsh and bitter\n\nBoiling water (100°C) is only acceptable for very light roasts in AeroPress.',
    tip: 'No thermometer? Boil and wait 30 seconds for espresso or 1 minute for filter. Good enough for most home setups.'
  },
  {
    keywords: ['watery', 'thin', 'flat', 'weak', 'bland', 'no body', 'tasteless'],
    question: 'Why is my coffee weak or watery?',
    answer: 'Weak coffee = under-dosed or over-diluted. Either you used too little coffee, too much water, or both.\n\nFixes:\n• Increase coffee dose (try +1–2g)\n• Reduce water slightly\n• Grind finer to extract more from the same dose\n• Check your ratio — are you in the right range for your method?'
  },
  {
    keywords: ['v60', 'pour over', 'filter', 'drip', 'how long', 'v60 time', 'brew time'],
    question: 'How long should a V60 take?',
    answer: 'Target total brew time: 2:30–3:30 (2 minutes 30 seconds to 3 minutes 30 seconds).\n\nTypical flow:\n1. Bloom: 40–50g water, wait 30–45s (lets CO₂ escape)\n2. Pour in slow circles until target weight reached\n3. Let drain completely\n\nIf faster than 2:30 → grind finer\nIf slower than 3:30 → grind coarser'
  },
  {
    keywords: ['aeropress', 'aero press', 'inverted', 'steep time', 'aeropress time'],
    question: 'How do I brew AeroPress?',
    answer: 'AeroPress is forgiving and versatile. Basic recipe:\n• 15g coffee, 200g water at 93°C\n• Steep 1:30–2:30 (light roast: shorter, dark: shorter)\n• Press slowly and steadily in ~30s\n\nRatio: 1:12–1:15. Medium roast naturals are the sweet spot — you get body AND clarity.',
    tip: 'Inverted method gives more control over steep time and prevents dripping through before ready. Try both and see what you prefer.'
  },
  {
    keywords: ['channeling', 'wet puck', 'uneven', 'distribution', 'tamp', 'espresso puck'],
    question: 'What is channeling in espresso?',
    answer: 'Channeling = water finds a weak path through the puck and rushes through it, bypassing most of the coffee. Result: under-extracted (sour, watery) despite normal shot time.\n\nSigns: wet puck after extraction, pale or streaky crema, sour taste with short time.\n\nFixes:\n• Even distribution before tamping (WDT tool or finger-level)\n• Consistent tamp pressure (level, not angled)\n• Ensure basket isn\'t overfilled',
    tip: 'A wet puck almost always indicates channeling. A dry, firm puck after extraction is the goal.'
  },
  {
    keywords: ['espresso method', 'what is espresso', 'espresso vs filter', 'why espresso'],
    question: 'When should I choose espresso over filter?',
    answer: 'Espresso forces hot water through fine-ground coffee under 9 bars of pressure. It produces a concentrated, syrupy shot with intense flavour.\n\nChoose espresso when:\n• You want intensity, body, and crema\n• You\'re making milk drinks (flat white, latte, cappuccino)\n• Your beans are medium-dark or dark roast\n\nChoose filter (V60/AeroPress) when:\n• You want clarity, nuance, and brightness\n• Your beans are light roast or from East Africa\n• You want to taste the origin, not just "coffee"'
  },
]

export const QUICK_QUESTIONS = [
  'Why is my coffee sour?',
  'Why is my shot too fast?',
  'When should I brew after the roast date?',
  'What is the ideal brew ratio?',
  'Which method for East African beans?',
  'How important is grinding fresh?',
]

export function ask(query: string): Answer | null {
  const q = query.toLowerCase()

  let best: { entry: Entry; score: number } | null = null
  for (const entry of KB) {
    const score = entry.keywords.filter(kw => q.includes(kw)).length
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score }
    }
  }

  if (!best) return null
  return { question: best.entry.question, answer: best.entry.answer, tip: best.entry.tip }
}
