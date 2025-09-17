let poolByCat = {};
let poolDefault = [];
const lastN = [];
const MAX_HISTORY = 5;

export async function initCompliments() {
  try {
    const res = await fetch('./compliments.json');
    poolByCat = await res.json();
    // build default pool (all categories merged)
    poolDefault = Object.values(poolByCat).flat();
  } catch (e) {
    console.error('Failed to load compliments.json', e);
    poolDefault = ["Ha en fin dag!"];
  }
}

function pickNoRepeat(arr) {
  if (!arr || arr.length === 0) return "Ha en fin dag!";
  for (let i = 0; i < 12; i++) {
    const c = arr[Math.floor(Math.random() * arr.length)];
    if (!lastN.includes(c)) {
      lastN.push(c);
      if (lastN.length > MAX_HISTORY) lastN.shift();
      return c;
    }
  }
  // fallback
  const fallback = arr[Math.floor(Math.random() * arr.length)];
  lastN.push(fallback);
  if (lastN.length > MAX_HISTORY) lastN.shift();
  return fallback;
}

export function randomComplimentByTime() {
  const h = new Date().getHours();
  let cat = 'allman';
  if (h < 10) cat = 'morgon';
  else if (h >= 15 && h < 18) cat = 'fredag';
  // safe pick
  const bag = (poolByCat[cat] && poolByCat[cat].length) ? poolByCat[cat] : poolDefault;
  return pickNoRepeat(bag);
}

// exposed generic picker
export function randomCompliment() {
  return randomComplimentByTime();
}
