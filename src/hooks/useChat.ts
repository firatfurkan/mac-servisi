import { useEffect, useRef, useState } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db, auth } from '../services/firebase';

export interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export function useChat(matchId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // auth.currentUser zaten varsa (ValueQuizGame veya daha önce giriş yapıldıysa)
  // anında hazır say — onAuthStateChanged'i bekleme.
  const authReadyRef = useRef(!!auth.currentUser);
  const [authReady, setAuthReady] = useState(authReadyRef.current);

  // Auth durumunu izle; zaten hazırsa observer'ı hemen kaldır
  useEffect(() => {
    if (authReadyRef.current) return; // zaten hazır, observer'a gerek yok

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        authReadyRef.current = true;
        setAuthReady(true);
        unsub(); // bir kez tetiklendi, artık dinlemeye gerek yok
      } else {
        signInAnonymously(auth).catch(() => {
          // auth başarısız olsa bile loading'i bitir
          setLoading(false);
        });
      }
    });

    return () => unsub();
  }, []);

  // Auth hazır olunca Firestore snapshot'ı başlat
  useEffect(() => {
    if (!matchId || !authReady) return;

    const q = query(
      collection(db, `matches/${matchId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
          });
          setMessages(msgs);
          setLoading(false);
        },
        () => setLoading(false)
      );
    } catch (error) {
      if (__DEV__) console.error('[Chat] onSnapshot error:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [matchId, authReady]);

  const sendMessage = async (text: string, userName: string) => {
    if (!text.trim() || !userName.trim()) return;

    const badWords = ['amk', 'aq', 'sg', 'siktir', 'oç', 'piç', 'ibne', 'orospu'];
    if (badWords.some((w) => text.toLowerCase().includes(w))) {
      throw new Error('Lütfen saygılı bir dil kullanın.');
    }

    // Optimistic UI: mesajı anında yerel state'e ekle
    const optimisticId = `optimistic_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      matchId,
      userId: auth.currentUser?.uid || 'anonymous',
      userName: userName.trim(),
      text: text.trim(),
      createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
    };
    setMessages((prev) => [optimistic, ...prev]);

    try {
      await addDoc(collection(db, `matches/${matchId}/messages`), {
        matchId,
        userId: auth.currentUser?.uid || 'anonymous',
        userName: userName.trim(),
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      // Firestore snapshot gerçek mesajı getirince optimistic ID otomatik replace olur
    } catch (err) {
      // Başarısız olursa optimistic mesajı geri al
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      throw err;
    }
  };

  return { messages, loading, sendMessage };
}
