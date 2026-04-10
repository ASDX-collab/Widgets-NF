!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "ברוכים הבאים להתקנת ווידג'טים"
  !define MUI_WELCOMEPAGE_TEXT "אשף ההתקנה ידריך אותך בתהליך.$\r$\n$\r$\nמומלץ לסגור את כל היישומים הפתוחים לפני שתמשיך.$\r$\n$\r$\nהערה: ייתכן ש-Windows SmartScreen יציג אזהרה בעת ההתקנה.$\r$\nזו תוכנה בטוחה — לחצו על ״מידע נוסף״ ואז ״הפעל בכל זאת״.$\r$\n$\r$\nלחץ על הבא כדי להמשיך."
  !define MUI_DIRECTORYPAGE_TEXT_TOP "בחר את התיקייה שבה תותקן התוכנה:"
  !define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "ההתקנה הושלמה"
  !define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "ווידג'טים הותקן בהצלחה במחשב שלך."
  !define MUI_FINISHPAGE_TITLE "סיום התקנת ווידג'טים"
  !define MUI_FINISHPAGE_TEXT "ווידג'טים הותקן בהצלחה.$\r$\n$\r$\nלחץ על סיום כדי לצאת מאשף ההתקנה."
  !define MUI_FINISHPAGE_RUN_TEXT "הפעל את ווידג'טים"
  !define MUI_UNCONFIRMPAGE_TEXT_TOP "לחץ על הסר כדי להסיר את ווידג'טים מהמחשב."
  !define MUI_UNWELCOMEPAGE_TITLE "הסרת ווידג'טים"
  !define MUI_UNWELCOMEPAGE_TEXT "אשף זה יסיר את ווידג'טים מהמחשב שלך.$\r$\n$\r$\nלפני שתמשיך, ודא שווידג'טים סגור.$\r$\n$\r$\nלחץ על הבא כדי להמשיך."
!macroend

!macro customInit
  ; Set RTL mode for the installer
  !define MUI_LANGDLL_ALLLANGUAGES
!macroend

!macro customWelcomePage
  ; SmartScreen note is included in MUI_WELCOMEPAGE_TEXT above
!macroend
