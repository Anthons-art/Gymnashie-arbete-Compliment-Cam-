let poolByCat = {};
let poolDefault = [];
const lastN = [];
const MAX_HISTORY = 5;

// =========================
// MODE SWITCHER
// =========================
let useAltCompliments = true;

export function setComplimentMode(alt = true) {
  useAltCompliments = alt;
}

// =========================
// INIT
// =========================
export async function initCompliments() {
  try {
    const file = useAltCompliments
      ? './compliments_christmas.json'
      : './compliments.json';

    const res = await fetch(file);
    poolByCat = await res.json();

    // Flatten all compliments
    poolDefault = Object.values(poolByCat).flat();

    // Rensa historik så pickNoRepeat inte blockar nya komplimanger
    lastN.length = 0;

  } catch (e) {
    console.error('Failed to load compliments JSON', e);
    poolDefault = [{ text: "Ha en fin dag!" }];
  }
}


// =========================
// RANDOM PICKER
// =========================
function pickNoRepeat(arr) {
  if (!arr || arr.length === 0) return { text: "Ha en fin dag!", audio: null };

  for (let i = 0; i < 12; i++) {
    const c = arr[Math.floor(Math.random() * arr.length)];
    const text = typeof c === 'string' ? c : c.text;

    if (!lastN.includes(text)) {
      lastN.push(text);
      if (lastN.length > MAX_HISTORY) lastN.shift();
      // Always return object with text + audio
      return typeof c === 'string' ? { text: c, audio: null } : { text: c.text, audio: c.audio || null };
    }
  }

  // Fallback
  const fallback = arr[Math.floor(Math.random() * arr.length)];
  const text = typeof fallback === 'string' ? fallback : fallback.text;
  lastN.push(text);
  if (lastN.length > MAX_HISTORY) lastN.shift();
  return typeof fallback === 'string' ? { text: fallback, audio: null } : { text: fallback.text, audio: fallback.audio || null };
}

// =========================
// CATEGORY HELPERS
// =========================
export function randomComplimentByTime() {
  const h = new Date().getHours();
  let cat = 'allman';
  if (h < 10) cat = 'morgon';
  else if (h >= 15 && h < 18) cat = 'fredag';

  const bag = poolByCat[cat]?.length ? poolByCat[cat] : poolDefault;
  return pickNoRepeat(bag);
}

export function randomCompliment(category = null) {
  if (category && poolByCat[category]?.length) {
    return pickNoRepeat(poolByCat[category]);
  }
  return randomComplimentByTime();
}

export function randomGroupCompliment() {
  const bag = poolByCat['grupp']?.length ? poolByCat['grupp'] : poolDefault;
  return pickNoRepeat(bag);
}
