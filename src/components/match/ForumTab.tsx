import React, { useState } from 'react';

// Küfür / argo filtresi — kaba eşleşme (normalize + substring)
const BANNED_WORDS = [
  "sik", "orospu", "göt", "got", "amk", "amına", "bok", "oç", "piç", "pic",
  "mal", "gerizekalı", "salak", "aptal", "ahmak", "dangalak", "beyinsiz",
  "kahpe", "kaltak", "sürtük", "ibne", "ibne", "oğlan", "puşt", "götveren",
  "yarrak", "yarak", "taşak", "meme", "sex", "porn", "bok", "sıç", "siç",
  "pezevenk", "gavat", "orosbu", "orospuçocuğu", "ananı", "ananın",
  "babanı", "babanın", "sikiş", "sikis", "amcık", "amcik",
];

function containsBannedWord(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[ıi]/g, "i")
    .replace(/[üu]/g, "u")
    .replace(/[öo]/g, "o")
    .replace(/[şs]/g, "s")
    .replace(/[çc]/g, "c")
    .replace(/[ğg]/g, "g")
    .replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((w) => {
    const nw = w
      .replace(/[ıi]/g, "i")
      .replace(/[üu]/g, "u")
      .replace(/[öo]/g, "o")
      .replace(/[şs]/g, "s")
      .replace(/[çc]/g, "c")
      .replace(/[ğg]/g, "g");
    return normalized.includes(nw);
  });
}

import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../../hooks/useChat';
import { useAppTheme } from '../../hooks/useAppTheme';
import { typography, borderRadius, spacing } from '../../theme/tokens';
import { useSettingsStore } from '../../stores/settingsStore';
import { toIstanbulDate } from '../../utils/matchUtils';

const TERMS_TEXT =
  'Bu forumda paylaşılan mesajlar herkese açıktır. Hakaret, iftira, ' +
  'ırkçılık veya yasadışı içerik kesinlikle yasaktır. Topluluk kurallarını ' +
  'ihlal eden hesaplar kalıcı olarak engellenir.';

function EulaCheckbox({
  checked,
  onToggle,
  theme,
}: {
  checked: boolean;
  onToggle: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={styles.eulaRow}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? theme.colors.primary : theme.colors.textSecondary,
            backgroundColor: checked ? theme.colors.primary : 'transparent',
          },
        ]}
      >
        {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
      <Text style={[styles.eulaLabel, { color: theme.colors.textPrimary }]}>
        <Text style={{ color: theme.colors.primary }}>Kullanım koşullarını</Text>
        {' '}ve{' '}
        <Text style={{ color: theme.colors.primary }}>topluluk kurallarını</Text>
        {' '}kabul ediyorum
      </Text>
    </TouchableOpacity>
  );
}

export default function ForumTab({ matchId }: { matchId: string }) {
  const { messages, loading, sendMessage } = useChat(matchId);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { profile, updateProfile, eulaAccepted, acceptEula } = useSettingsStore();

  const [inputText, setInputText] = useState('');
  const [draftName, setDraftName] = useState(profile.name);
  const [eulaChecked, setEulaChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const nameSet = profile.name.trim().length >= 3;

  const handleSaveName = () => {
    if (!eulaChecked) {
      setErrorMsg('Devam etmek için kullanım koşullarını kabul etmelisiniz.');
      return;
    }
    if (draftName.trim().length < 3) {
      setErrorMsg('Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }
    if (containsBannedWord(draftName)) {
      setErrorMsg('Kullanıcı adı uygunsuz kelime içeriyor.');
      return;
    }
    acceptEula();
    updateProfile({ name: draftName.trim() });
    setErrorMsg('');
  };

  const handleAcceptEulaOnly = () => {
    if (!eulaChecked) {
      setErrorMsg('Devam etmek için kullanım koşullarını kabul etmelisiniz.');
      return;
    }
    acceptEula();
    setErrorMsg('');
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (containsBannedWord(inputText)) {
      setErrorMsg('Mesajınız uygunsuz kelime içeriyor.');
      return;
    }
    try {
      await sendMessage(inputText, profile.name);
      setInputText('');
      setErrorMsg('');
      Keyboard.dismiss();
    } catch (error: any) {
      setErrorMsg(error.message || 'Mesaj gönderilemedi');
    }
  };

  // ── Kullanıcı adı ve EULA henüz tamamlanmadıysa ───────────────────────
  if (!nameSet || !eulaAccepted) {
    const eulaOnly = nameSet && !eulaAccepted;

    return (
      <KeyboardAvoidingView
        style={styles.setupOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.setupScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          horizontal={false}
          scrollEventThrottle={16}
        >
          <View style={[styles.nameContainer, { backgroundColor: theme.colors.card }]}>
            <Ionicons
              name={eulaOnly ? 'shield-checkmark-outline' : 'chatbubbles-outline'}
              size={48}
              color={theme.colors.primary}
            />
            <Text style={[styles.nameTitle, { color: theme.colors.textPrimary }]}>
              {eulaOnly ? 'Topluluk Kuralları' : 'Foruma Katıl'}
            </Text>
            <Text style={[styles.nameDesc, { color: theme.colors.textSecondary }]}>
              {eulaOnly
                ? TERMS_TEXT
                : 'Sohbete başlamak için bir kullanıcı adı belirleyin. Küfürlü ve argo kelime kullanımı yasaktır.'}
            </Text>

            {/* Kullanıcı adı alanı — sadece henüz girilmemişse */}
            {!eulaOnly && (
              <TextInput
                style={[
                  styles.nameInput,
                  { color: theme.colors.textPrimary, borderColor: theme.colors.divider },
                ]}
                placeholder="Kullanıcı Adı"
                placeholderTextColor={theme.colors.textSecondary}
                value={draftName}
                onChangeText={setDraftName}
                maxLength={15}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            )}

            {/* Koşullar özeti (sadece isim ekranında) */}
            {!eulaOnly && (
              <Text style={[styles.termsPreview, { color: theme.colors.textSecondary }]}>
                {TERMS_TEXT}
              </Text>
            )}

            {/* EULA Checkbox */}
            <EulaCheckbox
              checked={eulaChecked}
              onToggle={() => setEulaChecked(v => !v)}
              theme={theme}
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: eulaChecked ? theme.colors.primary : theme.colors.divider },
              ]}
              onPress={eulaOnly ? handleAcceptEulaOnly : handleSaveName}
              disabled={!eulaChecked}
            >
              <Text style={styles.saveBtnText}>
                {eulaOnly ? 'Onayla ve Devam Et' : 'Devam Et'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Ana forum ekranı ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          horizontal={false}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Henüz mesaj yok. İlk mesajı sen gönder!
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.messageBubble, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.msgHeader}>
                <Text style={[styles.msgUser, { color: theme.colors.primary }]}>{item.userName}</Text>
                {item.createdAt && (
                  <Text style={[styles.msgTime, { color: theme.colors.textSecondary }]}>
                    {(() => {
                      const ms = typeof item.createdAt.toMillis === 'function'
                        ? item.createdAt.toMillis()
                        : typeof item.createdAt.toDate === 'function'
                          ? item.createdAt.toDate().getTime()
                          : Date.now();
                      const ist = toIstanbulDate(new Date(ms));
                      return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
                    })()}
                  </Text>
                )}
              </View>
              <Text style={[styles.msgText, { color: theme.colors.textPrimary }]}>{item.text}</Text>
            </View>
          )}
        />
      )}

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.divider },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: theme.colors.textPrimary, backgroundColor: theme.colors.background },
          ]}
          placeholder="Mesaj yaz..."
          placeholderTextColor={theme.colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={150}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.divider },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      {errorMsg ? (
        <Text style={[styles.errorText, { paddingHorizontal: 16, paddingBottom: 8 }]}>
          {errorMsg}
        </Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const webOverflow =
  Platform.OS === 'web' ? { overflow: 'hidden' as const, overflowX: 'hidden' as const } : {};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...webOverflow,
  },
  // Setup (isim/EULA) ekranı — klavye açılınca scroll eder
  setupOuter: {
    flex: 1,
  },
  setupScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  nameContainer: {
    margin: 16,
    padding: 24,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  nameTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  nameDesc: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  nameInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    fontSize: typography.sizes.md,
    marginBottom: 12,
  },
  termsPreview: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
    opacity: 0.85,
  },
  // ── EULA Checkbox ──────────────────────────────────────────────────────
  eulaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 16,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  eulaLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  // ───────────────────────────────────────────────────────────────────────
  saveBtn: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 16,
    ...webOverflow,
  },
  chatContent: {
    paddingVertical: 16,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: typography.sizes.md,
  },
  messageBubble: {
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgUser: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  msgTime: {
    fontSize: 10,
  },
  msgText: {
    fontSize: typography.sizes.md,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: Platform.OS === 'web' ? 16 : typography.sizes.md,
    ...webOverflow,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: typography.sizes.sm,
    marginBottom: 12,
    textAlign: 'center',
  },
});
