import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useNotificationStore } from '../stores/notificationStore';
import { apiService } from '../services/api';
import { trackMatchChanges, initializeMatchStatuses, clearPreviousScores } from '../services/goalTracker';
import { unregisterMatchPush } from '../services/pushService';

const POLL_INTERVAL = 60_000; // 60 seconds — CF push zaten anlık bildirir, bu sadece in-app ses için

/**
 * Runs at the app root level. Polls notified matches independently
 * of the currently viewed date/screen. Sends notifications for
 * goal, match start, and match finish events.
 */
export function useNotifiedMatchTracker() {
  const notifiedMatches = useNotificationStore((s) => s.notifiedMatches);
  const removeMatch = useNotificationStore((s) => s.removeMatchNotification);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  // Stores the latest pollMatches fn so foreground handler can call it
  const pollRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    if (notifiedMatches.length === 0) {
      // Nothing to track
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const pollMatches = async () => {
      // Only poll when app is in foreground
      if (AppState.currentState !== 'active') return;

      const now = Date.now();

      // Determine which matches need polling:
      // - Already live (no startTime check needed)
      // - Starting within 5 minutes (to catch kick-off)
      // - Started less than 3 hours ago (match should still be going)
      const matchesToPoll = notifiedMatches.filter((m) => {
        if (!m.startTime) return true; // no metadata, always poll
        const start = new Date(m.startTime).getTime();
        const fiveMinBefore = start - 5 * 60 * 1000;
        const threeHoursAfter = start + 3 * 60 * 60 * 1000;
        return now >= fiveMinBefore && now <= threeHoursAfter;
      });

      if (matchesToPoll.length === 0) return;

      try {
        // Fetch each notified match by ID
        const results = await Promise.all(
          matchesToPoll.map((m) => apiService.getMatchById(m.id))
        );
        const liveData = results.filter((m): m is NonNullable<typeof m> => m !== null);

        if (liveData.length === 0) return;

        // On first poll, initialize statuses so we don't trigger false notifications
        if (!initializedRef.current) {
          initializeMatchStatuses(liveData);
          initializedRef.current = true;
          return;
        }

        // Track goals, match start, match finish
        trackMatchChanges(liveData);

        // Auto-remove finished matches from notification list (after sending finish notification)
        for (const match of liveData) {
          if (match.status === 'finished') {
            setTimeout(() => {
              removeMatch(match.id);
              unregisterMatchPush(match.id).catch(() => {});
            }, 5000);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[MatchTracker] Polling hatası:', error);
      }
    };

    pollRef.current = pollMatches;

    // Poll immediately on mount, then at interval
    pollMatches();
    intervalRef.current = setInterval(pollMatches, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [notifiedMatches, removeMatch]);

  // Reset initialization when notified matches change (new match added/removed)
  useEffect(() => {
    initializedRef.current = false;
  }, [notifiedMatches.length]);

  // When app comes to foreground, immediately poll to catch goals/half-time
  // that happened while in background — don't reset initializedRef (wastes a cycle)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollRef.current?.();
      }
    });
    return () => sub.remove();
  }, []);
}
