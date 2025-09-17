// app/js/tts.js
let chosenVoice = null;
let supportsTTS = ('speechSynthesis' in window);

export async function initTTS(preferredLang = 'sv-SE') {
  if (!supportsTTS) return false;
  return new Promise(resolve => {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      chosenVoice = voices.find(v => v.lang && v.lang.startsWith(preferredLang)) || voices[0] || null;
      resolve(!!chosenVoice);
    };
    window.speechSynthesis.onvoiceschanged = pick;
    pick();
  });
}

export function speak(text, opts = {}) {
  if (!supportsTTS || !chosenVoice) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = chosenVoice;
    u.rate = opts.rate || 1.0;
    u.pitch = opts.pitch || 1.05;
    u.volume = opts.volume || 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch (e) {
    console.warn('TTS speak failed', e);
    return false;
  }
}
