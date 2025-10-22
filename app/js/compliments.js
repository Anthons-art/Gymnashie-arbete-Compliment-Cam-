let poolByCat = {};
let poolDefault = [];
const lastN = [];
const MAX_HISTORY = 5;

export async function initCompliments() {
  try {
    const res = await fetch('./compliments.json');
    poolByCat = await res.json();
    poolDefault = Object.values(poolByCat).flat();
  } catch (e) {
    console.error('Failed to load compliments.json', e);
    poolDefault = [{ text: "Ha en fin dag!" }];
  }
}

function pickNoRepeat(arr) {
  if (!arr || arr.length === 0) return { text: "Ha en fin dag!" };
  for (let i = 0; i < 12; i++) {
    const c = arr[Math.floor(Math.random() * arr.length)];
    const text = typeof c === 'string' ? c : c.text;
    if (!lastN.includes(text)) {
      lastN.push(text);
      if (lastN.length > MAX_HISTORY) lastN.shift();
      return typeof c === 'string' ? { text: c } : c;
    }
  }
const fallback = arr[Math.floor(Math.random() * arr.length)];
  const text = typeof fallback === 'string' ? fallback : fallback.text;
  lastN.push(text);
  if (lastN.length > MAX_HISTORY) lastN.shift();
  return typeof fallback === 'string' ? { text: fallback } : fallback;
}

export function randomComplimentByTime() {
  const h = new Date().getHours();
  let cat = 'allman';
  if (h < 10) cat = 'morgon';
  else if (h >= 15 && h < 18) cat = 'fredag';
  const bag = poolByCat[cat]?.length ? poolByCat[cat] : poolDefault;
  return pickNoRepeat(bag);
}

export function randomCompliment() {
  return randomComplimentByTime();
}

export function randomGroupCompliment() {
  const bag = poolByCat['grupp']?.length ? poolByCat['grupp'] : poolDefault;
  return pickNoRepeat(bag);
}

