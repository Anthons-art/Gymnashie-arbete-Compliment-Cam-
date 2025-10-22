// app/js/audio.js

let audioMap = {};
let audioReady = false;

// Ladda alla mp3-filer som refereras i compliments.json
export async function initAudio() {
  try {
    const res = await fetch('./compliments.json');
    const data = await res.json();

    // Gå igenom alla kategorier
    for (const [cat, compliments] of Object.entries(data)) {
      for (const item of compliments) {
        // Om objektet har både text och audio
        if (typeof item === 'object' && item.audio) {
          const key = item.text.toLowerCase().replace(/\s+/g, '_');
          const audio = new Audio(`./assets/sfx/${item.audio}`);
          audioMap[key] = audio;
        }
      }
    }

    audioReady = true;
    console.log(`✅ Loaded ${Object.keys(audioMap).length} audio clips`);
  } catch (e) {
    console.error('❌ Failed to load audio files:', e);
  }
}

// Spela upp ett ljud baserat på text (om det finns matchning)
export function playAudioByName(text) {
  if (!audioReady) {
    console.warn('Audio not ready yet');
    return;
  }

  const key = text.toLowerCase().replace(/\s+/g, '_');
  const sound = audioMap[key] || getRandomAudio();

  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Audio play failed', e));
  } else {
    console.warn(`No audio found for: ${key}`);
  }
}

// Om inget specifikt ljud finns, välj ett slumpat
function getRandomAudio() {
  const keys = Object.keys(audioMap);
  if (keys.length === 0) return null;
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return audioMap[randomKey];
}

