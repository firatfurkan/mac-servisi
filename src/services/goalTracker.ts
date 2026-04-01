import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../i18n/config';
import { Match, MatchEvent } from '../types';

// goalTracker bazli durumlarda MatchDetail (events iceren) alabilir
type MatchWithEvents = Match & { events?: MatchEvent[] };
import { useNotificationStore } from '../stores/notificationStore';
import { playGoalSound, playWhistleSound } from './soundManager';

const previousScores = new Map<string, { home: number; away: number }>();
const previousStatuses = new Map<string, Match['status']>();
// Track processed event IDs to avoid duplicate red card sounds
const processedEventIds = new Set<string>();

/**
 * Checks all tracked matches for goals, red cards, half-time, and match finish.
 * Called every time match data refreshes.
 *
 * NOTE: Push notifications are sent by the Firebase Cloud Function (functions/index.js).
 * This module only handles foreground sounds (goal jingle, whistle).
 */
export function trackMatchChanges(matches: MatchWithEvents[]) {
  const { notifiedMatchIds } = useNotificationStore.getState();

  for (const match of matches) {
    if (!notifiedMatchIds.includes(match.id)) continue;

    const prevStatus = previousStatuses.get(match.id);

    // --- Half-time ---
    if (prevStatus === 'live' && match.status === 'half_time') {
      playWhistleSound();
    }

    // --- Second half started (HT -> live) ---
    if (prevStatus === 'half_time' && match.status === 'live') {
      playWhistleSound();
    }

    // --- Match finished ---
    if (
      prevStatus &&
      prevStatus !== 'finished' &&
      match.status === 'finished'
    ) {
      playWhistleSound();
      previousScores.delete(match.id);
    }

    // --- Goal detection (only for live matches) ---
    if (match.status === 'live' || match.status === 'half_time') {
      if (match.homeScore !== null && match.awayScore !== null) {
        const prev = previousScores.get(match.id);
        const currentHome = match.homeScore;
        const currentAway = match.awayScore;

        if (prev) {
          if (currentHome > prev.home || currentAway > prev.away) {
            playGoalSound();
          }
        }

        previousScores.set(match.id, { home: currentHome, away: currentAway });
      }
    }

    // Always update status
    previousStatuses.set(match.id, match.status);
  }
}

// Keep backward compat alias
export const checkForGoals = trackMatchChanges;

export function clearPreviousScores() {
  previousScores.clear();
  previousStatuses.clear();
  processedEventIds.clear();
}

export function clearFinishedMatchScores(finishedMatchIds: string[]) {
  for (const id of finishedMatchIds) {
    previousScores.delete(id);
  }
}

const isNative = Platform.OS !== 'web';

export async function scheduleMatchReminder(match: Match) {
  if (!isNative) return;
  const startTime = new Date(match.startTime).getTime();
  const reminderTime = startTime - 15 * 60 * 1000;
  const now = Date.now();
  if (reminderTime <= now) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${i18n.t('notifications.matchApproaching')}`,
      body: `${match.homeTeam.name} vs ${match.awayTeam.name} — ${i18n.t('notifications.startsIn15')}`,
      sound: 'default',
      data: { matchId: match.id },
    },
    trigger: { type: 'date' as any, date: new Date(reminderTime) } as any,
    identifier: `reminder_${match.id}`,
  });
}

export async function cancelMatchReminder(matchId: string) {
  if (!isNative) return;
  await Notifications.cancelScheduledNotificationAsync(`reminder_${matchId}`).catch(() => {});
}

export function initializeMatchStatuses(matches: MatchWithEvents[]) {
  const { notifiedMatchIds } = useNotificationStore.getState();
  for (const match of matches) {
    if (!notifiedMatchIds.includes(match.id)) continue;
    if (!previousStatuses.has(match.id)) {
      previousStatuses.set(match.id, match.status);
      if (match.homeScore !== null && match.awayScore !== null) {
        previousScores.set(match.id, { home: match.homeScore, away: match.awayScore });
      }
      // Mark existing red cards as already processed
      if (match.events) {
        for (const event of match.events) {
          if (event.type === 'red_card') processedEventIds.add(event.id);
        }
      }
    }
  }
}
