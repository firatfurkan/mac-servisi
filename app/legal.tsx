import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';

type Tab = 'privacy' | 'terms';

/* ─────────────────────────── Turkish Content ─────────────────────────── */

const PRIVACY_TR = `
SON GÜNCELLEME: 26 Nisan 2026

Maç Servisi uygulamasını ("Uygulama") kullanmadan önce lütfen bu Gizlilik Politikası'nı dikkatlice okuyun. Uygulamayı kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.

─────────────────────
1. KİM OLDUĞUMUZ
─────────────────────
Maç Servisi, futbol maçlarına ait canlı skorları, istatistikleri ve lig puan durumlarını sunan eğlence amaçlı bir mobil uygulamadır. Uygulama yayıncısı: Lionx Studio.

─────────────────────
2. TOPLANAN VERİLER
─────────────────────
a) Reklamcılık Tanımlayıcısı (Advertising ID)
Uygulama, Google AdMob aracılığıyla hedefli reklam sunmak için mobil cihazınızın Reklam Kimliği'ni (IDFA / GAID) kullanır.

b) Firebase Analytics & Crashlytics
Uygulama deneyimini geliştirmek amacıyla Google Firebase üzerinden kullanım istatistikleri, oturum süresi, çökme raporları ve cihaz bilgileri toplanabilir.

c) Firebase Cloud Messaging (FCM)
Bildirim hizmeti için anonim bir cihaz token'ı oluşturulur. Bu token yalnızca size maç bildirimleri göndermek için kullanılır.

d) Kullanıcı Tarafından Girilen Profil Bilgileri
Ayarlar ekranında isteğe bağlı olarak girdiğiniz ad, e-posta ve favori takım bilgisi yalnızca cihazınızda (AsyncStorage) saklanır.

e) Forum İçeriği
Forum sekmesinde oluşturduğunuz mesajlar Firebase Firestore'da saklanır.

─────────────────────
3. VERİLERİ NASIL KULLANIYORUZ
─────────────────────
• Uygulamanın temel işlevselliğini sağlamak
• Kullanıcı deneyimini iyileştirmek ve hataları gidermek
• Gol ve maç başlangıcı gibi anlık bildirimler göndermek
• Google AdMob aracılığıyla reklam göstermek

─────────────────────
4. ÜÇÜNCÜ TARAF HİZMETLER
─────────────────────
Bu uygulama Google AdMob, Firebase ve API-Sports hizmetlerini kullanır. Bu hizmetler kendi gizlilik politikaları kapsamında veri toplayabilir.

─────────────────────
5. VERİ SAKLAMA SÜRESİ
─────────────────────
Firebase Analytics verileri en fazla 14 ay saklanır. Forum mesajları hesabınız aktif olduğu sürece saklanır. Cihaz yerel verileri uygulamayı kaldırdığınızda silinir.

─────────────────────
6. KULLANICI HAKLARI
─────────────────────
KVKK ve GDPR kapsamında verilerinizi görme, silme ve işlemeye itiraz etme haklarına sahipsiniz.

Talepleriniz için: macservisi@yahoo.com

─────────────────────
7. ÇOCUKLARIN GİZLİLİĞİ
─────────────────────
Uygulama 4 yaş ve üzeri için tasarlanmıştır. 13 yaşın altındaki çocuklardan bilerek kişisel veri toplamıyoruz.

─────────────────────
8. SORUMLULUK REDDİ
─────────────────────
Maç Servisi yalnızca eğlence amaçlıdır. İçerikler bahis veya kumar teşviki niteliği taşımaz.

─────────────────────
9. POLİTİKA DEĞİŞİKLİKLERİ
─────────────────────
Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde uygulama içi bildirim göndeririz.

─────────────────────
10. İLETİŞİM
─────────────────────
Gizlilik ile ilgili sorularınız için:
E-posta: macservisi@yahoo.com
`;

const TERMS_TR = `
SON GÜNCELLEME: 26 Nisan 2026

Bu Kullanım Koşulları ("Koşullar"), Maç Servisi uygulamasını kullanan tüm bireyler için geçerlidir. Uygulamayı indirerek veya kullanarak bu koşulları kabul etmiş sayılırsınız.

─────────────────────
1. HİZMETİN TANIMI
─────────────────────
Maç Servisi; canlı futbol skorlarını, maç istatistiklerini ve lig puan durumlarını sunan eğlence amaçlı bir mobil uygulamadır. Veriler üçüncü taraf API'lerden alınmaktadır.

─────────────────────
2. KABUL KOŞULLARI
─────────────────────
• Uygulamayı kullanmak için en az 4 yaşında olmanız gerekir.
• 13 yaş altı kullanıcılar için ebeveyn veya vasi onayı zorunludur.

─────────────────────
3. FORUM KULLANIM KURALLARI
─────────────────────
Forum kullanırken küfür, hakaret, nefret söylemi, spam, bahis reklamı veya telif hakkı ihlali içeren içerikler paylaşmak yasaktır.

YAPTIRIMLAR:
Apple App Store ve Google Play Store kuralları gereğince; yukarıdaki kurallara aykırı davranan kullanıcılar:
  ⓵ İlk ihlalde uyarı alır
  ⓶ Tekrarlayan ihlallerde forum erişimi geçici olarak askıya alınır
  ⓷ Kötü niyetli kullanıcılar uygulamadan SÜRESİZ OLARAK ENGELLENECEK ve içerikleri kaldırılacaktır

Kullanıcı şikâyetleri: macservisi@yahoo.com

─────────────────────
4. SORUMLULUK REDDİ — BAHIS / KUMAR
─────────────────────
ÖNEMLI UYARI: Maç Servisi uygulaması yalnızca eğlence ve bilgilendirme amacıyla sunulmaktadır.

  • Uygulama içindeki hiçbir içerik bahis veya kumar teşviki niteliği taşımaz.
  • Herhangi bir bahis kararı tamamen kullanıcının kendi sorumluluğundadır.
  • Uygulama, hiçbir bahis şirketi veya kumar platformuyla bağlantılı değildir.

─────────────────────
5. FİKRİ MÜLKİYET
─────────────────────
Uygulama tasarımı, logosu ve özgün içerikleri Lionx Studio'ya aittir. İzinsiz kopyalama veya dağıtım yasaktır.

─────────────────────
6. SORUMLULUK SINIRI
─────────────────────
Maç Servisi, üçüncü taraf API'lerden sağlanan verilerin doğruluğunu garanti etmez. Uygulama "olduğu gibi" sunulmaktadır.

─────────────────────
7. GİZLİLİK
─────────────────────
Kişisel verilerinizin nasıl işlendiğini öğrenmek için Gizlilik Politikası'mızı inceleyin.

─────────────────────
8. APPLE EULA UYUMLULUĞU
─────────────────────
Bu uygulama Apple'ın Lisanslı Uygulama Son Kullanıcı Lisans Sözleşmesi (EULA) kapsamında lisanslanmıştır. Apple, bu sözleşmenin tarafı değildir. Destek talepleri için: macservisi@yahoo.com

─────────────────────
9. DEĞİŞİKLİKLER
─────────────────────
Bu koşulları önceden bildirim yapmaksızın güncelleyebiliriz.

─────────────────────
10. UYGULANACAK HUKUK
─────────────────────
Bu koşullar Türkiye Cumhuriyeti hukukuna tabi olup uyuşmazlıklar İstanbul mahkemelerinde çözüme kavuşturulur.

─────────────────────
11. İLETİŞİM
─────────────────────
Kullanım koşullarına ilişkin sorularınız için:
E-posta: macservisi@yahoo.com
`;

/* ─────────────────────────── English Content ─────────────────────────── */

const PRIVACY_EN = `
LAST UPDATED: April 26, 2026

Please read this Privacy Policy carefully before using the Maç Servisi ("Match Service") application. By using the app, you agree to the terms below.

─────────────────────
1. WHO WE ARE
─────────────────────
Maç Servisi is an entertainment-focused mobile application providing live football scores, statistics, and league standings. Publisher: Lionx Studio.

─────────────────────
2. DATA WE COLLECT
─────────────────────
a) Advertising Identifier (IDFA / GAID)
The app uses your mobile device's advertising ID through Google AdMob to serve personalized ads.

b) Firebase Analytics & Crashlytics
To improve user experience, data such as usage statistics, session duration, crash reports, and device info are collected via Google Firebase.

c) Firebase Cloud Messaging (FCM)
An anonymous device token is created for push notification delivery.

d) User-Entered Profile Information
Name, email, and favorite team entered in Settings are stored locally on your device.

e) Forum Content
Messages posted in the Forum tab are stored in Firebase Firestore.

─────────────────────
3. HOW WE USE YOUR DATA
─────────────────────
• To provide core app functionality
• To improve user experience and fix bugs
• To send real-time notifications
• To display ads via Google AdMob

─────────────────────
4. THIRD-PARTY SERVICES
─────────────────────
The app uses Google AdMob, Firebase, and API-Sports. These services may collect data under their own privacy policies.

─────────────────────
5. DATA RETENTION
─────────────────────
Firebase Analytics data is retained for up to 14 months. Forum messages are retained while your account is active. Local device data is deleted when you uninstall the app.

─────────────────────
6. YOUR RIGHTS
─────────────────────
Under GDPR and applicable laws, you have the right to access, delete, or object to the processing of your data.

Contact: macservisi@yahoo.com

─────────────────────
7. CHILDREN'S PRIVACY
─────────────────────
The app is rated 4+. We do not knowingly collect personal information from children under 13.

─────────────────────
8. DISCLAIMER
─────────────────────
Maç Servisi is for entertainment purposes only. No content constitutes an invitation or encouragement to gamble or bet.

─────────────────────
9. POLICY CHANGES
─────────────────────
We may update this policy from time to time. Significant changes will be notified via in-app notification.

─────────────────────
10. CONTACT
─────────────────────
Privacy inquiries: macservisi@yahoo.com
`;

const TERMS_EN = `
LAST UPDATED: April 26, 2026

These Terms of Use ("Terms") apply to all individuals using the Maç Servisi application. By downloading or using the app, you agree to these Terms.

─────────────────────
1. SERVICE DESCRIPTION
─────────────────────
Maç Servisi provides live football scores, match statistics, and league standings for entertainment purposes. Data is sourced from third-party APIs.

─────────────────────
2. ELIGIBILITY
─────────────────────
• You must be at least 4 years old to use the app.
• Users under 13 require parental or guardian consent.

─────────────────────
3. FORUM USAGE RULES
─────────────────────
Users must not post profanity, hate speech, spam, betting advertisements, or copyright-infringing material.

ENFORCEMENT:
In accordance with Apple App Store and Google Play Store policies, users who violate the above rules will face:
  ⓵ A warning for the first violation
  ⓶ Temporary suspension of forum access for repeated violations
  ⓷ Malicious users will be PERMANENTLY BANNED from the application and their content will be removed

To report abuse: macservisi@yahoo.com

─────────────────────
4. DISCLAIMER — BETTING / GAMBLING
─────────────────────
IMPORTANT: Maç Servisi is provided for entertainment and informational purposes only.

  • No content in the app constitutes an invitation or encouragement to bet or gamble.
  • Any betting decision is entirely the user's own responsibility.
  • The app is not affiliated with any betting company or gambling platform.

─────────────────────
5. INTELLECTUAL PROPERTY
─────────────────────
The app design, logo, and original content belong to Lionx Studio. Unauthorized copying or distribution is prohibited.

─────────────────────
6. LIMITATION OF LIABILITY
─────────────────────
Maç Servisi does not guarantee the accuracy of data provided by third-party APIs. The app is provided "as is."

─────────────────────
7. PRIVACY
─────────────────────
To learn how your personal data is processed, please review our Privacy Policy.

─────────────────────
8. APPLE EULA COMPLIANCE
─────────────────────
This application is licensed under Apple's Licensed Application End User License Agreement (EULA). Apple is not a party to this agreement. Support requests: macservisi@yahoo.com

─────────────────────
9. CHANGES
─────────────────────
We may update these Terms without prior notice.

─────────────────────
10. GOVERNING LAW
─────────────────────
These Terms are governed by the laws of the Republic of Turkey; disputes will be resolved in Istanbul courts.

─────────────────────
11. CONTACT
─────────────────────
Terms inquiries: macservisi@yahoo.com
`;

/* ─────────────────────────── Component ─────────────────────────── */

export default function LegalScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab === 'terms' ? 'terms' : 'privacy'
  );

  const isTR = i18n.language === 'tr';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'privacy', label: isTR ? 'Gizlilik' : 'Privacy' },
    { key: 'terms', label: isTR ? 'Kullanım' : 'Terms' },
  ];

  const content = activeTab === 'privacy'
    ? (isTR ? PRIVACY_TR : PRIVACY_EN)
    : (isTR ? TERMS_TR : TERMS_EN);

  const pageTitle = activeTab === 'privacy'
    ? (isTR ? 'Gizlilik Politikası' : 'Privacy Policy')
    : (isTR ? 'Kullanım Koşulları' : 'Terms of Use');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {pageTitle}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabLabel, {
                color: active ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: active ? '700' : '500',
              }]}>
                {tab.label}
              </Text>
              {active && (
                <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        horizontal={false}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Last updated badge */}
        <View style={[styles.updatedBadge, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.primary} />
          <Text style={[styles.updatedText, { color: theme.colors.primary }]}>
            {isTR ? 'Apple & Google standartlarına uygun' : 'Compliant with Apple & Google standards'}
          </Text>
        </View>

        <Text style={[styles.bodyText, { color: theme.colors.textPrimary }]}>
          {content.trim()}
        </Text>

        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            © 2026 Maç Servisi · Lionx Studio
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { paddingTop: 14 },
      android: { paddingTop: 14 },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
  },

  /* Content */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  updatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  updatedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
