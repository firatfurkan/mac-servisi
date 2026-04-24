import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Player, PLAYERS } from '../../data/players';
import { auth, db } from '../../services/firebase';
import { useSettingsStore } from '../../stores/settingsStore';
import { AppTheme } from '../../theme/tokens';

// ── Ad constants ─────────────────────────────────────────────
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const AD_EVERY_N_GAMES = 5;
const BONUS_LIVES = 3;

// Interstitial
const PROD_INTERSTITIAL_IOS     = 'ca-app-pub-3272601063768123/4155815150';
const PROD_INTERSTITIAL_ANDROID = 'ca-app-pub-3272601063768123/6034826857';
const INTERSTITIAL_UNIT_ID =
  Platform.OS === 'android' ? PROD_INTERSTITIAL_ANDROID : PROD_INTERSTITIAL_IOS;

// Rewarded
const PROD_REWARDED_IOS         = 'ca-app-pub-3272601063768123/2455720675';
const PROD_REWARDED_ANDROID     = 'ca-app-pub-3272601063768123/6561427159';
const REWARDED_UNIT_ID =
  Platform.OS === 'android' ? PROD_REWARDED_ANDROID : PROD_REWARDED_IOS;

// Returns a stable anonymous UID, signing in if necessary
async function ensureAuth(): Promise<string | null> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.error('[LB] auth error:', err);
    return null;
  }
}

// ISO 8601 week number → "2024_W16"
function getWeekId(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday of current week
  const jan4 = new Date(d.getFullYear(), 0, 4);         // Jan 4 is always in W01
  const week = 1 + Math.round(
    ((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
  );
  return `${d.getFullYear()}_W${String(week).padStart(2, '0')}`;
}

const HIGH_SCORE_KEY = '@asist_valueQuizGame_highScore';
const PHOTO_BASE     = 'https://media.api-sports.io/football/players/';
const REVEAL_MS      = 1400;
const FADE_OUT_MS    = 240;
const FADE_IN_MS     = 340;
const TIMER_SECS     = 7;
const LB_COLLECTION  = 'leaderboard';

// Premium gold palette — replaces garish #FFBB33 warning
const GOLD        = '#D4AF37';
const GOLD_LIGHT  = '#F0CB35';
const SCORE_SHADOW = {
  textShadowColor:  'rgba(0,0,0,0.60)',
  textShadowOffset: { width: 0, height: 1 } as const,
  textShadowRadius: 5,
};

type Phase = 'guessing' | 'revealing' | 'correct' | 'wrong' | 'gameover';

interface Props { theme: AppTheme }
interface LeaderEntry { name: string; score: number; }

// ── helpers ──────────────────────────────────────────────────

const POSITION_TR: Record<string, string> = {
  GK: 'Kaleci', CB: 'Stoper', LB: 'Sol Bek', RB: 'Sağ Bek',
  DM: 'Def. Orta', CM: 'Orta Saha', AM: 'Of. Orta',
  LW: 'Sol Kanat', RW: 'Sağ Kanat', ST: 'Santrafor',
};

function positionTR(pos: string) { return POSITION_TR[pos] ?? pos; }

function timerColor(t: number): string {
  if (t >= 5) return '#0ECDB9';
  if (t >= 3) return '#FFA500';
  return '#FF3B5C';
}

function marginFor(score: number): number {
  if (score < 5)  return 0.35;
  if (score < 10) return 0.25;
  if (score < 20) return 0.18;
  return 0.12;
}

function balancedNext(anchor: Player, excludeIds: Set<number>, score: number): Player {
  const m = marginFor(score);
  const pool = PLAYERS.filter(p =>
    !excludeIds.has(p.id) && p.id !== anchor.id &&
    p.marketValue >= anchor.marketValue * (1 - m) &&
    p.marketValue <= anchor.marketValue * (1 + m) &&
    p.marketValue !== anchor.marketValue,
  );
  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  const wider = PLAYERS.filter(p =>
    !excludeIds.has(p.id) && p.id !== anchor.id && p.marketValue !== anchor.marketValue,
  );
  const src = wider.length > 0 ? wider : PLAYERS;
  return src[Math.floor(Math.random() * src.length)] ?? PLAYERS[0];
}

function balancedPair(score: number): { left: Player; right: Player } {
  for (let i = 0; i < 50; i++) {
    const left = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
    const m    = marginFor(score);
    const pool = PLAYERS.filter(p =>
      p.id !== left.id &&
      p.marketValue >= left.marketValue * (1 - m) &&
      p.marketValue <= left.marketValue * (1 + m) &&
      p.marketValue !== left.marketValue,
    );
    if (pool.length > 0)
      return { left, right: pool[Math.floor(Math.random() * pool.length)] };
  }
  return { left: PLAYERS[0], right: PLAYERS[1] };
}

function fmt(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}B €` : `${m} M €`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── main component ───────────────────────────────────────────
export default function ValueQuizGame({ theme }: Props) {
  const [pair, setPair]         = useState(() => balancedPair(0));
  const [phase, setPhase]       = useState<Phase>('guessing');
  const [score, setScore]       = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHS, setIsNewHS]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbLoading, setLbLoading]     = useState(false);
  const [showLbModal, setShowLbModal] = useState(false);

  const { profile, updateProfile } = useSettingsStore();

  const storedName = profile?.name?.trim() ?? '';
  const needsName  = !storedName || storedName === 'Anonim';

  const [playerName, setPlayerName]     = useState(needsName ? '' : storedName);
  const [showNameModal, setShowNameModal] = useState(needsName);

  const handleNameConfirm = useCallback((name: string) => {
    const trimmed = name.trim();
    updateProfile({ name: trimmed });
    setPlayerName(trimmed);
    setShowNameModal(false);
  }, [updateProfile]);

  const seenRef      = useRef(new Set<number>());
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef     = useRef(score);
  const highScoreRef = useRef(highScore);
  const phaseRef     = useRef(phase);

  // ── Interstitial ad ──────────────────────────────────────────
  const gamesPlayedRef   = useRef(0);
  const interstitialRef  = useRef<any>(null);
  const adLoadedRef      = useRef(false);

  const loadNextInterstitial = useCallback(async () => {
    if (IS_EXPO_GO || Platform.OS === 'web') return;
    try {
      const { InterstitialAd, AdEventType } = await import('react-native-google-mobile-ads');
      const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });
      ad.addAdEventListener(AdEventType.LOADED, () => { adLoadedRef.current = true; });
      ad.addAdEventListener(AdEventType.ERROR,  () => { adLoadedRef.current = false; });
      ad.load();
      interstitialRef.current = ad;
    } catch {
      // AdMob unavailable — silently skip
    }
  }, []);

  useEffect(() => { loadNextInterstitial(); }, [loadNextInterstitial]);

  // ── Rewarded ad ───────────────────────────────────────────────
  const [bonusLives, setBonusLives]   = useState(0);
  const bonusLivesRef                 = useRef(0);
  const hasContinuedRef               = useRef(false);
  const rewardedRef                   = useRef<any>(null);
  const rewardedLoadedRef             = useRef(false);

  const loadRewardedAd = useCallback(async () => {
    if (IS_EXPO_GO || Platform.OS === 'web') return;
    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');
      const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => { rewardedLoadedRef.current = true; });
      ad.addAdEventListener(AdEventType.ERROR, () => { rewardedLoadedRef.current = false; });
      ad.load();
      rewardedRef.current = ad;
    } catch {
      // AdMob unavailable — silently skip
    }
  }, []);

  useEffect(() => { loadRewardedAd(); }, [loadRewardedAd]);

  useEffect(() => { scoreRef.current = score; },          [score]);
  useEffect(() => { highScoreRef.current = highScore; },  [highScore]);
  useEffect(() => { phaseRef.current = phase; },          [phase]);

  useEffect(() => {
    seenRef.current = new Set([pair.left.id, pair.right.id]);
    AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then(v => { if (v) setHighScore(parseInt(v, 10) || 0); })
      .catch(() => {});
    return () => {
      if (timerRef.current)    clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line

  const saveHS = useCallback(async (v: number) => {
    try { await AsyncStorage.setItem(HIGH_SCORE_KEY, String(v)); } catch {}
  }, []);

  // ── leaderboard ──────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const weekId = getWeekId();
      const ref    = collection(db, LB_COLLECTION);
      const q      = query(ref, where('weekId', '==', weekId), orderBy('score', 'desc'), limit(10));
      const snap = await getDocs(q);
      const raw  = snap.docs.map(d => ({
        name:  d.data().name  as string,
        score: d.data().score as number,
      }));
      const deduped = new Map<string, number>();
      for (const r of raw) {
        const existing = deduped.get(r.name) ?? -1;
        if (r.score > existing) deduped.set(r.name, r.score);
      }
      const rows = Array.from(deduped.entries())
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      setLeaderboard(rows);
    } catch (err) {
      console.error('[LB] fetch error:', err);
    } finally {
      setLbLoading(false);
    }
  }, []);

  const saveAndFetchLeaderboard = useCallback(async (finalScore: number) => {
    try {
      const uid    = await ensureAuth();
      if (!uid) throw new Error('no auth uid');

      const weekId   = getWeekId();
      const docId    = `${uid}_${weekId}`;          // e.g. "abc123_2024_W16"
      const ref      = doc(db, LB_COLLECTION, docId);
      const existing = await getDoc(ref);
      const newScore = Math.round(finalScore);

      if (!existing.exists()) {
        await setDoc(ref, { uid, name: playerName, score: newScore, weekId, ts: serverTimestamp() });
        console.log('[LB] created entry, week:', weekId, 'score:', newScore);
      } else if ((existing.data().score as number) < newScore) {
        await setDoc(ref, { uid, name: playerName, score: newScore, weekId, ts: serverTimestamp() });
        console.log('[LB] updated record:', existing.data().score, '→', newScore);
      } else {
        console.log('[LB] no update — existing score', existing.data().score, '≥', newScore);
      }
    } catch (err) {
      console.error('[LB] save error:', err);
    }
    await fetchLeaderboard();
  }, [playerName, fetchLeaderboard]);

  const openLbModal = useCallback(() => {
    setShowLbModal(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ── animation values ─────────────────────────────────────
  const revealL       = useSharedValue(0);
  const revealR       = useSharedValue(0);
  const glowL         = useSharedValue(0);
  const glowR         = useSharedValue(0);
  const shakeL        = useSharedValue(0);
  const shakeR        = useSharedValue(0);
  const flashL        = useSharedValue(0);
  const flashR        = useSharedValue(0);
  const opacityL      = useSharedValue(1);
  const opacityR      = useSharedValue(1);
  const scaleL        = useSharedValue(1);
  const scaleR        = useSharedValue(1);
  const redFlash      = useSharedValue(0);
  const scorePop      = useSharedValue(1);
  const timerProgress = useSharedValue(1);

  const resetAnim = useCallback(() => {
    revealL.value = 0; revealR.value = 0;
    glowL.value   = 0; glowR.value   = 0;
    flashL.value  = 0; flashR.value  = 0;
    redFlash.value = 0;
  }, []);

  const stopGlows = useCallback(() => {
    cancelAnimation(glowL); cancelAnimation(glowR);
    glowL.value = withTiming(0, { duration: 200 });
    glowR.value = withTiming(0, { duration: 200 });
  }, []);

  // ── timer ────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    cancelAnimation(timerProgress);
  }, []);

  useEffect(() => {
    if (phase !== 'guessing') { stopTimer(); return; }
    setTimeLeft(TIMER_SECS);
    timerProgress.value = 1;
    timerProgress.value = withTiming(0, { duration: TIMER_SECS * 1000, easing: Easing.linear });
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return stopTimer;
  }, [phase]); // eslint-disable-line

  useEffect(() => {
    if (timeLeft === 0 && phaseRef.current === 'guessing') handleTimeout();
  }, [timeLeft]); // eslint-disable-line

  // ── wrong-answer core ────────────────────────────────────
  const triggerWrong = useCallback((shakeSide?: 'left' | 'right') => {
    stopTimer();
    if (shakeSide) {
      const sv = shakeSide === 'left' ? shakeL : shakeR;
      sv.value = withSequence(
        withTiming(-15, { duration: 52 }), withTiming(15,  { duration: 52 }),
        withTiming(-9,  { duration: 52 }), withTiming(9,   { duration: 52 }),
        withTiming(-4,  { duration: 52 }), withTiming(0,   { duration: 52 }),
      );
    }
    redFlash.value = withSequence(
      withTiming(0.5, { duration: 130 }),
      withTiming(0,   { duration: 700 }),
    );
    const s = scoreRef.current;

    if (bonusLivesRef.current > 0) {
      // Bonus can modunda: canı azalt, yeni çift al, devam et
      bonusLivesRef.current -= 1;
      setBonusLives(bonusLivesRef.current);
      setPhase('wrong');
      timerRef.current = setTimeout(() => {
        resetAnim();
        opacityL.value = 1; opacityR.value = 1;
        scaleL.value   = 1; scaleR.value   = 1;
        const next = balancedPair(s);
        seenRef.current = new Set([next.left.id, next.right.id]);
        setPair(next);
        setTimeLeft(TIMER_SECS);
        setPhase('guessing');
      }, 880);
      return;
    }

    if (s > highScoreRef.current) {
      setHighScore(s); setIsNewHS(true); saveHS(s);
    } else {
      setIsNewHS(false);
    }
    setPhase('wrong');
    saveAndFetchLeaderboard(s);
    timerRef.current = setTimeout(() => setPhase('gameover'), 880);
  }, [stopTimer, shakeL, shakeR, redFlash, saveHS, saveAndFetchLeaderboard, resetAnim]);

  function handleTimeout() {
    if (phaseRef.current !== 'guessing') return;
    triggerWrong();
  }

  // ── game logic ────────────────────────────────────────────
  const onPick = useCallback(
    (side: 'left' | 'right') => {
      if (phase !== 'guessing') return;
      stopTimer();
      const chosen  = side === 'left' ? pair.left : pair.right;
      const other   = side === 'left' ? pair.right : pair.left;
      const correct = chosen.marketValue >= other.marketValue;
      setPhase('revealing');

      const spring = { damping: 9, stiffness: 110 };
      revealL.value = withSpring(1, spring);
      revealR.value = withSpring(1, spring);
      const pulse = withRepeat(withSequence(
        withTiming(1,   { duration: 430, easing: Easing.out(Easing.quad) }),
        withTiming(0.3, { duration: 430 }),
      ), -1, true);
      glowL.value = pulse;
      glowR.value = withRepeat(withSequence(
        withTiming(1,   { duration: 430, easing: Easing.out(Easing.quad) }),
        withTiming(0.3, { duration: 430 }),
      ), -1, true);

      timerRef.current = setTimeout(() => {
        stopGlows();
        if (correct) {
          const flash = side === 'left' ? flashL : flashR;
          flash.value = withSequence(
            withTiming(0.65, { duration: 170 }),
            withTiming(0,    { duration: 700 }),
          );
          scorePop.value = withSequence(
            withTiming(1.42, { duration: 150 }),
            withSpring(1, { damping: 7, stiffness: 220 }),
          );
          setPhase('correct');
          setScore(prev => prev + 1);

          const loser = side === 'left' ? 'right' : 'left';
          const lOp = loser === 'left' ? opacityL : opacityR;
          const lSc = loser === 'left' ? scaleL   : scaleR;
          lOp.value = withTiming(0,   { duration: FADE_OUT_MS });
          lSc.value = withTiming(0.8, { duration: FADE_OUT_MS });

          timerRef.current = setTimeout(() => {
            const seen = seenRef.current;
            seen.add(chosen.id);
            const next = balancedNext(chosen, seen, scoreRef.current);
            seen.add(next.id);
            if (seen.size >= PLAYERS.length - 2)
              seenRef.current = new Set([chosen.id, next.id]);
            const newPair = side === 'left'
              ? { left: chosen, right: next }
              : { left: next, right: chosen };
            setPair(newPair);
            resetAnim();
            setPhase('guessing');
            lOp.value = 0; lSc.value = 0.82;
            lOp.value = withTiming(1, { duration: FADE_IN_MS });
            lSc.value = withSpring(1, { damping: 10, stiffness: 140 });
          }, FADE_OUT_MS + 60);
        } else {
          triggerWrong(side);
        }
      }, REVEAL_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, pair, stopGlows, resetAnim, stopTimer, triggerWrong],
  );

  const doRestart = useCallback(() => {
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    resetAnim();
    opacityL.value = 1; opacityR.value = 1;
    scaleL.value   = 1; scaleR.value   = 1;
    shakeL.value   = 0; shakeR.value   = 0;
    timerProgress.value = 1;
    bonusLivesRef.current = 0;
    setBonusLives(0);
    hasContinuedRef.current = false;
    const next = balancedPair(0);
    seenRef.current = new Set([next.left.id, next.right.id]);
    setPair(next);
    setScore(0);
    setTimeLeft(TIMER_SECS);
    setIsNewHS(false);
    setLeaderboard([]);
    setPhase('guessing');
    loadNextInterstitial();
    loadRewardedAd();
  }, [resetAnim, loadNextInterstitial, loadRewardedAd]);

  const onContinue = useCallback(async () => {
    if (hasContinuedRef.current) return;
    if (!rewardedRef.current || !rewardedLoadedRef.current) return;
    hasContinuedRef.current = true;
    rewardedLoadedRef.current = false;

    try {
      const { RewardedAdEventType } = await import('react-native-google-mobile-ads');
      const ad = rewardedRef.current;
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        bonusLivesRef.current = BONUS_LIVES;
        setBonusLives(BONUS_LIVES);
        resetAnim();
        opacityL.value = 1; opacityR.value = 1;
        scaleL.value   = 1; scaleR.value   = 1;
        timerProgress.value = 1;
        const next = balancedPair(scoreRef.current);
        seenRef.current = new Set([next.left.id, next.right.id]);
        setPair(next);
        setTimeLeft(TIMER_SECS);
        setPhase('guessing');
        loadRewardedAd();
      });
      ad.show();
    } catch {
      hasContinuedRef.current = false;
    }
  }, [resetAnim, loadRewardedAd]);

  const onRestart = useCallback(async () => {
    gamesPlayedRef.current += 1;
    const shouldShowAd =
      gamesPlayedRef.current % AD_EVERY_N_GAMES === 0 &&
      !IS_EXPO_GO &&
      Platform.OS !== 'web' &&
      interstitialRef.current &&
      adLoadedRef.current;

    if (shouldShowAd) {
      try {
        const { AdEventType } = await import('react-native-google-mobile-ads');
        const ad = interstitialRef.current;
        const unsubClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
          unsubClose();
          adLoadedRef.current = false;
          interstitialRef.current = null;
          doRestart();
        });
        const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
          unsubError();
          adLoadedRef.current = false;
          doRestart();
        });
        ad.show();
        return;
      } catch {
        // Fall through to immediate restart
      }
    }
    doRestart();
  }, [doRestart]);

  // ── animated styles ──────────────────────────────────────
  const leftCardStyle  = useAnimatedStyle(() => ({
    opacity: opacityL.value,
    transform: [{ translateX: shakeL.value }, { scale: scaleL.value }],
  }));
  const rightCardStyle = useAnimatedStyle(() => ({
    opacity: opacityR.value,
    transform: [{ translateX: shakeR.value }, { scale: scaleR.value }],
  }));
  const leftValStyle  = useAnimatedStyle(() => ({
    opacity: revealL.value,
    transform: [{ scale: 0.55 + 0.45 * revealL.value }],
    textShadowRadius: 6 + 22 * glowL.value,
  }));
  const rightValStyle = useAnimatedStyle(() => ({
    opacity: revealR.value,
    transform: [{ scale: 0.55 + 0.45 * revealR.value }],
    textShadowRadius: 6 + 22 * glowR.value,
  }));
  const flashLStyle   = useAnimatedStyle(() => ({ opacity: flashL.value }));
  const flashRStyle   = useAnimatedStyle(() => ({ opacity: flashR.value }));
  const redStyle      = useAnimatedStyle(() => ({ opacity: redFlash.value }));
  const scorePopStyle = useAnimatedStyle(() => ({ transform: [{ scale: scorePop.value }] }));
  const timerBarStyle = useAnimatedStyle(() => ({ width: `${timerProgress.value * 100}%` as any }));

  const isGuessing = phase === 'guessing';
  const revealed   = phase !== 'guessing';
  const tColor     = timerColor(timeLeft);

  return (
    <View style={styles.root}>

      {/* header */}
      <View style={styles.header}>
        <ScoreBox label="SKOR" value={score} color={theme.colors.primary} animStyle={scorePopStyle} theme={theme} />
        <View style={styles.titleBox}>
          <Text style={[styles.titleTop, { color: theme.colors.textPrimary }]}>KİMİN DEĞERİ</Text>
          <Text style={[styles.titleBig, { color: theme.colors.primary }]}>DAHA YÜKSEK?</Text>
          {bonusLives > 0 ? (
            <View style={styles.livesRow}>
              {Array.from({ length: BONUS_LIVES }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="heart"
                  size={14}
                  color={i < bonusLives ? '#EF4444' : theme.colors.divider}
                />
              ))}
            </View>
          ) : (
            <View style={styles.timerRow}>
              <View style={[styles.timerTrack, { borderColor: tColor + '40' }]}>
                <Animated.View style={[styles.timerFill, { backgroundColor: tColor }, timerBarStyle]} />
              </View>
              <Text style={[styles.timerNum, { color: tColor }]}>{isGuessing ? timeLeft : ''}</Text>
            </View>
          )}
        </View>
        <ScoreBox label="REKOR" value={highScore} color={GOLD} theme={theme} />
      </View>

      {/* cards */}
      <View style={styles.arena}>
        <Animated.View style={[styles.cardWrap, leftCardStyle]}>
          <PlayerCard player={pair.left} theme={theme} onPress={() => onPick('left')}
            disabled={!isGuessing} valueStyle={leftValStyle} flashStyle={flashLStyle} revealed={revealed} />
        </Animated.View>
        <View style={styles.vsBadge} pointerEvents="none">
          <View style={[styles.vsCircle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <Text style={[styles.vsText, { color: theme.colors.primary }]}>VS</Text>
          </View>
        </View>
        <Animated.View style={[styles.cardWrap, rightCardStyle]}>
          <PlayerCard player={pair.right} theme={theme} onPress={() => onPick('right')}
            disabled={!isGuessing} valueStyle={rightValStyle} flashStyle={flashRStyle} revealed={revealed} />
        </Animated.View>
      </View>

      {/* footer */}
      <View style={styles.footer}>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          {isGuessing             ? 'Kartlardan birine dokun ve tahmin et'
           : phase === 'revealing' ? 'Değerler açığa çıkıyor...'
           : phase === 'correct'  ? '🔥 Doğru tahmin!'
           : phase === 'wrong'    ? '⏱ Süre doldu veya yanlış tahmin!'
           : ''}
        </Text>
        <TouchableOpacity
          onPress={openLbModal}
          activeOpacity={0.78}
          style={[styles.lbOpenBtn, { borderColor: GOLD + '70' }]}
        >
          <Ionicons name="trophy" size={13} color={GOLD} />
          <Text style={[styles.lbOpenText, { color: GOLD }]}>EN İYİLER</Text>
        </TouchableOpacity>
      </View>

      {/* overlays */}
      <Animated.View pointerEvents="none" style={[styles.redOverlay, redStyle]} />

      {phase === 'gameover' && (
        <GameOver
          theme={theme}
          score={score}
          highScore={highScore}
          isNewHS={isNewHS}
          leaderboard={leaderboard}
          lbLoading={lbLoading}
          playerName={playerName}
          onRestart={onRestart}
          onContinue={onContinue}
          continueAvailable={!hasContinuedRef.current && rewardedLoadedRef.current}
        />
      )}

      {showLbModal && (
        <LeaderboardModal
          theme={theme}
          leaderboard={leaderboard}
          lbLoading={lbLoading}
          highScore={highScore}
          playerName={playerName}
          onClose={() => setShowLbModal(false)}
        />
      )}

      {showNameModal && (
        <NameEntryModal theme={theme} onConfirm={handleNameConfirm} />
      )}
    </View>
  );
}

// ── ScoreBox ─────────────────────────────────────────────────
function ScoreBox({ label, value, color, animStyle, theme }: {
  label: string; value: number; color: string; animStyle?: any; theme: AppTheme;
}) {
  const num = (
    <Text style={[styles.scoreNum, { color, ...SCORE_SHADOW }]}>
      {value}
    </Text>
  );
  return (
    <View style={styles.scoreBox}>
      <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      {animStyle ? <Animated.View style={animStyle}>{num}</Animated.View> : num}
    </View>
  );
}

// ── PlayerCard ───────────────────────────────────────────────
function PlayerCard({ player, theme, onPress, disabled, valueStyle, flashStyle, revealed }: {
  player: Player; theme: AppTheme; onPress: () => void;
  disabled: boolean; valueStyle: any; flashStyle: any; revealed: boolean;
}) {
  const [photoError, setPhotoError] = useState(false);
  const [primary, secondary] = player.colors;
  useEffect(() => { setPhotoError(false); }, [player.id]);
  const showPhoto = player.photoId > 0 && !photoError;
  const cardBg    = theme.dark ? '#0d1c1a' : '#ffffff';

  return (
    <TouchableOpacity activeOpacity={0.87} onPress={onPress} disabled={disabled}
      style={[styles.card, {
        backgroundColor: cardBg,
        borderColor:  theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
        shadowColor:  primary,
      }]}
    >
      <View style={[styles.photoSection, { backgroundColor: primary + '22' }]}>
        {showPhoto ? (
          <Image key={`photo-${player.id}`} source={{ uri: `${PHOTO_BASE}${player.photoId}.png` }}
            style={styles.photo} resizeMode="cover" fadeDuration={200} onError={() => setPhotoError(true)} />
        ) : (
          <FallbackAvatar name={player.name} primary={primary} secondary={secondary} />
        )}
        <View style={[styles.gradA, { backgroundColor: cardBg }]} />
        <View style={[styles.gradB, { backgroundColor: cardBg }]} />
        <View style={[styles.gradC, { backgroundColor: cardBg }]} />
        <View style={[styles.posBadge, { backgroundColor: primary }]}>
          <Text style={styles.posText}>{positionTR(player.position)}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text numberOfLines={2} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.78}
          style={[styles.name, { color: theme.colors.textPrimary }]}>
          {player.name}
        </Text>
        <View style={styles.teamRow}>
          <View style={[styles.teamDot, { backgroundColor: secondary || primary }]} />
          <Text numberOfLines={1} style={[styles.teamName, { color: theme.colors.textPrimary }]}>
            {player.team}
          </Text>
        </View>
        <Text style={[styles.ageMevki, { color: primary }]}>
          {player.age} Yaş | {positionTR(player.position)}
        </Text>
        <Text numberOfLines={1} style={[styles.league, { color: theme.colors.textPrimary }]}>
          {player.league}
        </Text>
        <View style={styles.valueArea}>
          {revealed ? (
            <Animated.Text style={[
              styles.valueText,
              { color: primary, textShadowColor: primary, textShadowOffset: { width: 0, height: 0 } },
              valueStyle,
            ]}>
              {fmt(player.marketValue)}
            </Animated.Text>
          ) : (
            <View style={[styles.hiddenBox, { borderColor: primary + '50' }]}>
              <Ionicons name="help-circle" size={20} color={primary} />
              <Text style={[styles.hiddenText, { color: primary }]}>DOKUN</Text>
            </View>
          )}
        </View>
      </View>
      <Animated.View pointerEvents="none" style={[styles.greenFlash, flashStyle]} />
    </TouchableOpacity>
  );
}

// ── FallbackAvatar ───────────────────────────────────────────
function FallbackAvatar({ name, primary, secondary }: { name: string; primary: string; secondary: string }) {
  return (
    <View style={[styles.fallback, { backgroundColor: primary + '18' }]}>
      <View style={[styles.fallbackGlow, { backgroundColor: primary + '28', borderColor: primary + '35' }]}>
        <Text style={[styles.fallbackInitials, { color: primary }]}>{initials(name)}</Text>
      </View>
      <View style={[styles.fallbackStrip, { backgroundColor: primary + '35' }]} />
    </View>
  );
}

// ── LeaderboardList (shared between modal and game-over) ─────
function LeaderboardList({ leaderboard, lbLoading, highScore, playerName, theme }: {
  leaderboard: LeaderEntry[]; lbLoading: boolean;
  highScore: number; playerName: string; theme: AppTheme;
}) {
  const isDark = theme.dark;
  const zebraOdd  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const zebraEven = 'transparent';

  return (
    <>
      {/* user's own record */}
      <View style={[styles.myRow, {
        backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.10)',
        borderColor: GOLD + '70',
      }]}>
        <Ionicons name="person-circle-outline" size={16} color={GOLD} />
        <Text style={[styles.myLabel, { color: theme.colors.textPrimary, fontFamily: 'Rajdhani_600SemiBold' }]}>{playerName}</Text>
        <Text style={[styles.myScore, { color: GOLD, ...SCORE_SHADOW }]}>{highScore}</Text>
        <Text style={[styles.myBest, { color: GOLD + 'cc' }]}>KİŞİSEL REKOR</Text>
      </View>

      {/* divider */}
      <View style={[styles.lbDivider, { backgroundColor: theme.colors.primary + '30' }]} />

      {/* top 10 */}
      {lbLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 14 }} />
      ) : leaderboard.length === 0 ? (
        <Text style={[styles.lbEmpty, { color: theme.colors.textSecondary }]}>
          Henüz skor kaydı yok
        </Text>
      ) : (
        <ScrollView style={styles.lbScroll} showsVerticalScrollIndicator={false} horizontal={false} scrollEventThrottle={16}>
          {leaderboard.map((entry, i) => {
            const medal     = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            const rankColor = i === 0 ? GOLD_LIGHT : i === 1 ? '#D8D8D8' : i === 2 ? '#E8A870' : theme.colors.textSecondary;
            const isMe      = entry.name === playerName;
            const podiumBg  = i === 0
              ? (isDark ? 'rgba(212,175,55,0.14)' : 'rgba(212,175,55,0.11)')
              : i === 1
              ? (isDark ? 'rgba(200,200,200,0.09)' : 'rgba(180,180,180,0.08)')
              : i === 2
              ? (isDark ? 'rgba(205,127,50,0.09)' : 'rgba(180,110,50,0.07)')
              : i % 2 === 0 ? zebraOdd : zebraEven;
            return (
              <View key={i} style={[
                styles.lbRow,
                { backgroundColor: podiumBg },
                isMe && { borderLeftWidth: 2, borderLeftColor: theme.colors.primary },
              ]}>
                <Text style={[
                  styles.lbRank,
                  { color: rankColor, fontFamily: i < 3 ? 'Rajdhani_700Bold' : 'Rajdhani_500Medium', fontSize: i < 3 ? 15 : 13 },
                ]}>
                  {medal ?? `#${i + 1}`}
                </Text>
                <Text numberOfLines={1} style={[
                  styles.lbName,
                  { color: isMe ? theme.colors.primary : (i < 3 ? theme.colors.textPrimary : theme.colors.textPrimary), fontFamily: i < 3 ? 'Rajdhani_700Bold' : 'Rajdhani_600SemiBold' },
                  isMe && { fontFamily: 'Rajdhani_700Bold', color: theme.colors.primary },
                ]}>
                  {entry.name}
                </Text>
                <Text style={[
                  styles.lbScore,
                  {
                    color: i < 3 ? rankColor : theme.colors.primary,
                    fontSize: i < 3 ? 18 : 15,
                    ...(i < 3 ? SCORE_SHADOW : {}),
                  },
                ]}>
                  {entry.score}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </>
  );
}

// ── LeaderboardModal ─────────────────────────────────────────
function LeaderboardModal({ theme, leaderboard, lbLoading, highScore, playerName, onClose }: {
  theme: AppTheme; leaderboard: LeaderEntry[]; lbLoading: boolean;
  highScore: number; playerName: string; onClose: () => void;
}) {
  const scale   = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220 });
    scale.value   = withSpring(1, { damping: 14, stiffness: 160 });
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.goBackdrop}>
      <Animated.View style={[
        styles.goCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '70', shadowColor: theme.colors.primary },
        animStyle,
      ]}>
        {/* header row */}
        <View style={styles.lbModalHeader}>
          <Ionicons name="trophy" size={18} color={GOLD} />
          <Text style={[styles.lbModalTitle, { color: theme.colors.textPrimary }]}>GLOBAL TOP 10</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.lbDivider, { backgroundColor: theme.colors.primary + '30', marginBottom: 4 }]} />

        <LeaderboardList
          leaderboard={leaderboard}
          lbLoading={lbLoading}
          highScore={highScore}
          playerName={playerName}
          theme={theme}
        />
      </Animated.View>
    </View>
  );
}

// ── NameEntryModal ───────────────────────────────────────────
function NameEntryModal({ theme, onConfirm }: { theme: AppTheme; onConfirm: (name: string) => void }) {
  const [name, setName] = useState('');
  const scale   = useSharedValue(0.88);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 240 });
    scale.value   = withSpring(1, { damping: 13, stiffness: 150 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const trimmed  = name.trim();
  const canStart = trimmed.length >= 2;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.goBackdrop}
    >
      <Animated.View style={[
        styles.goCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, shadowColor: theme.colors.primary },
        animStyle,
      ]}>
        {/* Logo / başlık */}
        <View style={styles.nmHeader}>
          <View style={[styles.nmIconCircle, { borderColor: theme.colors.primary + '60', backgroundColor: theme.colors.primary + '18' }]}>
            <Ionicons name="person" size={28} color={theme.colors.primary} />
          </View>
          <Text style={[styles.nmTitle, { color: theme.colors.primary }]}>ARENA'YA HOŞ GELDİN</Text>
          <Text style={[styles.nmSub, { color: theme.colors.textSecondary }]}>
            Liderlik tablosunda görünecek isminizi girin
          </Text>
        </View>

        <View style={[styles.nmDivider, { backgroundColor: theme.colors.primary + '25' }]} />

        {/* Input */}
        <View style={[
          styles.nmInputWrap,
          { borderColor: canStart ? theme.colors.primary : theme.colors.primary + '40', backgroundColor: theme.dark ? 'rgba(14,205,185,0.06)' : 'rgba(0,137,123,0.06)' },
        ]}>
          <Ionicons name="person-outline" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.nmInput, { color: theme.colors.textPrimary }]}
            placeholder="Kullanıcı adınız..."
            placeholderTextColor={theme.colors.textSecondary + '88'}
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => canStart && onConfirm(trimmed)}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {trimmed.length > 0 && (
            <Text style={[styles.nmCounter, { color: theme.colors.textSecondary }]}>{trimmed.length}/20</Text>
          )}
        </View>

        {!canStart && trimmed.length > 0 && (
          <Text style={[styles.nmHint, { color: GOLD }]}>En az 2 karakter giriniz</Text>
        )}

        {/* Başla butonu */}
        <TouchableOpacity
          activeOpacity={canStart ? 0.82 : 1}
          onPress={() => canStart && onConfirm(trimmed)}
          style={[
            styles.nmBtn,
            canStart
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.primary + '35', borderWidth: 1, borderColor: theme.colors.primary + '40' },
          ]}
        >
          <Ionicons name="game-controller" size={16} color={canStart ? '#fff' : theme.colors.primary + '70'} />
          <Text style={[styles.nmBtnText, { color: canStart ? '#fff' : theme.colors.primary + '70' }]}>
            OYUNA BAŞLA
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ── GameOver ─────────────────────────────────────────────────
function GameOver({ theme, score, highScore, isNewHS, leaderboard, lbLoading, playerName, onRestart, onContinue, continueAvailable }: {
  theme: AppTheme; score: number; highScore: number; isNewHS: boolean;
  leaderboard: LeaderEntry[]; lbLoading: boolean; playerName: string;
  onRestart: () => void; onContinue: () => void; continueAvailable: boolean;
}) {
  const scale   = useSharedValue(0.78);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    scale.value   = withSpring(1, { damping: 11, stiffness: 140 });
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.goBackdrop}>
      <Animated.View style={[
        styles.goCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, shadowColor: theme.colors.primary },
        animStyle,
      ]}>
        <Text style={[styles.goTitle, { color: theme.colors.accent }]}>OYUN BİTTİ</Text>

        {isNewHS && (
          <View style={[styles.recordBadge, { backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.55, shadowRadius: 10, elevation: 6 }]}>
            <Ionicons name="trophy" size={13} color="#1a1200" />
            <Text style={styles.recordText}>YENİ REKOR!</Text>
          </View>
        )}

        <View style={styles.goRow}>
          <View style={styles.goBlock}>
            <Text style={[styles.goLabel, { color: theme.colors.textSecondary }]}>SKORUN</Text>
            <Text style={[styles.goBig, { color: theme.colors.primary, ...SCORE_SHADOW }]}>{score}</Text>
          </View>
          <View style={[styles.goSep, { backgroundColor: theme.colors.divider }]} />
          <View style={styles.goBlock}>
            <Text style={[styles.goLabel, { color: theme.colors.textSecondary }]}>REKOR</Text>
            <Text style={[styles.goBig, { color: GOLD, ...SCORE_SHADOW }]}>{highScore}</Text>
          </View>
        </View>

        {/* leaderboard panel */}
        <View style={[styles.lbContainer, { borderColor: theme.colors.primary + '35' }]}>
          <View style={styles.lbInnerHeader}>
            <Ionicons name="trophy" size={13} color={GOLD} />
            <Text style={[styles.lbTitle, { color: theme.colors.textPrimary }]}>GLOBAL TOP 10</Text>
          </View>
          <LeaderboardList
            leaderboard={leaderboard}
            lbLoading={lbLoading}
            highScore={highScore}
            playerName={playerName}
            theme={theme}
          />
        </View>

        {continueAvailable && (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onContinue}
            style={styles.continueBtn}
          >
            <Ionicons name="heart" size={15} color="#FF6B9D" />
            <Text style={styles.continueBtnText}>REKORUNU KORU: +{BONUS_LIVES} CAN KAZAN</Text>
            <Ionicons name="play-circle" size={17} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={onRestart}
          style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>TEKRAR DENE</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── styles ───────────────────────────────────────────────────
const W      = Dimensions.get('window').width;
const CARD_W = Math.min(Math.floor((W - 44) / 2), 192);
const CARD_H = Math.min(Math.floor(CARD_W * 1.92), 346);
const PHOTO_H = Math.floor(CARD_H * 0.50);

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 10, paddingTop: 8 },

  // header
  header:     { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 },
  scoreBox:   { width: 60, alignItems: 'center' },
  scoreLabel: { fontSize: 10, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2 },
  scoreNum:   { fontSize: 32, fontFamily: 'Rajdhani_700Bold', marginTop: -2 },
  titleBox:   { flex: 1, alignItems: 'center' },
  titleTop:   { fontSize: 11, fontFamily: 'Rajdhani_500Medium', letterSpacing: 2.5 },
  titleBig:   { fontSize: 16, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2.5, marginTop: -2 },

  // timer
  timerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  timerTrack: { flex: 1, height: 4, borderRadius: 2, borderWidth: 1, overflow: 'hidden', backgroundColor: 'transparent' },
  timerFill:  { height: '100%', borderRadius: 2 },
  timerNum:   { fontSize: 15, fontFamily: 'Rajdhani_700Bold', width: 18, textAlign: 'right', lineHeight: 18 },

  // arena
  arena:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardWrap: { width: CARD_W, height: CARD_H },

  // card
  card: {
    width: '100%', height: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 12,
  },

  // photo
  photoSection: { width: '100%', height: PHOTO_H, overflow: 'hidden' },
  photo:        { width: '100%', height: '100%' },

  // fallback
  fallback:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackGlow:     { width: PHOTO_H * 0.58, height: PHOTO_H * 0.58, borderRadius: PHOTO_H * 0.29, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  fallbackInitials: { fontSize: PHOTO_H * 0.22, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1 },
  fallbackStrip:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 10 },

  // gradients
  gradA: { position: 'absolute', bottom: 0, left: 0, right: 0, height: PHOTO_H * 0.44, opacity: 0.90 },
  gradB: { position: 'absolute', bottom: 0, left: 0, right: 0, height: PHOTO_H * 0.26, opacity: 1 },
  gradC: { position: 'absolute', bottom: 0, left: 0, right: 0, height: PHOTO_H * 0.13, opacity: 1 },

  // position badge
  posBadge: { position: 'absolute', top: 7, left: 7, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  posText:  { color: '#fff', fontSize: 8.5, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1 },

  // info
  info:     { flex: 1, paddingHorizontal: 10, paddingTop: 5, paddingBottom: 8 },
  name:     { fontSize: 15, fontFamily: 'Rajdhani_700Bold', lineHeight: 18 },
  teamRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  teamDot:  { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  teamName: { fontSize: 11, fontFamily: 'Rajdhani_700Bold', flex: 1 },
  ageMevki: { fontSize: 11, fontFamily: 'Rajdhani_700Bold', marginTop: 3 },
  league:   { fontSize: 10, fontFamily: 'Rajdhani_600SemiBold', letterSpacing: 0.6, opacity: 0.85, marginTop: 2 },

  valueArea:  { marginTop: 'auto', alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  valueText:  { fontSize: 23, fontFamily: 'Rajdhani_700Bold', letterSpacing: 0.5 },
  hiddenBox:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  hiddenText: { fontSize: 11, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2 },

  // overlays
  greenFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#16C784', borderRadius: 20 },
  redOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FF3B5C' },

  // VS badge
  vsBadge:  { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  vsCircle: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42, shadowRadius: 8, elevation: 10,
  },
  vsText: { fontSize: 13, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1 },

  // footer
  footer:      { paddingVertical: 6, alignItems: 'center', gap: 6 },
  hint:        { fontSize: 12, fontFamily: 'Rajdhani_500Medium', letterSpacing: 0.4 },
  lbOpenBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  lbOpenText:  { fontSize: 11, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1.5 },

  // game over
  goBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  goCard:     {
    width: '100%', maxWidth: 340, borderRadius: 22, borderWidth: 2, padding: 20, alignItems: 'center',
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.65, shadowRadius: 26, elevation: 22,
  },
  goTitle:     { fontSize: 32, fontFamily: 'Rajdhani_700Bold', letterSpacing: 3 },
  recordBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 10, shadowOffset: { width: 0, height: 3 } },
  recordText:  { color: '#1a1200', fontSize: 12, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1.5 },
  goRow:       { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  goBlock:     { alignItems: 'center', paddingHorizontal: 22 },
  goLabel:     { fontSize: 11, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2.5 },
  goBig:       { fontSize: 52, fontFamily: 'Rajdhani_700Bold' },
  goSep:       { width: 1, height: 48 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 26, borderRadius: 14, marginTop: 12 },
  retryText:    { color: '#fff', fontSize: 14, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2 },
  continueBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, paddingHorizontal: 28, borderRadius: 14, marginTop: 16, backgroundColor: '#7C3AED', borderWidth: 1.5, borderColor: '#A855F7', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 },
  continueBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1.5 },
  livesRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, justifyContent: 'center' },

  // leaderboard modal header
  lbModalHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8, marginBottom: 4 },
  lbModalTitle:  { flex: 1, fontSize: 15, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2.5 },

  // leaderboard panel
  lbContainer:   { width: '100%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  lbInnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  lbTitle:       { fontSize: 12, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2.5 },
  lbDivider:     { height: 1, width: '100%', marginVertical: 2 },
  lbScroll:      { maxHeight: 196 },
  lbEmpty:       { fontSize: 12, fontFamily: 'Rajdhani_500Medium', textAlign: 'center', paddingVertical: 12 },

  // user row (personal best)
  myRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1.5, borderRadius: 10, marginHorizontal: 4, marginBottom: 4 },
  myLabel: { flex: 1, fontSize: 13, fontFamily: 'Rajdhani_600SemiBold' },
  myScore: { fontSize: 22, fontFamily: 'Rajdhani_700Bold' },
  myBest:  { fontSize: 8, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1.2, position: 'absolute', right: 10, bottom: 2 },

  // leaderboard rows (zebra)
  lbRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9 },
  lbRank:  { width: 32, fontSize: 13, textAlign: 'center' },
  lbName:  { flex: 1, fontSize: 13, fontFamily: 'Rajdhani_600SemiBold', marginHorizontal: 8 },
  lbScore: { fontSize: 15, fontFamily: 'Rajdhani_700Bold', minWidth: 28, textAlign: 'right' },

  // name entry modal
  nmHeader:     { alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 12 },
  nmIconCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 4 },
  nmTitle:      { fontSize: 18, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2.5, textAlign: 'center' },
  nmSub:        { fontSize: 12, fontFamily: 'Rajdhani_500Medium', textAlign: 'center', lineHeight: 17 },
  nmDivider:    { height: 1, width: '100%', marginBottom: 16 },
  nmInputWrap:  { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6 },
  nmInput:      { flex: 1, fontSize: 16, fontFamily: 'Rajdhani_600SemiBold', padding: 0 },
  nmCounter:    { fontSize: 11, fontFamily: 'Rajdhani_500Medium' },
  nmHint:       { fontSize: 11, fontFamily: 'Rajdhani_500Medium', alignSelf: 'flex-start', marginBottom: 4, marginLeft: 2 },
  nmBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 10 },
  nmBtnText:    { fontSize: 14, fontFamily: 'Rajdhani_700Bold', letterSpacing: 2 },
});
