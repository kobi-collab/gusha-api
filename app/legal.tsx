import { useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PRIVACY_EMAIL, SAFETY_EMAIL, SUPPORT_EMAIL } from "@/constants/contact";

type DocKey = "terms" | "privacy" | "community" | "csae";

const DOCS: Record<DocKey, { title: string; body: string }> = {
  terms: {
    title: "Terms of Service",
    body: `These Terms of Service ("Terms") govern your use of Gusha. By creating a profile or using Gusha you agree to these Terms.

1. Eligibility
You must be at least 18 years old to use Gusha. We reserve the right to suspend any account that misrepresents age or identity.

2. Your Account
You create a profile by completing onboarding. This creates a guest account linked to your device. No separate sign-in is required to get started. Optional account linking may be offered in a future update.

3. Acceptable Use
You agree not to use Gusha to harass, threaten, impersonate, defraud, or harm any other person. You will not post sexually explicit content, hate speech, violence, or anything illegal. You will not attempt to disrupt or reverse-engineer the service.

4. Your Content
You retain ownership of the photos, text, and other content you submit. You grant Gusha a worldwide, royalty-free license to host, display, and transmit that content as needed to operate the service.

5. Subscriptions
Gusha v1.0.2 is free. All features are available at no charge. Paid plans are not sold in this version.

6. Account Termination
We may suspend or terminate accounts that violate these Terms or our Community Guidelines, with or without notice. You may delete your account at any time from Settings.

7. Disclaimers
Gusha is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of user content, or the outcome of any introductions made through the app.

8. Limitation of Liability
To the maximum extent permitted by law, Gusha is not liable for indirect, incidental, or consequential damages arising from your use of the service.

9. Changes
We may update these Terms from time to time. Continued use of the service after a change constitutes acceptance of the updated Terms.

10. Contact
Questions about these Terms can be sent to ${SUPPORT_EMAIL}.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `This Privacy Policy explains what information Gusha collects and how it is used.

1. Information We Collect
- Profile information you provide: display name, age, photos, bio, interests, and preferences.
- Age verification: checked on your device to confirm you are 18+. We do not store your full date of birth on our servers.
- Device information: app version, OS, language, and crash logs.
- Approximate location, only when you manually check in to Radar and grant permission. You can check out at any time.

2. How We Use Information
We use your information to operate the app, match you with other users you might want to meet, prevent abuse, and improve product quality. We do not sell your personal information.

3. Sharing
- Other users see only what you choose to display on your profile.
- Service providers (hosting, analytics, push delivery) process data on our behalf under contract.
- We disclose information when required by law or to protect the safety of our users.

4. Retention
Profile data is stored while your account is active. When you delete your account we remove your profile within 30 days, except where retention is required by law.

5. Your Rights
You can edit or delete your profile data, withdraw location permission, or delete your account from Settings. To request a copy of your data or exercise other rights granted by applicable law, contact ${PRIVACY_EMAIL}.

6. Children
Gusha is not directed to anyone under 18 and we do not knowingly collect data from minors.

7. Changes
We will notify users of material changes to this policy through the app.

8. Contact
Privacy questions: ${PRIVACY_EMAIL}.`,
  },
  community: {
    title: "Community Guidelines",
    body: `Gusha is for adults who want to meet, talk, and have fun. To keep this a respectful place, please follow these guidelines.

Be respectful.
Treat every user the way you want to be treated. No harassment, no slurs, no hateful or discriminatory content.

No nudity or sexually explicit content.
Profile photos and chat content must be tasteful and safe for a general adult audience.

No solicitation.
Do not use Gusha to sell goods or services, to recruit for other platforms, or to ask for money.

No fake profiles.
Use your real photo and real information. No impersonation.

Protect your safety.
Do not share sensitive personal information (home address, financial information, government IDs) with people you have just met.

Report problems.
If you see content or behavior that breaks these rules, use the Report button on any profile or message. Our team reviews reports and may remove content or suspend accounts.

Violations may result in warning, suspension, or permanent removal from Gusha.`,
  },
  csae: {
    title: "Child Safety Policy",
    body: `Gusha has zero tolerance for child sexual abuse and exploitation (CSAE).

Gusha is an adults-only service. You must be at least 18 years old to create an account. We verify age at signup and may re-verify at any time.

Prohibited conduct includes, without limitation:
- Any sexual content involving minors.
- Soliciting, grooming, or attempting to contact a minor.
- Sharing, requesting, or hosting child sexual abuse material (CSAM).
- Sexualised depictions of minors, including drawn, animated, or AI-generated content.

Reporting
If you encounter any content or behavior that exploits or endangers a minor, please report it immediately using the Report button in the app, or email ${SAFETY_EMAIL}. We review every report and act quickly.

Cooperation with authorities
We report suspected CSAM to the National Center for Missing & Exploited Children (NCMEC) and equivalent authorities in other jurisdictions, and we cooperate with law enforcement investigations.

Account consequences
Accounts that violate this policy are permanently removed and reported to law enforcement where required by law.`,
  },
};

export default function LegalScreen() {
  const colors = useColors();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();

  const docKey: DocKey = useMemo(() => {
    if (doc === "privacy" || doc === "community" || doc === "csae") return doc;
    return "terms";
  }, [doc]);

  const { title, body } = DOCS[docKey];

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="arrow.left" size={24} color={colors.primary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.bodyText, { color: colors.foreground }]}>{body}</Text>
        <Text style={[styles.updated, { color: colors.muted }]}>
          Last updated: May 2026
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  updated: {
    fontSize: 12,
    marginTop: 24,
    textAlign: "center",
  },
});
