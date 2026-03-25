# ווידג'טים — Widgets NF

ווידג'טים חכמים בסגנון Windows 11 לקהילה החרדית

[![Download](https://img.shields.io/github/v/release/ASDX-collab/Widgets-NF?label=הורדה&style=for-the-badge&color=0078d4)](https://github.com/ASDX-collab/Widgets-NF/releases/latest)
[![GitHub release](https://img.shields.io/github/downloads/ASDX-collab/Widgets-NF/total?style=for-the-badge&color=28a745)](https://github.com/ASDX-collab/Widgets-NF/releases)

## 🚀 התקנה

1. **[לחץ כאן להורדה](https://github.com/ASDX-collab/Widgets-NF/releases/latest)** — חפש את קובץ ה-`.exe` תחת Assets
2. הפעל את קובץ ההתקנה ופעל לפי ההוראות
3. האפליקציה תופיע בתפריט ההתחלה

## ✨ תכונות

- 📰 **חדשות חרדיות** — JDN, קורא, האמת, HM ועוד — 10 כותרות בכל פעם עם גלילה אינסופית
- 🌤️ **מזג אוויר** — עדכני לפי מיקום, מוצג גם בכפתור ההפעלה
- 🕐 **שעון** — שעה, תאריך עברי ולועזי
- 🕍 **זמני היום** — עלות השחר, הנץ, ק"ש, תפילה, חצות, שקיעה, צאת הכוכבים
- 📅 **לוח שנה עברי** — עם חגים ומועדים
- 📊 **מניות** — TA35, BTC, MSFT ועוד לפי בחירה
- 💱 **שערי מט"ח** — דולר, יורו, לירה שטרלינג ועוד
- 🎵 **מוזיקה יהודית** — סרטונים חדשים מ-YouTube
- 🌌 **תמונת היום של NASA**
- 📿 **ספירת העומר**, 📖 **פרשת השבוע**, 📚 **דף יומי**
- 🔢 **גימטריה**, ✅ **רשימת מטלות**, ⏱️ **שעון עצר**
- 📡 **RSS מותאם אישית** — הוסף את הפידים שלך
- 🌙 **מצב כהה/בהיר** — עוקב אוטומטית אחרי Windows
- ⚙️ **הגדרות מלאות** — גודל, מיקום, צבע, שקיפות ועוד

## 💻 דרישות מערכת

- Windows 10 / 11 (64-bit)
- חיבור לאינטרנט

## 🔄 שינויים בגרסה 1.5.0

- ✅ מצב כהה/בהיר אוטומטי לפי Windows
- ✅ טעינת 10 חדשות עם גלילה אינסופית
- ✅ כפתור סגירת כרטיס חדשות בודד
- ✅ כותרות ממוינות לפי תאריך
- ✅ סרטת עדכונים (Ticker) זורמת
- ✅ הגדרות כפתור מורחבות (גודל, מיקום, צבע, פינות)
- ✅ פיד RSS מותאם אישית
- ✅ הפעלה אוטומטית עם Windows
- ✅ שיפורי ביצועים משמעותיים (GPU, CPU, RAM)
- ✅ תיקון קריאת חדשות מ-kore.co.il

## 🛠️ פיתוח

```bash
npm install
npm start        # הפעלה לפיתוח
npm run build    # בנייה לקובץ התקנה
```

### טכנולוגיות
- [Electron](https://electronjs.org) — מסגרת האפליקציה
- [@hebcal/core](https://github.com/hebcal/hebcal-es6) — חישובי לוח עברי
- [rss-parser](https://github.com/rbren/rss-parser) — קריאת פידי RSS
- [Open-Meteo API](https://open-meteo.com) — מזג אוויר

### רישיון
© 2026 ASDX-collab · כל הזכויות שמורות.
השימוש מותר לשימוש אישי בלבד. אסורים: הפצה מחדש, שינוי, ושימוש מסחרי.
ראה קובץ [LICENSE](LICENSE) לפרטים מלאים.
