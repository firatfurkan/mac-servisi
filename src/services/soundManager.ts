import { AppState, Platform } from 'react-native';

// expo-av native only — web'de ses çalma devre dışı
let Audio: any = null;
if (Platform.OS !== 'web') {
  try { Audio = require('expo-av').Audio; } catch {}
}

let goalSound: any = null;
let whistleSound: any = null;
let initialized = false;

export async function initSounds() {
  if (!Audio || initialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    [goalSound, whistleSound] = await Promise.all([
      Audio.Sound.createAsync(require('../../assets/sounds/gol.mp3')),
      Audio.Sound.createAsync(require('../../assets/sounds/duduk.wav')),
    ]);
    initialized = true;
  } catch {}
}

async function play(sound: { sound: any } | null) {
  if (!sound?.sound) return;
  // Sadece uygulama ön plandayken ses çal
  if (AppState.currentState !== 'active') return;
  try {
    await sound.sound.setPositionAsync(0);
    await sound.sound.playAsync();
  } catch {}
}

export const playGoalSound = () => play(goalSound);
export const playWhistleSound = () => play(whistleSound);

export function unloadSounds() {
  goalSound?.sound?.unloadAsync().catch(() => {});
  whistleSound?.sound?.unloadAsync().catch(() => {});
  goalSound = null;
  whistleSound = null;
  initialized = false;
}
