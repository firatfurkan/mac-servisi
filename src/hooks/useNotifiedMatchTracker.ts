import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useNotificationStore } from '../stores/notificationStore';
import { apiService } from '../services/api';
import { trackMatchChanges, initializeMatchStatuses, clearPreviousScores } from '../services/goalTracker';
import { unregisterMatchPush } from '../services/pushService';

const POLL_INTERVAL = 60_000; // 60 seconds

/**
 * Runs at the app root level. Polls notified matches independently
 * of the currently viewed date/screen.
 *
 * Stability fix: depend only on the match ID list length (not the array
 * reference or store actions) to avoid the effect restarting on every
 * Zustand slice update and accidentally resetting initializedRef.
 */
export function useNotifiedMatchTracker() {
  const matchCount = useNotificationStore((s) => s.notifiedMatches.length);
  const initializedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    // Reset init flag only when the list size changes (match added/removed)
    initializedRef.current = false;
  }, [matchCount]);

  useEffect(() => {
    if (matchCount === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const pollMatches = async () => {
      if (AppState.currentState !== 'active') return;

      // Read latest state directly from store — avoids stale closure issues
      const { notifiedMatches, removeMatchNotification } =
        useNotificationStore.getState();

      const now = Date.now();
      const matchesToPoll = notifiedMatches.filter((m) => {
        if (!m.startTime) return true;
        const start = new Date(m.startTime).getTime();
        return now >= start - 5 * 60_000 && now <= start + 3 * 60 * 60_000;
      });

      if (matchesToPoll.length === 0) return;

      try {
        const results = await Promise.all(
          matchesToPoll.map((m) => apiService.getMatchById(m.id)),
        );
        const liveData = results.filter(
          (m): m is NonNullable<typeof m> => m !== null,
        );

        if (liveData.length === 0) return;

        if (!initializedRef.current) {
          initializeMatchStatuses(liveData);
          initializedRef.current = true;
          return;
        }

        trackMatchChanges(liveData);

        for (const match of liveData) {
          if (match.status === 'finished') {
            setTimeout(() => {
              removeMatchNotification(match.id);
              unregisterMatchPush(match.id).catch(() => {});
            }, 5_000);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[MatchTracker] Polling hatası:', error);
      }
    };

    pollRef.current = pollMatches;

    pollMatches();
    intervalRef.current = setInterval(pollMatches, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // matchCount değişince (maç eklendi/kaldırıldı) interval yeniden kurulur.
  // Store'dan direkt okuma (getState) sayesinde closure bağımlılığı yok.
  }, [matchCount]);

  // Uygulama ön plana gelince anında poll — initializedRef sıfırlanmaz
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pollRef.current?.();
    });
    return () => sub.remove();
  }, []);
}
