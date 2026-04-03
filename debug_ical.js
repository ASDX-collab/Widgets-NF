const { https } = require('https');

function parseIcal(raw) {
  const events = [];
  const blocks = raw.split(/BEGIN:VEVENT/g).slice(1);
  const now = new Date();
  for (const block of blocks) {
    try {
      const get = (key) => {
        const m = block.match(new RegExp(`(?:${key}[^:]*):([^\\r\\n]+(?:\\r?\\n[ \\t][^\\r\\n]+)*)`, 'i'));
        if (!m) return '';
        return m[1].replace(/\\r?\\n[ \\t]/g, '').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
      };
      const parseDate = (s) => {
        if (!s) return null;
        const clean = s.replace(/^\\w+=\\w+:/, '');
        if (clean.length === 8) {
          return new Date(Date.UTC(+clean.slice(0,4), +clean.slice(4,6)-1, +clean.slice(6,8)));
        }
        return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T${clean.slice(9,11)}:${clean.slice(11,13)}:${clean.slice(13,15)}Z`);
      };
      const summary = get('SUMMARY');
      const dtstart = parseDate(get('DTSTART'));
      const dtend   = parseDate(get('DTEND'));
      const location = get('LOCATION');
      if (!summary || !dtstart || isNaN(dtstart)) {
        console.log('Skipping due to invalid start/summary:', {summary, dtstart});
        continue;
      }
      const diffDays = (dtstart - now) / 86400000;
      console.log('Event:', summary, 'Start:', dtstart.toISOString(), 'DiffDays:', diffDays);
      if (diffDays < -1 || diffDays > 60) continue;
      events.push({ summary, dtstart: dtstart.getTime(), dtend: dtend?.getTime() || null, location });
    } catch(e) { console.error('Block parse error:', e); }
  }
  return events;
}

// Sample Google-like iCal (often has TZID and no Z)
const sampleRaw = `
BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Asia/Jerusalem:20260327T100000
DTEND;TZID=Asia/Jerusalem:20260327T110000
RRULE:FREQ=WEEKLY;BYDAY=FR
SUMMARY:מבחן גוגל
LOCATION:מרכז העיר
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260328
DTEND;VALUE=DATE:20260329
SUMMARY:שבת שלום
END:VEVENT
END:VCALENDAR
`;

console.log('NOW:', new Date().toISOString());
const events = parseIcal(sampleRaw);
console.log('PARSED EVENTS:', events);
