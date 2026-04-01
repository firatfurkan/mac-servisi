import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  limit 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
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

  // Otomatik anonim giriş yap
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      if (__DEV__) console.error("Firebase Auth Error:", error);
    });
  }, []);

  // Mesajları dinle
  useEffect(() => {
    if (!matchId) return;

    const q = query(
      collection(db, `matches/${matchId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgsData: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgsData.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  // Mesaj Gönder
  const sendMessage = async (text: string, userName: string) => {
    if (!text.trim() || !userName.trim()) return;
    
    // Basit Küfür Filtresi
    const badWords = ["amk", "aq", "sg", "siktir", "oç", "piç", "ibne", "orospu"];
    const lowerText = text.toLowerCase();
    
    if (badWords.some(word => lowerText.includes(word))) {
      throw new Error("Lütfen saygılı bir dil kullanın.");
    }

    try {
      await addDoc(collection(db, `matches/${matchId}/messages`), {
        matchId,
        userId: auth.currentUser?.uid || "anonymous",
        userName: userName.trim(),
        text: text.trim(),
        createdAt: serverTimestamp()
      });
    } catch (err) {
      if (__DEV__) console.error("Mesaj gönderilemedi:", err);
      throw err;
    }
  };

  return { messages, loading, sendMessage };
}
