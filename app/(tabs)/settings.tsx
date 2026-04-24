import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useThemeStore } from '../../src/stores/themeStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useEditorStore } from '../../src/stores/editorStore';
import { ThemeMode, Language } from '../../src/types';
import i18n from '../../src/i18n/config';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Editör Giriş Modalı ───────────────────────────────────────────────────
function EditorLoginModal({
  visible,
  onClose,
  theme,
  isTr,
}: {
  visible: boolean;
  onClose: () => void;
  theme: any;
  isTr: boolean;
}) {
  const { login, loggedInEditor } = useEditorStore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError(isTr ? 'Kullanıcı adı ve şifre gerekli.' : 'Username and password required.');
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? (isTr ? 'Giriş başarısız.' : 'Login failed.'));
      return;
    }
    onClose();
    router.push('/(tabs)/analysis' as any);
  };

  const handleClose = () => {
    setUsername(''); setPassword(''); setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={modalStyles.overlay} onPress={handleClose}>
        <Pressable style={[modalStyles.card, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          {/* İkon */}
          <View style={[modalStyles.iconCircle, { backgroundColor: theme.colors.primary + '18' }]}>
            <Ionicons name="shield-checkmark" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[modalStyles.title, { color: theme.colors.textPrimary }]}>
            {isTr ? 'Editör Girişi' : 'Editor Login'}
          </Text>
          <Text style={[modalStyles.subtitle, { color: theme.colors.textSecondary }]}>
            {isTr ? 'Analiz Merkezi yetkilendirmesi' : 'Analysis Center authorization'}
          </Text>

          {/* E-posta */}
          <TextInput
            style={[modalStyles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.divider, backgroundColor: theme.colors.background }]}
            value={username}
            onChangeText={setUsername}
            placeholder={isTr ? 'E-posta' : 'Email'}
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* Şifre */}
          <View style={[modalStyles.passRow, { borderColor: theme.colors.divider, backgroundColor: theme.colors.background }]}>
            <TextInput
              style={[modalStyles.passInput, { color: theme.colors.textPrimary }]}
              value={password}
              onChangeText={setPassword}
              placeholder={isTr ? 'Şifre' : 'Password'}
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={modalStyles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Hata */}
          {!!error && (
            <View style={[modalStyles.errorRow, { backgroundColor: '#FF444418' }]}>
              <Ionicons name="alert-circle-outline" size={14} color="#FF4444" />
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          )}

          {/* Giriş butonu */}
          <TouchableOpacity
            style={[modalStyles.loginBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={modalStyles.loginBtnText}>{isTr ? 'Giriş Yap' : 'Login'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClose} style={modalStyles.cancelLink}>
            <Text style={[modalStyles.cancelText, { color: theme.colors.textSecondary }]}>
              {isTr ? 'Vazgeç' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  passRow: { width: '100%', borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 12 },
  passInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  eyeBtn: { padding: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, marginBottom: 10, width: '100%' },
  errorText: { color: '#FF4444', fontSize: 12, flex: 1 },
  loginBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelLink: { paddingVertical: 8 },
  cancelText: { fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const { mode, setMode } = useThemeStore();
  const { language, profile, setLanguage, updateProfile } = useSettingsStore();
  const isTr = language === 'tr';
  const [editingField, setEditingField] = useState<string | null>(null);

  // ── Easter egg: 7 hızlı tıklama "Lionx Studio" yazısına ─────────────────
  const [showEditorModal, setShowEditorModal] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStudioTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setShowEditorModal(true);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const themeOptions: { value: ThemeMode; label: string; icon: IoniconName }[] = [
    { value: 'light', label: t('settings.themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon-outline' },
    { value: 'system', label: t('settings.themeSystem'), icon: 'contrast-outline' },
  ];

  const languageOptions: { value: Language; label: string; flag: string }[] = [
    { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const profileFields = [
    { key: 'name', label: t('settings.name'), icon: 'person-outline' as IoniconName, value: profile.name },
    { key: 'email', label: t('settings.email'), icon: 'mail-outline' as IoniconName, value: profile.email },
    { key: 'favoriteTeam', label: t('settings.favoriteTeam'), icon: 'football-outline' as IoniconName, value: profile.favoriteTeam || '' },
  ];

  const initials = profile.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <ScrollView
      horizontal={false}
      scrollEventThrottle={16}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Hero ── */}
      <View style={[styles.profileHero, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.avatarRing, { borderColor: theme.colors.primary + '40' }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={[styles.heroName, { color: theme.colors.textPrimary }]}>
          {profile.name || t('settings.name')}
        </Text>
        <Text style={[styles.heroEmail, { color: theme.colors.textSecondary }]}>
          {profile.email || t('settings.email')}
        </Text>
      </View>

      {/* ── Profile Fields ── */}
      <SectionLabel label={t('settings.profile')} theme={theme} />
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        {profileFields.map((field, idx) => (
          <View key={field.key}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
                <Ionicons name={field.icon} size={17} color={theme.colors.primary} />
              </View>
              <View style={styles.fieldBody}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  {field.label}
                </Text>
                {editingField === field.key ? (
                  <TextInput
                    style={[styles.fieldInput, { color: theme.colors.textPrimary, borderColor: theme.colors.primary }]}
                    value={field.value}
                    onChangeText={(text) => updateProfile({ [field.key]: text })}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.fieldValueRow}
                    onPress={() => setEditingField(field.key)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.fieldValue, { color: theme.colors.textPrimary }]}>
                      {field.value || '—'}
                    </Text>
                    <Ionicons name="pencil-outline" size={15} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ── Appearance ── */}
      <SectionLabel label={t('settings.appearance')} theme={theme} />
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardSubLabel, { color: theme.colors.textSecondary }]}>
          {t('settings.theme')}
        </Text>
        <View style={styles.themeRow}>
          {themeOptions.map((opt) => {
            const active = mode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setMode(opt.value)}
                activeOpacity={0.75}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.background,
                    borderColor: active ? theme.colors.primary : theme.colors.divider,
                  },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={active ? '#fff' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeBtnLabel,
                    { color: active ? '#fff' : theme.colors.textSecondary, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Language ── */}
      <SectionLabel label={t('settings.language')} theme={theme} />
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.langRow}>
          {languageOptions.map((opt) => {
            const active = language === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleLanguageChange(opt.value)}
                activeOpacity={0.75}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: active ? theme.colors.primary + '18' : 'transparent',
                    borderColor: active ? theme.colors.primary : theme.colors.divider,
                  },
                ]}
              >
                <Text style={styles.langFlag}>{opt.flag}</Text>
                <Text
                  style={[
                    styles.langLabel,
                    { color: active ? theme.colors.primary : theme.colors.textSecondary, fontWeight: active ? '700' : '400' },
                  ]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── App Info ── */}
      <SectionLabel label={t('settings.version')} theme={theme} />
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <InfoRow
          icon="information-circle-outline"
          label={t('settings.version')}
          value="1.1.2"
          theme={theme}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
        <InfoRow
          icon="shield-checkmark-outline"
          label={t('settings.privacy')}
          chevron
          accent
          theme={theme}
          onPress={() => router.push('/legal?tab=privacy')}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
        <InfoRow
          icon="document-text-outline"
          label={t('settings.terms')}
          chevron
          accent
          theme={theme}
          onPress={() => router.push('/legal?tab=terms')}
        />
      </View>

      {/* ── Studio Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.contactBtn, { backgroundColor: theme.colors.primary + '15' }]}
          onPress={() => Linking.openURL('mailto:macservisi@yahoo.com')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-unread-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.contactBtnText, { color: theme.colors.primary }]}>
            {isTr ? 'Bize Ulaşın' : 'Contact Us'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerTextContainer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>v.1.1.2</Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>2026 MaçServisi</Text>
          <TouchableOpacity onPress={handleStudioTap} activeOpacity={1} hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}>
            <Text style={[styles.footerStudio, { color: theme.colors.primary }]}>Lionx Studio</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Editör Giriş Modalı — easter egg */}
      <EditorLoginModal
        visible={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        theme={theme}
        isTr={isTr}
      />
    </ScrollView>
  );
}

/* ─── Sub-components ─── */

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[sectionStyles.label, { color: theme.colors.textSecondary }]}>
      {label.toUpperCase()}
    </Text>
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});

function InfoRow({
  icon,
  label,
  value,
  chevron,
  accent,
  theme,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  value?: string;
  chevron?: boolean;
  accent?: boolean;
  theme: any;
  onPress?: () => void;
}) {
  const content = (
    <View style={infoStyles.row}>
      <View style={[infoStyles.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
        <Ionicons name={icon} size={17} color={theme.colors.primary} />
      </View>
      <Text style={[infoStyles.label, { color: accent ? theme.colors.primary : theme.colors.textPrimary }]}>
        {label}
      </Text>
      {value && (
        <Text style={[infoStyles.value, { color: theme.colors.textSecondary }]}>{value}</Text>
      )}
      {chevron && (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
      )}
    </View>
  );

  if (chevron) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
  },
});

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  /* Profile hero */
  profileHero: {
    marginTop: 8,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroEmail: {
    fontSize: 13,
  },

  /* Card */
  card: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  cardSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 10,
  },

  /* Profile fields */
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  fieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBody: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '500',
    borderBottomWidth: 1.5,
    paddingVertical: 2,
  },

  /* Theme */
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 5,
  },
  themeBtnLabel: {
    fontSize: 11,
  },

  /* Language */
  langRow: {
    gap: 0,
    paddingVertical: 4,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 4,
  },
  langFlag: {
    fontSize: 20,
  },
  langLabel: {
    fontSize: 15,
  },
  
  /* Footer */
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerTextContainer: {
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  footerStudio: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
