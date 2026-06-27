import type { Express, Request, Response } from "express";
import { PRIVACY_EMAIL, SAFETY_EMAIL, SUPPORT_EMAIL } from "../shared/const.js";

const PAGE_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px 16px; color: #1A1A2E; background: #FAFAFF; line-height: 1.6; }
  h1 { color: #D946A8; font-size: 28px; margin-bottom: 4px; }
  h2 { color: #1A1A2E; font-size: 20px; margin-top: 28px; border-bottom: 1px solid #E0DFE8; padding-bottom: 8px; }
  h3 { color: #7E7E8F; font-size: 16px; margin-top: 16px; }
  p { margin: 8px 0; color: #1A1A2E; }
  .meta { color: #7E7E8F; font-size: 14px; margin-bottom: 24px; }
  .logo { font-size: 36px; font-weight: 800; color: #D946A8; margin-bottom: 0; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  a { color: #D946A8; }
`;

function wrapHtml(title: string, lastUpdated: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Gusha</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <div class="logo">G</div>
  <h1>${title}</h1>
  <p class="meta">Last Updated: ${lastUpdated}</p>
  ${body}
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #E0DFE8;">
  <p style="color: #7E7E8F; font-size: 13px;">TGBC. | Company Registration No.: 028871614 | Parlok 17 Tel Aviv, Israel | ${SUPPORT_EMAIL} | ${PRIVACY_EMAIL}</p>
</body>
</html>`;
}

// ── Terms of Service ──

const TERMS_HTML = wrapHtml("Terms of Service", "March 26, 2026", `
<h2>1. Introduction, Definitions, and Acceptance of Terms</h2>
<h3>Definitions</h3>
<p>"The App" / "The Service" / "Gusha" – A social community application, operated and managed by the Company, including any accompanying service, website, web interface, messaging system, support services, and any related feature.</p>
<p>"The Company" – TGBC., Company Registration Number 028871614, which owns and manages the App.</p>
<p>"User" – Any person who has registered for the service and created a user account in the App, or makes any use of the App.</p>
<p>"User Content" – Any information, data, or material of any kind uploaded or provided in the course of using the Service, including texts, photos, links, comments, messages, Taps, profile information, etc.</p>
<p>"Subscription" – Optional paid plans that may be offered in the future to unlock additional features. Gusha is currently free to use; no paid subscriptions are sold in the app at this time.</p>

<h3>Acceptance</h3>
<p>The use of the App, including downloading, installing, creating an account, logging in, browsing the Grid, sending messages, or any other use, constitutes the User's full and unconditional agreement to these Terms of Use, the Privacy Policy, and the Community Guidelines, as they may be updated from time to time.</p>
<p>If the User does not agree to these Terms, in whole or in part, they have no right to use the App, and they are requested to immediately uninstall the App from their device and cease all use thereof.</p>
<p>The Company reserves the right, at its sole discretion, to update the Terms of Use, Privacy Policy, and Community Guidelines from time to time. A material update will be published in the App and/or on the website, and continued use of the App after the updates take effect constitutes acceptance of the updated terms.</p>

<h2>2. Description and Purpose of the Service</h2>
<p>The App is designed to allow adults over the age of 18 to create a personal profile, discover, and connect with other users through profile displays, a location-based Radar (manual check-in only), exchanging messages and photos, playing community games, and additional features that may be added or modified from time to time.</p>
<p>The Company does not provide professional counseling services or any other service beyond providing a technological platform that facilitates communication and community building between users. The Company does not guarantee that using the App will result in connections, meetings, friendships, or any other outcome.</p>

<h2>3. Eligibility and Minimum Age Requirements</h2>
<p>Use of the App is strictly limited to adults aged 18 and older.</p>
<p>By creating an account and using the App, the User represents and warrants that they are at least 18 years of age at the time of account creation, they are legally competent and act on their own behalf and for themselves only, and there is no legal or contractual restriction prohibiting them from using the App.</p>
<p>The Company implements an active Age Gating mechanism as a mandatory prerequisite during registration. Additionally, the Company reserves the right to request, at any time, proof of age and identity. Failure to provide information, or providing false information, may result in account suspension or deletion.</p>
<p>The App is not intended for minors, and the Company does not knowingly collect information from minors.</p>

<h2>4. Registration Process and Information Accuracy</h2>
<p>To use certain features of the App, the User must create a profile by completing onboarding. This creates a guest account linked to the User's device. Optional sign-in via Apple, Google, or other providers may be offered in a future update.</p>
<p>The User declares that all details and information they provide to the Company, upon registration and during the use of the App, are true, accurate, complete, and up-to-date.</p>
<p>It is strictly prohibited to use false details, impersonate another person, open an account in the name of a third party without their consent, or use any means to conceal identity in a manner that misleads other users or the Company.</p>

<h2>5. Permitted Use and General Restrictions</h2>
<p>The User commits to using the App solely for personal and private purposes, and in accordance with applicable law, these Terms, the Privacy Policy, and the Community Guidelines.</p>
<p>It is prohibited to: use the App for commercial, advertising, or marketing purposes without prior written approval; use the App to commit or attempt to commit a criminal offense, harassment, stalking, invasion of privacy, or any other harm to users; gain unauthorized access to the Company's servers, attempt to bypass or disrupt security mechanisms; use the App via any automated means (such as bots or scripts) without the explicit written consent of the Company.</p>

<h2>6. Code of Conduct and Community Guidelines</h2>
<p>Use of the App is subject to the Community Guidelines, which form an integral part of these Terms. The Company may suspend or delete accounts that violate these guidelines, at its sole discretion and without prior notice.</p>
<p>Prohibited behavior includes: harassment, threats, stalking, repeated contact after being blocked; hate speech, racism, incitement; explicit sexual content (full nudity, pornography, explicit sexual acts); spam, scams, fake profiles, escort services; sharing other people's personal information (Doxxing); any content or attempt related to Child Sexual Abuse and Exploitation (CSAE).</p>

<h2>7. Intellectual Property Rights</h2>
<p>The User retains ownership of their User Content, but grants the Company a worldwide, non-exclusive, royalty-free license to transmit, display, and process the content for the purpose of operating the Service.</p>
<p>All rights to the App itself (the name "Gusha", logo, design, code, databases) belong exclusively to the Company.</p>
<p>Copyright Policy (DMCA): The Company respects intellectual property rights. If you believe that content on the App infringes your copyright, please contact our Copyright Agent at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>

<h2>8. Subscriptions and Payments</h2>
<p>Gusha is currently offered at no charge. All core features are available without payment.</p>
<p>The Company may introduce optional paid plans in a future version. If and when paid plans become available, they will be processed through Apple In-App Purchases and/or Google Play Billing, will renew automatically until canceled in your store account settings, and the Company cannot cancel a subscription on your behalf.</p>
<p>Refunds are handled according to Apple and Google policies.</p>

<h2>9. Limitation of Liability</h2>
<p>The Service is provided "AS IS" without warranties of any kind.</p>
<p>The Company is not responsible for real-life meetings between users, for any damages resulting from them, or for the behavior of other users. Any meeting is at the users' sole responsibility.</p>
<p>The total liability of the Company, if and to the extent determined, is limited to the amount of payments paid by the User in the three months preceding the event, or $100 – whichever is higher.</p>

<h2>10. Termination of Service and Account Deletion</h2>
<p>The Company may suspend or delete an account in any case of violation of terms, suspicion of illegal activity, demand by a competent authority, or for any other reasonable cause.</p>
<p>The User may delete their account at any time from within the App.</p>
<p>Deleting an account will result in the removal of the profile and content from display, and the deletion or anonymization of data within a limited timeframe.</p>

<h2>11. Governing Law and Jurisdiction</h2>
<p>The governing law is the law of the State of Israel. Exclusive jurisdiction in any matter related to the Service or these Terms is granted to the competent courts in Tel Aviv-Yafo.</p>
<p>US Users: Any dispute, claim, or controversy arising out of or relating to these Services shall be resolved exclusively by binding, individual arbitration. The User and the Company hereby waive the right to a jury trial and the right to participate in any class action lawsuit.</p>

<h2>12. General Provisions</h2>
<p>The Terms, together with the Privacy Policy, Community Guidelines, and Subscription Terms, constitute the entire agreement between you and the Company.</p>
<p>If any provision is found to be unenforceable, the remaining provisions will remain in effect.</p>
<p>The Hebrew version of these Terms is the binding version. Translations are provided for convenience only.</p>

<h2>13. Company Details</h2>
<p>TGBC.<br>Company Registration No.: 028871614<br>Address: Parlok 17 Tel Aviv, Israel<br>Privacy: <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a><br>Support: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br>Safety: <a href="mailto:${SAFETY_EMAIL}">${SAFETY_EMAIL}</a></p>
`);

// ── Privacy Policy ──

const PRIVACY_HTML = wrapHtml("Privacy Policy", "March 26, 2026", `
<h2>1. Information Collected</h2>
<p>We collect the following types of information:</p>
<p><strong>Personal Information:</strong> Display name, age, gender identity, interests, profile pictures, and other profile fields you choose to provide.</p>
<p><strong>Location Information:</strong> Approximate location, collected only when you manually check in to the Radar and grant location permission. You can check out at any time.</p>
<p><strong>Usage Information:</strong> Login times, profile views, messages, favorites, and in-app actions needed to operate the service.</p>
<p><strong>Device Information:</strong> IP address, device type, operating system, and crash reports.</p>
<p><strong>Payment Information:</strong> Not collected in the current free version of Gusha. If paid plans are introduced in a future version, purchases will be processed by Apple or Google; we will not receive your full payment card details.</p>
<p><strong>Purposes:</strong> Profile creation, service operation, matching, security, improving user experience, fraud prevention, legal compliance.</p>
<p><strong>Legal Basis for Processing (EU/UK Users):</strong> We process your data based on: (a) Performance of a contract with you; (b) Explicit consent (regarding sexual orientation, precise location, and advertising cookies); (c) Legitimate interest (for platform security, fraud prevention, and service improvement); (d) Legal obligation.</p>

<h2>2. Sensitive Information</h2>
<p><strong>Gender identity and profile preferences</strong> – Processed to operate your profile and discovery features, based on information you provide.</p>
<p><strong>Approximate location</strong> – Collected only when you manually check in to Radar and grant permission. Used to show approximate distance to nearby users who are also checked in.</p>
<p><strong>Photos (including in chats and disappearing photos)</strong> – Processed for transmission, anti-abuse, and CSAE; stored encrypted according to a limited retention policy.</p>

<h2>3. Storage and Security</h2>
<p>Information is stored on cloud servers in Europe and Israel.</p>
<p>Security measures include: TLS, encryption at rest, RBAC, monitoring, encrypted backups, restricted access procedures for sensitive information.</p>
<p><strong>Retention Periods:</strong></p>
<ul>
  <li>Profile: As long as the account is active + a short period after deletion.</li>
  <li>Messages: Up to 12 months.</li>
  <li>Technical logs: Up to 24 months.</li>
</ul>

<h2>4. Sharing with Third Parties</h2>
<p>Cloud providers, analytics, Push services – As data processors only, under a DPA.</p>
<p>Authorities – By judicial order, in investigations, and particularly in cases of CSAE/CSAM, as required by law.</p>
<p>There is no sharing for targeted advertising based on sexual orientation without explicit consent.</p>

<h2>5. User Rights</h2>
<p>Under Israeli Law (Amendment 13) and GDPR (if applicable), you are entitled to:</p>
<ul>
  <li><strong>Right of access</strong> – To receive a copy of your information.</li>
  <li><strong>Right to rectification</strong> – To update incorrect details.</li>
  <li><strong>Right to erasure</strong> – To delete the account and data, subject to exceptions.</li>
  <li><strong>Right to restriction of processing</strong> – To request freezing the use of certain information.</li>
  <li><strong>Right to data portability</strong> – To receive information in a structured format.</li>
  <li><strong>Right to object</strong> – To certain processing (e.g., advertising).</li>
  <li><strong>Right to withdraw consent</strong> – To revoke consent for processing.</li>
</ul>
<p>Exercise your rights by contacting <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a> or via the App (Settings → Delete Account).</p>

<h2>6. Data Transfer Outside Israel / EEA</h2>
<p>Information may be stored or processed in other countries (e.g., EU, USA). Transfers will be made in accordance with approved transfer mechanisms (such as SCCs), and in accordance with Amendment 13 requirements.</p>

<h2>7. Cookies and Tracking Technologies</h2>
<p>The App and website may use Cookies, SDKs, and pixels for:</p>
<ul>
  <li><strong>Essential</strong> – Basic operation.</li>
  <li><strong>Analytics</strong> – Measurement and improvement.</li>
  <li><strong>Advertising</strong> – Only subject to consent (and in iOS – ATT).</li>
</ul>
<p>The User can manage preferences through device and browser settings.</p>

<h2>8. Minors</h2>
<p>The Service is intended for ages 18+ only. We do not knowingly collect information about minors. If we become aware of a minor's account – the account will be deleted, and the information will be deleted as far as possible.</p>

<h2>9. Policy Changes</h2>
<p>We may update this policy from time to time. A material update will be published in the App, and continued use thereafter will be deemed as consent.</p>

<h2>10. Contact Us</h2>
<p>For questions or requests regarding this policy: <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a></p>

<h2>11. Privacy Rights for California and US Residents (CCPA/CPRA)</h2>
<p>If you are a resident of California or another applicable US state, you have specific rights regarding your personal information. The Company does not "sell" your personal information to third parties for monetary consideration. You have the right to request to know what information has been collected about you, to request its deletion, and to opt-out of the sharing of your information for advertising purposes ("Do Not Sell or Share My Personal Information") by contacting us at <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a> or via Settings in the App.</p>
`);

// ── Delete Account Page ──

const DELETE_ACCOUNT_HTML = wrapHtml("Delete Your Account", "March 26, 2026", `
<h2>How to Delete Your Gusha Account</h2>
<p>You can delete your Gusha account and all associated data directly from within the app. Follow these steps:</p>

<h3>Step 1: Open Settings</h3>
<p>Tap the <strong>Profile</strong> tab at the bottom of the screen, then tap the <strong>Settings</strong> gear icon in the top-right corner.</p>

<h3>Step 2: Go to Account</h3>
<p>Scroll down to the <strong>Account</strong> section and tap <strong>Delete Account</strong>.</p>

<h3>Step 3: Confirm Deletion</h3>
<p>You will be asked to type <strong>"DELETE"</strong> to confirm. This is a safety measure to prevent accidental deletion.</p>

<h3>Step 4: Account Deleted</h3>
<p>Once confirmed, your account and all associated data will be permanently deleted, including:</p>
<ul>
  <li>Your profile information (name, photos, bio, preferences)</li>
  <li>All messages and conversations</li>
  <li>Taps, favorites, and profile views</li>
  <li>Subscription information</li>
  <li>Push notification tokens</li>
  <li>Block and report history</li>
</ul>

<h2>Data Retention</h2>
<p>After account deletion, your data is removed from our active systems immediately. Some data may be retained in encrypted backups for up to 30 days before being permanently purged, as required for legal compliance and fraud prevention.</p>

<h2>Alternative: Contact Us</h2>
<p>If you are unable to access the app, you can request account deletion by emailing <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. We will process your request within 7 business days.</p>

<h2>Questions?</h2>
<p>For any questions about data deletion, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
`);

// ── Register Routes ──

export function registerLegalRoutes(app: Express) {
  // Serve on both root and /api/ paths for compatibility
  // Root paths work locally, /api/ paths work on deployed domain
  app.get("/privacy", (_req: Request, res: Response) => {
    res.type("html").send(PRIVACY_HTML);
  });
  app.get("/api/privacy", (_req: Request, res: Response) => {
    res.type("html").send(PRIVACY_HTML);
  });

  app.get("/terms", (_req: Request, res: Response) => {
    res.type("html").send(TERMS_HTML);
  });
  app.get("/api/terms", (_req: Request, res: Response) => {
    res.type("html").send(TERMS_HTML);
  });

  app.get("/delete-account", (_req: Request, res: Response) => {
    res.type("html").send(DELETE_ACCOUNT_HTML);
  });
  app.get("/api/delete-account", (_req: Request, res: Response) => {
    res.type("html").send(DELETE_ACCOUNT_HTML);
  });
}
