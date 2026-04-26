import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { apiService } from '../services/api';
import { Match } from '../types';
import { useRedCardStore } from '../stores/redCardStore';

// All leagues to monitor (IDs match API-Sports string IDs on Match.league.id)
const MONITORED_LEAGUES = new Set([
  // Turkey
  "203", "204",        // Süper Lig, TFF 1. Lig
  "206",               // Türkiye Kupası
  // Europe — Big 5
  "39", "140", "135", "78", "61",  // PL, La Liga, Serie A, Bundesliga, Ligue 1
  // European Cups
  "2", "3", "848",     // Şampiyonlar Ligi, Avrupa Ligi, Konferans Ligi
  // National teams
  "1", "4", "5", "6", "32",  // World Cup, Euro, Nations League, Euro Qual, WC Qual EU
]);

const POLL_INTERVAL_MS = 60_000;   // live matches — every 60 s
const SEVEN_DAYS_MS   = 7 * 24 * 60 * 60 * 1000;

/**
 * Monitors matches in major leagues for red cards (direct + double-yellow).
 * - Yesterday's finished matches: scanned once per app session at startup.
 * - Today's finished matches:     scanned once per app session.
 * - Today's live matches:         re-polled every 60 s.
 * No additional API calls beyond what useMatchDetail already does.
 */
export function useRedCardMonitor() {
  const { setRedCardEvent, clearExpired } = useRedCardStore();

  // Refs survive re-renders without triggering them
  const isPollingRef          = useRef(false);
  const processedFinishedRef  = useRef<Set<string>>(new Set()); // finished matchIds this session
  const yesterdayScannedRef   = useRef(false);

  useEffect(() => {
    /** Fetch match list for a date and process red card events. */
    const scanDate = async (dateStr: string, liveOnly: boolean): Promise<void> => {
      const matches = await apiService.getMatchesByDate(dateStr);
      const now     = Date.now();

      const relevant = matches.filter((m: Match) => {
        if (!MONITORED_LEAGUES.has(m.league.id)) return false;
        const isLive = m.status === 'live' || m.status === 'half_time';
        const isFinished = m.status === 'finished';
        if (liveOnly) return isLive;
        return isLive || isFinished;
      });

      for (const match of relevant) {
        const isFinished = match.status === 'finished';

        // Skip finished matches already processed this session (avoid duplicate API calls)
        if (isFinished && processedFinishedRef.current.has(match.id)) continue;

        try {
          const detail = await apiService.getMatchDetail(match.id);

          // After getMatchDetail(), events are already mapped:
          //   "Yellow Card"       → type: "yellow_card"
          //   "Red Card"          → type: "red_card"
          //   "Yellow Red Card"   → type: "red_card"  (double yellow = included)
          const redCards = (detail.events ?? []).filter((e) => e.type === 'red_card');

          for (const event of redCards) {
            // event.team is "home" | "away" — resolve to actual team name
            const playerTeam =
              event.team === 'home' ? match.homeTeam.name : match.awayTeam.name;

            setRedCardEvent({
              matchId:    match.id,
              matchLabel: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
              playerName: event.player || 'Unknown',
              playerTeam,
              minute:     event.minute,
              timestamp:  now,
            });
          }

          if (isFinished) processedFinishedRef.current.add(match.id);
        } catch {
          // Silently skip — individual match errors shouldn't block the loop
        }
      }
    };

    const poll = async (): Promise<void> => {
      if (isPollingRef.current) return;
      if (AppState.currentState !== 'active') return;
      isPollingRef.current = true;

      try {
        const todayStr     = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

        // Yesterday — one-time background scan per session
        if (!yesterdayScannedRef.current) {
          yesterdayScannedRef.current = true;
          scanDate(yesterdayStr, false).catch(() => {});
        }

        // Today: first poll includes finished matches, subsequent polls live-only
        const todayFullKey = `${todayStr}_full`;
        const todayFullDone = processedFinishedRef.current.has(todayFullKey);

        if (!todayFullDone) {
          processedFinishedRef.current.add(todayFullKey); // mark immediately to prevent parallel runs
          await scanDate(todayStr, false);                // live + finished
        } else {
          await scanDate(todayStr, true);                 // live only
        }
      } catch (err) {
        if (__DEV__) console.error('[RedCard] Poll error:', err);
      } finally {
        isPollingRef.current = false;
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });

    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [setRedCardEvent]);

  // Periodically evict entries older than 7 days
  useEffect(() => {
    const id = setInterval(() => clearExpired(SEVEN_DAYS_MS), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [clearExpired]);
}
