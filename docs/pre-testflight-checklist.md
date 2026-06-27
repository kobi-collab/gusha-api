# Pre-TestFlight Checklist — Gusha v1.0.2 (build 10015)

## סטטוס אוטומטי (הרץ: `node scripts/verify-production.mjs`)

| # | סעיף | סטטוס | הערות |
|---|------|--------|--------|
| 1 | שרת production + guest API | ⛔ **חסום** | `/api/auth/guest` לא קיים בפרודקשן — צריך **פריסה מחדש** ב-Manus |
| 2 | IAP ב-ASC | ⏳ ידני | התחבר ל-App Store Connect (ראה למטה) |
| 3 | מטא-דאטה (תיאור, צילומים) | ⏳ ידני | |
| 4 | Privacy URL + Nutrition Labels | ⏳ חלקי | URL: `https://lesbianradar-wzqiwps9.manus.space/privacy` — יתעדכן אחרי פריסה |
| 5 | App Review Notes | ✅ מוכן | `docs/app-review-notes.txt` |
| 6 | EAS build 10015 | ⏳ בתהליך | |
| 7 | TestFlight + בדיקה במכשיר | ⏳ אחרי build + פריסת שרת | |

---

## 1. פריסת שרת (חובה לפני TestFlight)

הפרודקשן הנוכחי (`https://lesbianradar-wzqiwps9.manus.space`) **לא מעודכן**:
- `POST /api/auth/guest` → 404
- Privacy Policy עדיין עם `office@tgbc.co.il`
- `/api/health` ללא בדיקת database

**פעולה:** פרסם מחדש את הפרויקט ב-**Manus** (או פלטפורמת האירוח שלך) מהקוד המקומי הנוכחי.

אחרי פריסה, הרץ:
```bash
node scripts/verify-production.mjs
```
כל 4 הבדיקות חייבות **PASS**.

---

## 2. App Store Connect — IAP

1. https://appstoreconnect.apple.com/apps/6760810869
2. **Features → In-App Purchases**
3. השבת / מחק כל מוצרי מנוי (Plus/Premium) — אין IAP ב-v1.0.2

---

## 3. App Store Connect — מטא-דאטה

**שם:** Gusha  
**תת-כותרת:** Meet people. Play icebreaker games.  
**תיאור (קצר):** Gusha is a free social app for adults 18+. Discover people nearby on Radar (manual check-in), chat, play games, and explore profiles. All features are free — no in-app purchases in v1.0.2.

**צילומי מסך:** ללא מילים "lesbian", "premium", או paywall.

**Age Rating:** 17+ (Mature / Frequent: Mature/Suggestive Themes, User Generated Content)

---

## 4. Privacy

**Privacy Policy URL (ב-ASC):**
```
https://lesbianradar-wzqiwps9.manus.space/privacy
```

**App Privacy (Nutrition Labels):**
| נתון | איסוף | שימוש |
|------|--------|--------|
| Precise Location | כן, מקושר למשתמש | App Functionality — רק בזמן Check-In ל-Radar |
| Photos | כן | פרופיל וצ'אט |
| User ID / Device ID | כן | חשבון guest + אבטחה |
| Purchases | **לא** | אין IAP בגרסה זו |
| Tracking | לא | |

---

## 5. App Review Notes

העתק מ-`docs/app-review-notes.txt` לשדה Notes ב-ASC לפני שליחה לביקורת (לא לפני TestFlight).

---

## 6–7. TestFlight — מה לבדוק במכשיר

לאחר build 10015 ב-TestFlight:

- [ ] Get Started → onboarding → נכנס לטאבים (לא Demo)
- [ ] Radar → Check In → מודל הסכמה → מאשר location
- [ ] Settings → Delete Account (אפשר לבטל לפני DELETE)
- [ ] Profile → אין "Coming Soon"
- [ ] אין מסך רכישה / paywall

**רק אחרי שכל זה עובר — מחליטים אם להגיש לביקורת.**
