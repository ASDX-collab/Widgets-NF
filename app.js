// ===== CITIES =====
const CITIES = {
  'jerusalem':   { name:'ירושלים',      lat:31.7683, lon:35.2137 },
  'tel-aviv':    { name:'תל אביב',       lat:32.0853, lon:34.7818 },
  'bnei-brak':   { name:'בני ברק',       lat:32.0833, lon:34.8333 },
  'haifa':       { name:'חיפה',          lat:32.7940, lon:34.9896 },
  'beersheba':   { name:'באר שבע',       lat:31.2516, lon:34.7914 },
  'ashdod':      { name:'אשדוד',         lat:31.8044, lon:34.6553 },
  'netanya':     { name:'נתניה',         lat:32.3215, lon:34.8532 },
  'rishon':      { name:'ראשון לציון',   lat:31.9730, lon:34.7925 },
  'petah-tikva': { name:'פתח תקווה',     lat:32.0869, lon:34.8858 },
  'modiin':      { name:'מודיעין',       lat:31.8969, lon:35.0103 },
  'elad':        { name:'אלעד',          lat:32.0500, lon:34.9667 },
  'beit-shemesh':{ name:'בית שמש',       lat:31.7469, lon:34.9889 },
  'modiin-ilit': { name:'מודיעין עלית',  lat:31.9167, lon:35.0667 },
  'tzfat':       { name:'צפת',           lat:32.9646, lon:35.4960 },
  'tiberias':    { name:'טבריה',         lat:32.7940, lon:35.5300 },
  'raanana':     { name:'רעננה',         lat:32.1844, lon:34.8706 },
};

const DEFAULTS = {
  theme:'default', // default/dracula/nord/solarized
  newsLayout:'list', city:'auto', tempUnit:'celsius',
  fontSize:'normal', panelWidth:460, blurPx:16, bgOpacity:88,
  accentColor:'#4db8ff', showWeather:true, showClock:true,
  showNews:true, showTicker:true, showZmanim:false, showShabbat:true,
  candleMins:18, refreshMin:5, launcherSide:'left',
  dualColumn:true, dualWidth:900, launcherBright:8,
  showCalculator:false, showTimer:false, showForex:false,
  showNotes:false, showWorldClock:false,
  // New widgets
  showCalendar:false, showMultiNotes:false, showStocks:false,
  showUVAir:false, showYTMusic:false,
  showOmer:false, showAlarm:false, showAPOD:false,
  showCrypto:false, showQuote:false,
  showParasha:false, showDafYomi:false, showDateConverter:false,
  showGematria:false, showTodo:false, showStopwatch:false,
  showDice:false, showIcal:false, showSysMonitor:false,
  showOref: false, orefSound: true, orefLocalOnly: false,
  launcherDraggable: false,
  launcherDraggedX: null, launcherDraggedY: null,
  // Config
  stockSymbols:'TA35.TA,BTC-USD,MSFT,AAPL',
  widgetOrder:[],
  // Launcher
  launcherWidth:140, launcherSize:'normal', launcherTrigger:'click', launcherColor:'default', launcherTextColor:'#ffffff',
  launcherVPos:'bottom', launcherOffsetX:8, launcherCorner:'rounded',
  launcherShowIcon:true, launcherShowCity:true, panelLocked:false,
  // Widget style
  widgetSize:'normal', widgetCorner:'rounded',
  // Custom RSS feeds [{url, category, label}]
  customFeeds:[],
  icalUrl: '', globalShortcut: 'CommandOrControl+W',
  blockedSources: [], // list of source names to hide
  blockedKeywords: [], // list of title fragments/tags to hide
  zmanimAlerts: {}, // { "sunrise": 10, "sunset": 15 } = minutes before
  omerFormat: 'letters', // 'letters' (גימטריה) or 'numbers'
  omerNusach: 'la', // 'la' (לעומר) or 'ba' (בעומר)
  alertSound: 'chime', // 'chime','bell','soft','urgent','silent'
};
let S = { ...DEFAULTS };
try { Object.assign(S, JSON.parse(localStorage.getItem('widget-settings') || '{}')); } catch {}
function saveSettings() { localStorage.setItem('widget-settings', JSON.stringify(S)); }

// ===== STATE =====
let geoLat=31.7683, geoLon=35.2137, geoCity='ירושלים';
let currentCat = 'news';
const newsCache = {};
let refreshTimer = null;
let searchQuery  = '';
let dark = true; // will be set from Windows system theme
let calDate = new Date();
let apodItems=[], apodIdx=0;
let alarmInterval=null, alarmTotal=0, alarmLeft=0;
let wcInterval = null;

const JEWISH_HOLIDAYS = {
  '8-21': 'ראש השנה', '8-22': 'ראש השנה', '8-30': 'יום כיפור',
  '9-5':  'סוכות',    '9-12': 'שמחת תורה', '2-14': 'פורים',
  '3-27': 'יום השואה','3-25': 'יום הזיכרון','3-26': 'יום העצמאות',
  '4-20': 'יום ירושלים','4-26':'שבועות',
};
const HEB_MONTHS_CAL = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const NOTE_COLORS = ['#ffd966','#7aff9a','#4db8ff','#e87fff','#ff9a4d','#ff6b6b'];
const OMER_ONES = ['','אחד','שניים','שלשה','ארבעה','חמשה','ששה','שבעה','שמונה','תשעה','עשרה'];
const OMER_TENS = ['','אחד עשר','שניים עשר','שלשה עשר','ארבעה עשר','חמשה עשר','ששה עשר','שבעה עשר','שמונה עשר','תשעה עשר','עשרים','אחד ועשרים','שניים ועשרים','שלשה ועשרים','ארבעה ועשרים','חמשה ועשרים','ששה ועשרים','שבעה ועשרים','שמונה ועשרים','תשעה ועשרים','שלשים','אחד ושלשים','שניים ושלשים','שלשה ושלשים','ארבעה ושלשים','חמשה ושלשים','ששה ושלשים','שבעה ושלשים','שמונה ושלשים','תשעה ושלשים','ארבעים','אחד וארבעים','שניים וארבעים','שלשה וארבעים','ארבעה וארבעים','חמשה וארבעים','ששה וארבעים','שבעה וארבעים','שמונה וארבעים','תשעה וארבעים'];
const CRYPTO_META = {
  bitcoin:  { name:'Bitcoin',  sym:'BTC', icon:'₿' },
  ethereum: { name:'Ethereum', sym:'ETH', icon:'Ξ' },
  solana:   { name:'Solana',   sym:'SOL', icon:'◎' },
  ripple:   { name:'XRP',      sym:'XRP', icon:'✕' },
};

// ===== HEBREW NUMERALS =====
function hebrewNumeral(n) {
  if (n <= 0 || n > 999) return String(n);
  const ones  = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens  = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hunds = ['','ק','ר','ש','ת','תק','תר','תש','תת','תתק'];
  let r = '';
  if (n >= 100) { r += hunds[Math.floor(n/100)]; n %= 100; }
  if (n === 15) { r += 'טו'; n = 0; }
  else if (n === 16) { r += 'טז'; n = 0; }
  else {
    if (n >= 10) { r += tens[Math.floor(n/10)]; n %= 10; }
    r += ones[n];
  }
  if (!r) return String(n);
  if (r.length === 1) return r + "'";
  return r.slice(0, -1) + '"' + r.slice(-1);
}

// Replaces Arabic digits in a Hebrew date string with Hebrew letters
function fixHebrewDate(str) {
  if (!str) return str;
  // Hebrew calendar years (5000–5999) → drop thousands, convert to Hebrew letters
  str = str.replace(/\b5(\d{3})\b/g, (_, rem) => hebrewNumeral(parseInt(rem)));
  // Day numbers (1–2 digits) → Hebrew letters
  return str.replace(/\b(\d{1,2})\b/g, (_, n) => hebrewNumeral(parseInt(n)));
}

// ===== INTERCEPT LINKS → BROWSER =====
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
  e.preventDefault(); e.stopPropagation();
  window.api.openExternal(href);
}, true);

// ===== APPLY SETTINGS =====
function applySettings() {
  document.body.className = `theme-${S.theme} font-${S.fontSize} ${S.widgetSize==='compact'?'widget-compact':''} ${S.widgetCorner==='square'?'widget-square':''}`;
  if (S.theme==='auto') applyTheme();
  document.body.classList.toggle('launcher-left', S.launcherSide === 'left');
  // Only apply light mode for default theme; named themes are inherently dark
  if (S.theme === 'default') document.body.classList.toggle('light', !dark);
  document.documentElement.style.setProperty('--blur-px',    S.blurPx + 'px');
  document.documentElement.style.setProperty('--bg-opacity', S.bgOpacity / 100);
  document.documentElement.style.setProperty('--accent',     S.accentColor);

  // Dual/single column
  const scroll = document.getElementById('mainScroll');
  scroll.classList.toggle('dual', S.dualColumn);
  // RTL layout: default row = right-to-left. news-left (order:1) pushes news to visual right (center when panel is on left).
  // Panel on LEFT → news should be on RIGHT (center) → add news-left
  // Panel on RIGHT → news stays on LEFT (center, RTL default) → no class
  scroll.classList.toggle('news-left', S.dualColumn && S.launcherSide === 'left');
  if (S.dualColumn) {
    document.documentElement.style.setProperty('--left-col-w', Math.min(S.dualWidth * 0.38, 440) + 'px');
    window.api.resizePanel(S.dualWidth);
    document.getElementById('widthRow').classList.add('hidden');
    document.getElementById('dualWidthRow').classList.remove('hidden');
  } else {
    window.api.resizePanel(S.panelWidth);
    document.getElementById('widthRow').classList.remove('hidden');
    document.getElementById('dualWidthRow').classList.add('hidden');
  }

  toggleWidgetVis('weatherWidget', S.showWeather);
  toggleWidgetVis('clockWidget',   S.showClock);
  toggleWidgetVis('newsWidget',    S.showNews);
  toggleWidgetVis('zmanimWidget',  S.showZmanim);
  document.getElementById('tickerWrap').classList.toggle('hidden', !S.showTicker);

  toggleWidgetVis('calcWidget',       S.showCalculator);
  toggleWidgetVis('timerWidget',      S.showTimer);
  toggleWidgetVis('forexWidget',      S.showForex);
  toggleWidgetVis('notesWidget',      S.showNotes);
  toggleWidgetVis('worldClockWidget', S.showWorldClock);

  // New widgets
  toggleWidgetVis('calendarWidget',  S.showCalendar);
  toggleWidgetVis('multiNotesWidget',S.showMultiNotes);
  toggleWidgetVis('stocksWidget',    S.showStocks);
  toggleWidgetVis('uvAirWidget',     S.showUVAir);
  toggleWidgetVis('ytMusicWidget',   S.showYTMusic);
  toggleWidgetVis('omerWidget',      S.showOmer);
  toggleWidgetVis('alarmWidget',     S.showAlarm);
  toggleWidgetVis('apodWidget',      S.showAPOD);
  toggleWidgetVis('cryptoWidget',    S.showCrypto);
  toggleWidgetVis('quoteWidget',      S.showQuote);
  toggleWidgetVis('parashaWidget',    S.showParasha);
  toggleWidgetVis('dafYomiWidget',    S.showDafYomi);
  toggleWidgetVis('dateConverterWidget', S.showDateConverter);
  toggleWidgetVis('gematriaWidget',   S.showGematria);
  toggleWidgetVis('todoWidget',       S.showTodo);
  toggleWidgetVis('stopwatchWidget',  S.showStopwatch);
  toggleWidgetVis('diceWidget',       S.showDice);
  toggleWidgetVis('orefWidget',       S.showOref);
  toggleWidgetVis('icalWidget',       S.showIcal);
  toggleWidgetVis('sysMonitorWidget', S.showSysMonitor);

  // Widget style
  document.body.classList.toggle('widget-compact', S.widgetSize === 'compact');
  document.body.classList.toggle('widget-square',  S.widgetCorner === 'square');

  window.api.setLauncherWidth(S.launcherWidth);
  window.api.setLauncherTrigger(S.launcherTrigger);
  window.api.setLauncherColor(S.launcherColor);
  window.api.setLauncherTextColor(S.launcherTextColor);
  window.api.setLauncherVPos(S.launcherVPos);
  window.api.setLauncherOffsetX(S.launcherOffsetX);
  window.api.setLauncherCorner(S.launcherCorner);
  window.api.setLauncherShowIcon(S.launcherShowIcon);
  window.api.setLauncherShowCity(S.launcherShowCity);
  window.api.setPanelLocked(S.panelLocked);

  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { newsCache[currentCat]=null; loadNews(currentCat); loadWeather(); }, S.refreshMin*60*1000);
}

function toggleWidgetVis(id, show) {
  document.getElementById(id)?.classList.toggle('hidden', !show);
}

const WIDGET_IDS_BY_SETTING = {
  showWeather: 'weatherWidget',
  showClock: 'clockWidget',
  showNews: 'newsWidget',
  showZmanim: 'zmanimWidget',
  showCalculator: 'calcWidget',
  showTimer: 'timerWidget',
  showForex: 'forexWidget',
  showNotes: 'notesWidget',
  showWorldClock: 'worldClockWidget',
  showCalendar: 'calendarWidget',
  showMultiNotes: 'multiNotesWidget',
  showStocks: 'stocksWidget',
  showUVAir: 'uvAirWidget',
  showYTMusic: 'ytMusicWidget',
  showOmer: 'omerWidget',
  showAlarm: 'alarmWidget',
  showAPOD: 'apodWidget',
  showCrypto: 'cryptoWidget',
  showQuote: 'quoteWidget',
  showParasha: 'parashaWidget',
  showDafYomi: 'dafYomiWidget',
  showDateConverter: 'dateConverterWidget',
  showGematria: 'gematriaWidget',
  showTodo: 'todoWidget',
  showStopwatch: 'stopwatchWidget',
  showDice: 'diceWidget',
  showOref: 'orefWidget',
  showIcal: 'icalWidget',
  showSysMonitor: 'sysMonitorWidget',
};

function revealEnabledWidget(settingId) {
  const widget = document.getElementById(WIDGET_IDS_BY_SETTING[settingId] || '');
  if (!widget) return;
  widget.querySelector('.widget-body')?.classList.remove('collapsed');
  widget.querySelector('.expand-btn')?.classList.add('expanded');
  widget.classList.remove('widget-added');
  void widget.offsetWidth;
  widget.classList.add('widget-added');
  requestAnimationFrame(() => {
    widget.scrollIntoView({ behavior:'smooth', block:'start', inline:'nearest' });
  });
  clearTimeout(widget._revealTimer);
  widget._revealTimer = setTimeout(() => widget.classList.remove('widget-added'), 1400);
}

function revealEnabledWidgetFromLibrary(settingId, sourceEl) {
  if (!sourceEl?.closest('#libraryPanel')) return;
  // Don't auto-close the library — let the user enable multiple widgets at once
}

// ===== WIDGET COLLAPSE =====
document.querySelectorAll('.widget-header').forEach(header => {
  header.addEventListener('click', e => {
    if (e.target.closest('.header-actions') || e.target.tagName === 'SELECT') return;
    const targetId = header.dataset.target;
    if (!targetId) return;
    const body = document.getElementById(targetId);
    const btn  = header.querySelector('.expand-btn');
    if (!body) return;
    body.classList.toggle('collapsed');
    btn?.classList.toggle('expanded', !body.classList.contains('collapsed'));
  });
});

// ===== THEME =====
function applyTheme() {
  document.body.classList.toggle('light', !dark);
  const moon = document.getElementById('iconMoon');
  const sun  = document.getElementById('iconSun');
  if (moon && sun) {
    moon.classList.toggle('hidden', !dark);
    sun.classList.toggle('hidden', dark);
  }
}

// Init from Windows system theme
(async () => {
  try { dark = await window.api.getNativeTheme(); } catch { dark = true; }
  applyTheme();
})();

// Follow system theme changes automatically
window.api.onSystemThemeChange(isDark => { dark = isDark; applyTheme(); });

// Manual toggle still works
document.getElementById('themeBtn').addEventListener('click', () => {
  dark = !dark;
  applyTheme();
});
document.getElementById('closeBtn').addEventListener('click', () => window.api.togglePanel());

// Drag persistence
window.api.onSaveLauncherDragPos((x, y) => {
  S.launcherDraggedX = x; S.launcherDraggedY = y;
  saveSettings();
});

// ===== CLOCK =====
const DAYS   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
function pad(n){ return String(n).padStart(2,'0'); }

let clockTimeout = null;
function tick(){
  const now = new Date();
  document.getElementById('clockTime').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('clockDate').textContent = `יום ${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  try {
    const hDate = now.toLocaleDateString('he-IL-u-ca-hebrew', {day:'numeric', month:'long', year:'numeric'});
    document.getElementById('clockHeb').textContent = fixHebrewDate(hDate);
  } catch {}
  if (!document.hidden) clockTimeout = setTimeout(tick, 1000);
}
tick();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Resume clock
    clearTimeout(clockTimeout);
    tick();
    // Resume ticker
    if (tickerRAF === null && tickerTextW > 0) animateTicker();
  } else {
    // Pause clock
    clearTimeout(clockTimeout);
    // Pause ticker
    if (tickerRAF !== null) { cancelAnimationFrame(tickerRAF); tickerRAF = null; }
  }
});

// ===== WEATHER =====
async function loadWeather() {
  let lat=geoLat, lon=geoLon, cityName=geoCity;
  if (S.city !== 'auto' && CITIES[S.city]) { const c=CITIES[S.city]; lat=c.lat; lon=c.lon; cityName=c.name; }
  document.getElementById('locationName').textContent = cityName;
  try {
    const w = await window.api.fetchWeather(lat, lon, S.tempUnit);
    if (!w || w.error) throw new Error(w?.error);
    const u = S.tempUnit==='fahrenheit' ? '°F' : '°';
    document.getElementById('wIcon').textContent  = w.icon;
    document.getElementById('wTemp').textContent  = `${w.temp}${u}`;
    document.getElementById('wDesc').textContent  = w.desc;
    document.getElementById('wHumid').textContent = w.humidity;
    document.getElementById('wFeels').textContent = `${w.feels_like}${u}`;
    document.getElementById('wWind').textContent  = w.wind;
    document.getElementById('forecast').innerHTML = (w.forecast||[]).map(d =>
      `<div class="fc-day"><div class="fc-name">${d.day}</div><div class="fc-icon">${d.icon}</div><div class="fc-max">${d.max}${u}</div><div class="fc-min">${d.min}${u}</div></div>`
    ).join('');
    // Update the always-visible launcher button weather
    window.api.sendLauncherWeather({ icon: w.icon, temp: w.temp, city: cityName });
  } catch { document.getElementById('wDesc').textContent = 'שגיאה בטעינה'; }
}

// ===== ZMANIM =====
const ZMANIM_LABELS = [
  {key:'alot',         label:'עלות השחר'},
  {key:'sunrise',      label:'הנץ החמה'},
  {key:'shmaMGA',      label:'ק"ש מג"א'},
  {key:'shmaGRA',      label:'ק"ש גר"א'},
  {key:'tefilaMGA',    label:'תפילה מג"א'},
  {key:'tefilaGRA',    label:'תפילה גר"א'},
  {key:'chatzot',      label:'חצות'},
  {key:'minchaGedola', label:'מנחה גדולה'},
  {key:'minchaKetana', label:'מנחה קטנה'},
  {key:'plagHaMincha', label:'פלג המנחה'},
  {key:'sunset',       label:'שקיעה'},
  {key:'tzeit',        label:'צאת הכוכבים'},
];

async function loadZmanim() {
  if (!S.showZmanim) return;
  const loading = document.getElementById('zmanimLoading');
  const grid    = document.getElementById('zmanimGrid');
  loading.classList.remove('hidden'); grid.innerHTML = '';

  let lat=geoLat, lon=geoLon;
  if (S.city!=='auto' && CITIES[S.city]) { lat=CITIES[S.city].lat; lon=CITIES[S.city].lon; }

  try {
    document.getElementById('zmanimDate').textContent =
      fixHebrewDate(new Date().toLocaleDateString('he-IL-u-ca-hebrew',{weekday:'short',day:'numeric',month:'long'}));
  } catch {}

  try {
    const z = await window.api.getZmanim(lat, lon, S.candleMins);
    if (z.error) throw new Error(z.error);
    loading.classList.add('hidden');

    const now = new Date();
    const nowMins = now.getHours()*60 + now.getMinutes();
    function timeMins(str) {
      if (!str || str==='—') return 9999;
      const [h,m] = str.split(':').map(Number); return h*60+m;
    }
    let nextKey=null, minDiff=Infinity;
    for (const {key} of ZMANIM_LABELS) {
      const tm = timeMins(z[key]);
      if (tm === 9999) continue;
      const diff = tm - nowMins;
      if (diff>0 && diff<minDiff) { minDiff=diff; nextKey=key; }
    }

    grid.innerHTML = ZMANIM_LABELS.map(({key,label}) => {
      const t = z[key]||'—';
      const passed = timeMins(t) < nowMins;
      const isNext = key === nextKey;
      const hasAlert = S.zmanimAlerts[key] != null;
      return `<div class="zmanim-row${passed?' passed':''}${isNext?' highlight':''}" data-zkey="${key}" data-ztime="${t}" data-zlabel="${label}">
        <span class="zmanim-name">${hasAlert?'<span class="zmanim-bell" title="התראה '+S.zmanimAlerts[key]+' דק׳ לפני">🔔</span>':''}${label}</span>
        <span class="zmanim-time">${t}</span>
      </div>`;
    }).join('');

    // Right-click context menu for zmanim alerts
    grid.querySelectorAll('.zmanim-row').forEach(row => {
      row.addEventListener('contextmenu', e => {
        e.preventDefault();
        const key = row.dataset.zkey;
        const time = row.dataset.ztime;
        const label = row.dataset.zlabel;
        if (!key || time === '—') return;
        showZmanimAlertMenu(e, key, label, time);
      });
    });

    // Schedule notifications for today
    scheduleZmanimAlerts(z);

    const shabbatBox = document.getElementById('shabbatBox');
    if (S.showShabbat && (z.dow===5||z.dow===6) && (z.candles||z.havdalah)) {
      shabbatBox.classList.remove('hidden');
      document.getElementById('shabbatTimes').innerHTML = [
        z.candles  && `<div class="shabbat-time-row"><span class="label">🕯️ כניסת שבת</span><span class="val">${z.candles.replace(/.*?(\d{1,2}:\d{2}).*/,'$1')}</span></div>`,
        z.havdalah && `<div class="shabbat-time-row"><span class="label">✨ מוצאי שבת</span><span class="val">${z.havdalah.replace(/.*?(\d{1,2}:\d{2}).*/,'$1')}</span></div>`,
      ].filter(Boolean).join('');
    } else { shabbatBox.classList.add('hidden'); }
  } catch(e) {
    loading.classList.add('hidden');
    grid.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px">שגיאה: ${e.message}</div>`;
  }
}

// ===== ALERT SOUNDS =====
const ALERT_SOUNDS = {
  chime:  { name:'צלצול',   fn(ctx){ const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(523,ctx.currentTime);o.frequency.setValueAtTime(659,ctx.currentTime+0.15);o.frequency.setValueAtTime(784,ctx.currentTime+0.3);g.gain.setValueAtTime(0.4,ctx.currentTime);g.gain.linearRampToValueAtTime(0.01,ctx.currentTime+1);o.start(ctx.currentTime);o.stop(ctx.currentTime+1);}},
  bell:   { name:'פעמון',   fn(ctx){ [0,0.25].forEach(t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(830,ctx.currentTime+t);g.gain.setValueAtTime(0.5,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+t+0.6);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.6);});}},
  soft:   { name:'עדין',    fn(ctx){ const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(440,ctx.currentTime);g.gain.setValueAtTime(0.2,ctx.currentTime);g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+0.3);g.gain.linearRampToValueAtTime(0.01,ctx.currentTime+1.5);o.start(ctx.currentTime);o.stop(ctx.currentTime+1.5);}},
  urgent: { name:'דחוף',    fn(ctx){ [0,0.15,0.3,0.45].forEach(t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(880,ctx.currentTime+t);g.gain.setValueAtTime(0.3,ctx.currentTime+t);g.gain.linearRampToValueAtTime(0.01,ctx.currentTime+t+0.1);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.12);});}},
  silent: { name:'שקט',     fn(){}},
};

function playAlertSound(soundId) {
  if (!soundId || soundId === 'silent') return;
  const s = ALERT_SOUNDS[soundId] || ALERT_SOUNDS.chime;
  try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); s.fn(ctx); } catch {}
}

// ===== ZMANIM ALERTS =====
let zmanimAlertTimers = [];

function showZmanimAlertMenu(e, key, label, timeStr) {
  // Remove existing menu
  document.getElementById('zmanimAlertMenu')?.remove();

  const existing = S.zmanimAlerts[key];
  const menu = document.createElement('div');
  menu.id = 'zmanimAlertMenu';
  menu.className = 'zmanim-alert-menu';
  menu.innerHTML = `
    <div class="zam-title">🔔 התראה עבור ${label} (${timeStr})</div>
    <div class="zam-options">
      ${[5,10,15,20,30].map(m => `<button class="zam-opt${existing===m?' active':''}" data-min="${m}">${m} דק׳ לפני</button>`).join('')}
    </div>
    ${existing != null ? '<button class="zam-remove">❌ הסר התראה</button>' : ''}
  `;

  // Position near click
  const panel = document.getElementById('panel');
  const panelRect = panel.getBoundingClientRect();
  menu.style.top = Math.min(e.clientY, panelRect.bottom - 160) + 'px';
  menu.style.right = (panelRect.right - e.clientX) + 'px';
  panel.appendChild(menu);

  menu.querySelectorAll('.zam-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      S.zmanimAlerts[key] = +btn.dataset.min;
      saveSettings();
      menu.remove();
      if (S.showZmanim) loadZmanim();
    });
  });
  menu.querySelector('.zam-remove')?.addEventListener('click', () => {
    delete S.zmanimAlerts[key];
    saveSettings();
    menu.remove();
    if (S.showZmanim) loadZmanim();
  });

  // Close on outside click
  setTimeout(() => {
    const close = e2 => { if (!menu.contains(e2.target)) { menu.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 0);
}

function scheduleZmanimAlerts(z) {
  // Clear previous timers
  zmanimAlertTimers.forEach(t => clearTimeout(t));
  zmanimAlertTimers = [];

  if (!Object.keys(S.zmanimAlerts).length) return;

  // Request notification permission
  if (Notification.permission === 'default') Notification.requestPermission();

  const now = new Date();
  const nowMs = now.getTime();

  for (const [key, minsBefore] of Object.entries(S.zmanimAlerts)) {
    const timeStr = z[key];
    if (!timeStr || timeStr === '—') continue;
    const [h, m] = timeStr.split(':').map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    const alertMs = target.getTime() - minsBefore * 60000;
    const delay = alertMs - nowMs;
    if (delay <= 0) continue; // already passed

    const label = ZMANIM_LABELS.find(l => l.key === key)?.label || key;
    const tid = setTimeout(() => {
      playAlertSound(S.alertSound);
      if (Notification.permission === 'granted') {
        new Notification(`🔔 ${label} בעוד ${minsBefore} דקות`, {
          body: `${label} ב-${timeStr}`,
          silent: true,
        });
      }
    }, delay);
    zmanimAlertTimers.push(tid);
  }
}

// ===== GEO =====
async function initGeo() {
  document.getElementById('locationName').textContent = 'מזהה מיקום...';
  try { const g=await window.api.getLocation(); geoLat=g.lat; geoLon=g.lon; geoCity=g.city||'אוטומטי'; }
  catch { geoLat=31.7683; geoLon=35.2137; geoCity='ירושלים'; }
  loadWeather();
  if (S.showZmanim) loadZmanim();
}
initGeo();

// ===== TICKER (JS-based, right→left) =====
let tickerX = 0;
let tickerTrackW = 0;
let tickerTextW = 0;
let tickerRAF = null;
const TICKER_SPEED = 1.0; // px per frame at 60fps ≈ 60px/s

function startTicker(text) {
  const inner = document.getElementById('tickerInner');
  const track = inner?.parentElement;
  if (!inner || !track) return;
  inner.textContent = text;
  // Wait for render to measure
  requestAnimationFrame(() => {
    tickerTrackW = track.offsetWidth;
    tickerTextW  = inner.scrollWidth;
    tickerX = tickerTrackW; // start from right edge so text immediately scrolls in
    if (tickerRAF) cancelAnimationFrame(tickerRAF);
    animateTicker();
  });
}

function animateTicker() {
  const inner = document.getElementById('tickerInner');
  if (!inner) return;
  tickerX += TICKER_SPEED;
  if (tickerX > tickerTrackW) tickerX = -tickerTextW; // loop: reset to left edge
  inner.style.transform = `translateX(${tickerX}px)`;
  tickerRAF = requestAnimationFrame(animateTicker);
}

// ===== NEWS =====
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
const CAT_ICON = { news:'📰', tech:'💻', economy:'💰', stocks:'📈', music:'🎵' };
const ogCache = {};
const dismissedLinks = new Set();
const newsDisplayCount = {};
// Prevent unbounded cache growth — clear every hour
setInterval(() => {
  const keys = Object.keys(ogCache);
  if (keys.length > 200) keys.forEach(k => delete ogCache[k]);
  Object.keys(newsCache).forEach(k => delete newsCache[k]);
}, 60 * 60 * 1000);
const NEWS_PAGE_SIZE = 10;
let loadMoreObserver = null;

function buildItem(item, i, extraClass='') {
  const icon  = CAT_ICON[currentCat]||'📰';
  const imgEl = item.image
    ? `<img class="news-thumb" src="${esc(item.image)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=news-placeholder>${icon}</div>'">`
    : `<div class="news-placeholder news-ph-load" data-link="${esc(item.link)}">${icon}</div>`;
  return `<div class="news-item-wrap">
    <a class="news-item${extraClass}" href="${esc(item.link)}" style="animation-delay:${i*0.04}s">
      ${imgEl}
      <div class="news-body">
        <div class="news-src">${esc(item.source)}</div>
        <div class="news-title">${esc(item.title)}</div>
        <div class="news-date">${esc(item.date)}</div>
      </div>
    </a>
    <div class="news-actions">
      <button class="news-dismiss-btn" data-link="${esc(item.link)}" title="סמן כנקרא"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <button class="news-block-btn" data-src="${esc(item.source)}" data-title="${esc(item.title)}" title="אל תציג יותר"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg></button>
    </div>
  </div>`;
}

function renderNews(items) {
  const list = document.getElementById('newsList');
  list.className = 'news-list layout-' + S.newsLayout;
  const q = searchQuery.trim().toLowerCase();
  
  // Filtering logic: 1. Dismissed (session) 2. Blocked Source 3. Blocked Keyword
  const filtered = (q ? items.filter(i=>i.title.toLowerCase().includes(q)||i.source.toLowerCase().includes(q)) : items)
    .filter(i => !dismissedLinks.has(i.link))
    .filter(i => !S.blockedSources.includes(i.source))
    .filter(i => !S.blockedKeywords.some(kw => i.title.toLowerCase().includes(kw.toLowerCase())));
  if (!filtered.length) {
    list.innerHTML = `<div class="no-results">${q?`🔍 אין תוצאות עבור "${esc(q)}"` : 'אין פריטים'}</div>`;
    return;
  }
  const count = newsDisplayCount[currentCat] || NEWS_PAGE_SIZE;
  const visible = filtered.slice(0, count);
  const hasMore = filtered.length > count;
  if (S.newsLayout === 'magazine') {
    list.innerHTML = visible.map((it,i) => buildItem(it, i, i===0?' hero':'')).join('');
  } else {
    list.innerHTML = visible.map((it,i) => buildItem(it, i)).join('');
  }
  if (hasMore) {
    list.innerHTML += `<div class="news-load-more" id="newsLoadMore">טוען עוד...</div>`;
    setupLoadMoreObserver(items);
  } else if (loadMoreObserver) {
    loadMoreObserver.disconnect(); loadMoreObserver = null;
  }
  // Eagerly load og:images for items without images
  fillMissingImages(visible);
  
  // Attach dismiss/block events
  list.querySelectorAll('.news-dismiss-btn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    dismissedLinks.add(btn.dataset.link);
    renderNews(items);
  }));
  list.querySelectorAll('.news-block-btn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    const src = btn.dataset.src;
    // const title = btn.dataset.title;
    if (!S.blockedSources.includes(src)) S.blockedSources.push(src);
    saveSettings();
    renderNews(items);
  }));
}

function setupLoadMoreObserver(items) {
  if (loadMoreObserver) loadMoreObserver.disconnect();
  const el = document.getElementById('newsLoadMore');
  if (!el) return;
  loadMoreObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      newsDisplayCount[currentCat] = (newsDisplayCount[currentCat] || NEWS_PAGE_SIZE) + NEWS_PAGE_SIZE;
      renderNews(items);
    }
  }, { threshold: 0.1 });
  loadMoreObserver.observe(el);
}

async function fillMissingImages(items) {
  // For music: always try og:image (skip pixelated thumbnails)
  // For others: only fill where image is missing
  const needOg = items.filter(it => !it.image || currentCat === 'music').slice(0, 5);
  for (const item of needOg) {
    if (!item.link) continue;
    const cacheKey = currentCat + '|' + item.link;
    if (ogCache[cacheKey] !== undefined) {
      if (ogCache[cacheKey] && ogCache[cacheKey] !== item.image) {
        item.image = ogCache[cacheKey];
        replaceThumb(item);
      }
      continue;
    }
    try {
      const img = await window.api.fetchOgImage(item.link);
      ogCache[cacheKey] = img;
      if (img) { item.image = img; replaceThumb(item); }
    } catch { ogCache[cacheKey] = ''; }
  }
}

function replaceThumb(item) {
  const icon = CAT_ICON[currentCat]||'📰';
  const el = document.querySelector(`.news-ph-load[data-link="${CSS.escape(item.link)}"]`);
  if (!el) {
    // Update existing <img> if already rendered
    const imgs = document.querySelectorAll('.news-thumb');
    for (const img of imgs) {
      const a = img.closest('a');
      if (a && a.getAttribute('href') === item.link && (!img.src || img.naturalWidth===0)) {
        img.src = item.image;
      }
    }
    return;
  }
  const img = document.createElement('img');
  img.className = 'news-thumb';
  img.src = item.image;
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => { img.outerHTML = `<div class="news-placeholder">${icon}</div>`; };
  el.replaceWith(img);
}

function updateMeta(items, loadedAt) {
  const t = loadedAt.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('newsMetaRow').textContent = `${items.length} פריטים · עודכן ${t}`;
}

async function loadNews(cat) {
  searchQuery = '';
  newsDisplayCount[cat] = NEWS_PAGE_SIZE; // reset pagination
  const srch = document.getElementById('newsSearch');
  if (srch) { srch.value=''; document.getElementById('searchClear').classList.remove('visible'); }
  document.getElementById('newsList').innerHTML='';
  document.getElementById('newsMetaRow').textContent='';
  document.getElementById('loading').classList.remove('hidden');

  if (newsCache[cat]) {
    document.getElementById('loading').classList.add('hidden');
    renderNews(newsCache[cat].items);
    updateMeta(newsCache[cat].items, newsCache[cat].loadedAt);
    return;
  }
  try {
    const extraUrls = (S.customFeeds || []).filter(f => f.category === cat).map(f => f.url);
    const items = await window.api.fetchFeed(cat, extraUrls);
    const loadedAt = new Date();
    newsCache[cat] = { items, loadedAt };
    document.getElementById('loading').classList.add('hidden');
    renderNews(items);
    updateMeta(items, loadedAt);
    // badge
    document.querySelectorAll('.tab').forEach(btn => {
      if (btn.dataset.cat!==cat) return;
      btn.querySelector('.tab-badge')?.remove();
      if (items.length) { const b=document.createElement('span'); b.className='tab-badge'; b.textContent=items.length; btn.appendChild(b); }
    });
    if (cat==='news') startTicker(items.slice(0,10).map(i=>i.title).join('  •  '));
  } catch {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('newsList').innerHTML='<div class="no-results">שגיאה בטעינה</div>';
  }
}

// ===== TABS =====
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    loadNews(currentCat);
  });
});

// ===== SEARCH =====
const newsSearch  = document.getElementById('newsSearch');
const searchClear = document.getElementById('searchClear');
newsSearch.addEventListener('input', e => {
  searchQuery = e.target.value;
  searchClear.classList.toggle('visible', searchQuery.length>0);
  if (newsCache[currentCat]) renderNews(newsCache[currentCat].items);
});
searchClear.addEventListener('click', () => {
  newsSearch.value=''; searchQuery='';
  searchClear.classList.remove('visible'); newsSearch.focus();
  if (newsCache[currentCat]) renderNews(newsCache[currentCat].items);
});

// ===== REFRESH =====
document.getElementById('refreshBtn').addEventListener('click', () => {
  newsCache[currentCat]=null; loadNews(currentCat); loadWeather();
  if (S.showZmanim) loadZmanim();
  const b=document.getElementById('refreshBtn');
  b.style.transition='transform 0.5s'; b.style.transform='rotate(360deg)';
  setTimeout(()=>{b.style.transform='';b.style.transition='';},500);
});

// ===== SETTINGS & LIBRARY PANELS =====
const settingsPanel = document.getElementById('settingsPanel');
const libraryPanel = document.getElementById('libraryPanel');
document.getElementById('settingsBtn').addEventListener('click', () => settingsPanel.classList.add('open'));
document.getElementById('closeSettings').addEventListener('click', () => settingsPanel.classList.remove('open'));
document.getElementById('libraryBtn').addEventListener('click', () => libraryPanel.classList.add('open'));
document.getElementById('closeLibrary').addEventListener('click', () => {
  libraryPanel.classList.remove('open');
  // Scroll to the first visible (recently enabled) widget that isn't already in view
  const firstNew = [...document.querySelectorAll('#leftCol > .widget:not(.hidden)')].pop();
  if (firstNew) setTimeout(() => firstNew.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);
});

document.querySelectorAll('#libraryPanel .s-row').forEach(row => {
  const input = row.querySelector('.toggle input[type="checkbox"]');
  if (!input) return;
  row.classList.add('clickable-toggle-row');
  row.addEventListener('click', e => {
    if (e.target.closest('input, .toggle, .track, button, a, select, textarea')) return;
    input.click();
  });
});

document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    if (settingsPanel.classList.contains('open')) settingsPanel.classList.remove('open');
    else if (libraryPanel.classList.contains('open')) libraryPanel.classList.remove('open');
    else window.api.togglePanel();
  }
});

function syncSettingsUI() {
  document.getElementById('citySelect').value       = S.city;
  document.getElementById('blurSlider').value       = S.blurPx;
  document.getElementById('blurVal').textContent    = S.blurPx;
  document.getElementById('opacitySlider').value    = S.bgOpacity;
  document.getElementById('opacityVal').textContent = S.bgOpacity;
  document.getElementById('refreshInterval').value  = S.refreshMin;
  document.getElementById('candleMins').value       = S.candleMins;
  document.getElementById('dualWidthSlider').value  = S.dualWidth;
  document.getElementById('dualWidthVal').textContent = S.dualWidth;
  document.getElementById('launcherBrightSlider').value = S.launcherBright;
  document.getElementById('launcherBrightVal').textContent = S.launcherBright;
  const icalIn = document.getElementById('icalUrlInput'); if (icalIn) icalIn.value = S.icalUrl || '';
  const gsIn = document.getElementById('globalShortcutInput'); if (gsIn) gsIn.value = S.globalShortcut || '';
  document.getElementById('showIcal').checked       = S.showIcal;
  document.getElementById('showSysMonitor').checked = S.showSysMonitor;
  if (S.stockSymbols) document.getElementById('stockSymbolsInput').value = S.stockSymbols;
  document.getElementById('showWeather').checked  = S.showWeather;
  document.getElementById('showClock').checked    = S.showClock;
  document.getElementById('showNews').checked     = S.showNews;
  document.getElementById('showTicker').checked   = S.showTicker;
  document.getElementById('showZmanim').checked   = S.showZmanim;
  document.getElementById('showShabbat').checked  = S.showShabbat;

  document.getElementById('libWeather').checked   = S.showWeather;
  document.getElementById('libClock').checked     = S.showClock;
  document.getElementById('libNews').checked      = S.showNews;
  document.getElementById('libZmanim').checked    = S.showZmanim;
  document.getElementById('showCalculator').checked= S.showCalculator;
  document.getElementById('showTimer').checked    = S.showTimer;
  document.getElementById('showForex').checked    = S.showForex;
  document.getElementById('showNotes').checked    = S.showNotes;
  document.getElementById('showWorldClock').checked= S.showWorldClock;
  document.getElementById('showCalendar').checked  = S.showCalendar;
  document.getElementById('showMultiNotes').checked= S.showMultiNotes;
  document.getElementById('showStocks').checked    = S.showStocks;
  document.getElementById('showUVAir').checked     = S.showUVAir;
  document.getElementById('showYTMusic').checked   = S.showYTMusic;
  document.getElementById('showOmer').checked      = S.showOmer;
  document.getElementById('showAlarm').checked     = S.showAlarm;
  document.getElementById('showAPOD').checked      = S.showAPOD;
  document.getElementById('showCrypto').checked    = S.showCrypto;
  document.getElementById('showQuote').checked     = S.showQuote;
  document.getElementById('showParasha').checked    = S.showParasha;
  document.getElementById('showDafYomi').checked    = S.showDafYomi;
  document.getElementById('showDateConverter').checked = S.showDateConverter;
  document.getElementById('showGematria').checked   = S.showGematria;
  document.getElementById('showTodo').checked       = S.showTodo;
  document.getElementById('showStopwatch').checked  = S.showStopwatch;
  document.getElementById('showDice').checked       = S.showDice;
  document.getElementById('showOref').checked       = S.showOref;
  document.getElementById('orefSound').checked      = S.orefSound;
  document.getElementById('orefLocalOnly').checked  = S.orefLocalOnly;
  document.getElementById('launcherDraggable').checked = S.launcherDraggable;
  document.querySelectorAll('[data-layout]').forEach(b  => b.classList.toggle('active', b.dataset.layout  ===S.newsLayout));
  document.querySelectorAll('[data-fontsize]').forEach(b=> b.classList.toggle('active', b.dataset.fontsize===S.fontSize));
  document.querySelectorAll('[data-width]').forEach(b   => b.classList.toggle('active', +b.dataset.width  ===S.panelWidth));
  document.querySelectorAll('[data-unit]').forEach(b    => b.classList.toggle('active', b.dataset.unit    ===S.tempUnit));
  document.querySelectorAll('[data-side]').forEach(b    => b.classList.toggle('active', b.dataset.side    ===S.launcherSide));
  document.querySelectorAll('[data-columns]').forEach(b => b.classList.toggle('active', (b.dataset.columns==='dual')===S.dualColumn));
  document.querySelectorAll('.color-dot').forEach(b     => b.classList.toggle('active', b.dataset.color   ===S.accentColor));
  document.getElementById('lockPanel').checked = S.panelLocked;
  const lwSlider = document.getElementById('launcherWidthSlider');
  if (lwSlider) { lwSlider.value = S.launcherWidth; document.getElementById('launcherWidthVal').textContent = S.launcherWidth; }
  document.querySelectorAll('[data-ltrigger]').forEach(b => b.classList.toggle('active', b.dataset.ltrigger === S.launcherTrigger));
  document.querySelectorAll('.lcolor-dot').forEach(b  => b.classList.toggle('active', b.dataset.lcolor === S.launcherColor));
  document.querySelectorAll('.ltxt-dot').forEach(b    => b.classList.toggle('active', b.dataset.ltxt   === S.launcherTextColor));
  document.querySelectorAll('[data-lvpos]').forEach(b => b.classList.toggle('active', b.dataset.lvpos  === S.launcherVPos));
  document.querySelectorAll('[data-lcorner]').forEach(b => b.classList.toggle('active', b.dataset.lcorner === S.launcherCorner));
  const oxSlider = document.getElementById('launcherOffsetXSlider');
  if (oxSlider) { oxSlider.value = S.launcherOffsetX; document.getElementById('launcherOffsetXVal').textContent = S.launcherOffsetX; }
  document.getElementById('launcherShowIcon').checked = S.launcherShowIcon;
  document.getElementById('launcherShowCity').checked = S.launcherShowCity;
}

// Settings wiring
document.getElementById('citySelect').addEventListener('change', e => {
  S.city = e.target.value;
  saveSettings();
  loadWeather();
  if (S.showZmanim) loadZmanim();
});

document.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-unit]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.tempUnit = b.dataset.unit;
  saveSettings();
  loadWeather();
}));

document.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-layout]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.newsLayout = b.dataset.layout;
  saveSettings();
  if (newsCache[currentCat]) renderNews(newsCache[currentCat].items);
}));

document.querySelectorAll('[data-fontsize]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-fontsize]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.fontSize = b.dataset.fontsize;
  saveSettings();
  applySettings();
}));

document.querySelectorAll('[data-width]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-width]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.panelWidth = +b.dataset.width;
  saveSettings();
  if (!S.dualColumn) window.api.resizePanel(S.panelWidth);
}));

document.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-side]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.launcherSide = b.dataset.side;
  saveSettings();
  window.api.setLauncherSide(S.launcherSide);
  applySettings();
}));

document.querySelectorAll('[data-columns]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-columns]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.dualColumn = (b.dataset.columns === 'dual');
  saveSettings();
  applySettings();
}));

document.getElementById('blurSlider').addEventListener('input', e => {
  S.blurPx = +e.target.value;
  document.getElementById('blurVal').textContent = S.blurPx;
  document.documentElement.style.setProperty('--blur-px', S.blurPx + 'px');
  saveSettings();
});

document.getElementById('opacitySlider').addEventListener('input', e => {
  S.bgOpacity = +e.target.value;
  document.getElementById('opacityVal').textContent = S.bgOpacity;
  document.documentElement.style.setProperty('--bg-opacity', S.bgOpacity / 100);
  saveSettings();
});

document.getElementById('dualWidthSlider').addEventListener('input', e => {
  S.dualWidth = +e.target.value;
  document.getElementById('dualWidthVal').textContent = S.dualWidth;
  if (S.dualColumn) applySettings();
  saveSettings();
});

document.getElementById('launcherBrightSlider').addEventListener('input', e => {
  S.launcherBright = +e.target.value;
  document.getElementById('launcherBrightVal').textContent = S.launcherBright;
  window.api.setLauncherOpacity(S.launcherBright / 100);
  saveSettings();
});

document.querySelectorAll('.color-dot').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.color-dot').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  S.accentColor = b.dataset.color;
  saveSettings();
  document.documentElement.style.setProperty('--accent', S.accentColor);
}));

['showWeather', 'showClock', 'showNews'].forEach(id =>
  document.getElementById(id).addEventListener('change', e => {
    S[id] = e.target.checked;
    document.getElementById(id.replace('show', 'lib')).checked = e.target.checked;
    saveSettings();
    applySettings();
  })
);

document.getElementById('showTicker').addEventListener('change', e => {
  S.showTicker = e.target.checked;
  saveSettings();
  applySettings();
});

document.getElementById('showZmanim').addEventListener('change', e => {
  S.showZmanim = e.target.checked;
  document.getElementById('libZmanim').checked = e.target.checked;
  saveSettings();
  applySettings();
  if (S.showZmanim) loadZmanim();
});

document.getElementById('showShabbat').addEventListener('change', e => {
  S.showShabbat = e.target.checked;
  saveSettings();
  if (S.showZmanim) loadZmanim();
});

document.getElementById('candleMins').addEventListener('change', e => {
  S.candleMins = +e.target.value;
  saveSettings();
  if (S.showZmanim) loadZmanim();
});

document.getElementById('refreshInterval').addEventListener('change', e => {
  S.refreshMin = +e.target.value;
  saveSettings();
  applySettings();
});

['showCalculator', 'showTimer', 'showForex', 'showNotes', 'showWorldClock'].forEach(id =>
  document.getElementById(id).addEventListener('change', e => {
    S[id] = e.target.checked;
    saveSettings();
    applySettings();
    if (e.target.checked) revealEnabledWidgetFromLibrary(id, e.target);
    if (id === 'showForex' && S.showForex) loadForex();
    if (id === 'showWorldClock' && S.showWorldClock) startWorldClock();
  })
);

['libWeather', 'libClock', 'libNews', 'libZmanim'].forEach(id =>
  document.getElementById(id).addEventListener('change', e => {
    const rid = id.replace('lib', 'show');
    S[rid] = e.target.checked;
    const rEl = document.getElementById(rid);
    if (rEl) rEl.checked = e.target.checked;
    saveSettings();
    applySettings();
    if (e.target.checked) revealEnabledWidgetFromLibrary(rid, e.target);
    if (rid === 'showZmanim' && S.showZmanim) loadZmanim();
  })
);

// ===== NEW WIDGETS LOGIC =====

// Calculator
let calcExpr = '';
const calcDisplay = document.getElementById('calcDisplay');
document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const c = e.target.dataset.c;
    if (c === 'C') { calcExpr = ''; calcDisplay.textContent = '0'; return; }
    if (c === '=') {
      try {
        const res = Function('"use strict";return (' + calcExpr + ')')();
        calcExpr = String(Number.isInteger(res) ? res : res.toFixed(4));
        calcDisplay.textContent = calcExpr;
      } catch { calcDisplay.textContent = 'שגיאה'; calcExpr = ''; }
      return;
    }
    if (c === '+-') {
      // Negate only the last number in the expression
      const m = calcExpr.match(/^(.*[+\-*/])(-?)(\d*\.?\d+)$/);
      if (m) {
        calcExpr = m[1] + (m[2] ? '' : '-') + m[3];
      } else if (calcExpr) {
        calcExpr = calcExpr.startsWith('-') ? calcExpr.substring(1) : '-' + calcExpr;
      }
      calcDisplay.textContent = calcExpr.replace(/\*/g,'×').replace(/\//g,'÷') || '0';
      return;
    }
    if (c === '*' || c === '/' || c === '+' || c === '-') {
      if (calcExpr !== '' && !'*/+-'.includes(calcExpr.slice(-1))) calcExpr += c;
    } else {
      calcExpr += c;
    }
    calcDisplay.textContent = calcExpr.replace(/\*/g,'×').replace(/\//g,'÷') || '0';
  });
});

// Timer
let timerSecs = 0, timerInterval = null;
const tDisplay = document.getElementById('timerDisplay');
function updateTimerDisp() {
  const h = Math.floor(timerSecs/3600), m = Math.floor((timerSecs%3600)/60), s = timerSecs%60;
  tDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}
document.getElementById('timerStart').addEventListener('click', () => {
  if (!timerInterval) timerInterval = setInterval(() => { timerSecs++; updateTimerDisp(); }, 1000);
});
document.getElementById('timerPause').addEventListener('click', () => { clearInterval(timerInterval); timerInterval = null; });
document.getElementById('timerReset').addEventListener('click', () => { clearInterval(timerInterval); timerInterval = null; timerSecs = 0; updateTimerDisp(); });

// Forex
const FOREX_FLAGS = { USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵', CHF:'🇨🇭' };
async function loadForex() {
  if (!S.showForex) return;
  const loading = document.getElementById('forexLoading');
  const list = document.getElementById('forexList');
  loading.classList.remove('hidden'); list.innerHTML = '';
  try {
    const data = await window.api.fetchForex();
    if (data.error || !data.ils) throw new Error(data.error || 'API Error');
    const ils = data.ils;
    loading.classList.add('hidden');
    list.innerHTML = ['USD','EUR','GBP','JPY','CHF'].map(c => {
      const rateStr = c.toLowerCase();
      if (!ils[rateStr]) return '';
      const val = 1 / ils[rateStr];
      return `<div class="forex-row">
        <div class="forex-currency"><span class="forex-flag">${FOREX_FLAGS[c]}</span> ${c}</div>
        <div class="forex-rate">₪${val.toFixed(3)}</div>
      </div>`;
    }).join('');
  } catch (e) {
    loading.classList.add('hidden');
    list.innerHTML = `<div class="no-results" style="font-size:12px;color:var(--tx3)">שגיאה בטעינת שערי מט"ח</div>`;
  }
}

// Notes
const notesArea = document.getElementById('notesArea');
try { notesArea.value = localStorage.getItem('widget-notes') || ''; } catch {}
notesArea.addEventListener('input', () => {
  try { localStorage.setItem('widget-notes', notesArea.value); } catch {}
});

// World Clock
function updateWorldClock() {
  const d = new Date();
  const ny = document.getElementById('wcNY');
  const lon = document.getElementById('wcLon');
  const tok = document.getElementById('wcTok');
  if (ny) ny.textContent = d.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false});
  if (lon) lon.textContent = d.toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false});
  if (tok) tok.textContent = d.toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false});
}
function startWorldClock() {
  if (wcInterval) clearInterval(wcInterval);
  updateWorldClock();
  wcInterval = setInterval(updateWorldClock, 1000);
}

// ===== CUSTOM RSS FEEDS =====
const CAT_LABELS = { news:'חדשות', tech:'טק', economy:'כלכלה', stocks:'שוק', music:'מוזיקה' };

function renderCustomFeeds() {
  const list = document.getElementById('customFeedList');
  if (!list) return;
  if (!S.customFeeds.length) { list.innerHTML = ''; return; }
  list.innerHTML = S.customFeeds.map((f, i) => {
    const domain = (() => { try { return new URL(f.url).hostname.replace(/^www\./,''); } catch { return f.url; } })();
    return `<div class="custom-feed-item" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--tx2)">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.url}">${domain}</span>
      <span style="color:var(--tx3);font-size:11px;flex-shrink:0">${CAT_LABELS[f.category]||f.category}</span>
      <button data-idx="${i}" class="custom-feed-remove" style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:14px;padding:0 2px;line-height:1">✕</button>
    </div>`;
  }).join('');
}

document.getElementById('addCustomFeedBtn').addEventListener('click', () => {
  const urlEl = document.getElementById('customFeedUrl');
  const catEl = document.getElementById('customFeedCat');
  const url = urlEl.value.trim();
  if (!url || !url.startsWith('http')) return;
  if (S.customFeeds.some(f => f.url === url)) { urlEl.value=''; return; }
  S.customFeeds = [...S.customFeeds, { url, category: catEl.value }];
  saveSettings();
  newsCache[catEl.value] = null; // invalidate cache for that category
  urlEl.value = '';
  renderCustomFeeds();
});

document.getElementById('customFeedList').addEventListener('click', e => {
  const btn = e.target.closest('.custom-feed-remove');
  if (!btn) return;
  const idx = +btn.dataset.idx;
  const removed = S.customFeeds[idx];
  S.customFeeds = S.customFeeds.filter((_,i) => i !== idx);
  saveSettings();
  if (removed) newsCache[removed.category] = null;
  renderCustomFeeds();
});

// ===== OREF ALERTS =====
let orefInterval = null;
let lastOrefId = null;
let lastShownNotifId = null;
async function loadOref() {
  if (!S.showOref) {
    if (orefInterval) { clearInterval(orefInterval); orefInterval=null; }
    return;
  }
  if (!orefInterval) orefInterval = setInterval(fetchOrefData, 4000);
  fetchOrefData();
}

async function fetchOrefData() {
  const bd = document.getElementById('orefBody');
  if (!bd || !S.showOref) return;
  try {
    const d = await window.api.fetchOref();
    if (!d || !d.data || d.data.length === 0) {
       bd.innerHTML = '<div style="color:var(--tx2);font-size:12px;text-align:center;padding:10px">אין התרעות פעילות ברחבי הארץ</div>';
       return;
    }
    let cities = d.data;
    if (S.orefLocalOnly && S.city !== 'auto' && CITIES[S.city]) {
       const cityName = CITIES[S.city].name;
       if (!cities.includes(cityName)) {
         bd.innerHTML = `<div style="color:var(--tx2);font-size:12px;text-align:center;padding:10px">אין התרעות פעילות ב${cityName}</div>`;
         return;
       }
       cities = [cityName];
    }
    
    if (S.orefSound && d.id !== lastOrefId && d.cat !== "10") {
      playAlertSound('urgent');
    }
    lastOrefId = d.id;

    const isEnd = d.cat === "10";

    // Save to history (only real alerts, not "event ended")
    if (!isEnd && d.id !== lastShownNotifId) {
      let hist = [];
      try { hist = JSON.parse(localStorage.getItem('oref-history') || '[]'); } catch {}
      const entry = { id: d.id, title: d.title, desc: d.desc, cities: cities.slice(0,8), time: Date.now() };
      hist = [entry, ...hist.filter(h => h.id !== d.id)].slice(0, 20);
      try { localStorage.setItem('oref-history', JSON.stringify(hist)); } catch {}
      renderOrefHistory();
    }

    // Web Notification when panel may be hidden
    if (S.orefSound && d.id !== lastShownNotifId && !isEnd) {
      lastShownNotifId = d.id;
      if (Notification.permission === 'granted') {
        new Notification('🚨 ' + d.title, { body: cities.slice(0, 5).join(', '), silent: true });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('🚨 ' + d.title, { body: cities.slice(0, 5).join(', '), silent: true });
        });
      }
    }
    bd.innerHTML = `<div class="oref-alert ${isEnd ? 'end' : 'active'}">
         <div class="oref-title">${esc(d.title)}</div>
         <div class="oref-desc">${esc(d.desc)}</div>
         <div class="oref-cities">${cities.map(c => `<span>${esc(c)}</span>`).join('')}</div>
      </div>`;
  } catch (e) {
    bd.innerHTML = '<div class="no-results" style="font-size:12px">שגיאה בתקשורת לשירות</div>';
  }
}

function renderOrefHistory() {
  const list = document.getElementById('orefHistoryList');
  if (!list) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('oref-history') || '[]'); } catch {}
  if (!hist.length) {
    list.innerHTML = '<div style="color:var(--tx3);font-size:12px;padding:6px 0;text-align:center">אין התרעות שמורות</div>';
    return;
  }
  list.innerHTML = hist.map(h => {
    const t = new Date(h.time).toLocaleString('he-IL', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });
    return `<div style="padding:6px 0; border-bottom:1px solid var(--border); font-size:12px">
      <div style="font-weight:600; color:#ff6b6b">${esc(h.title)}</div>
      <div style="color:var(--tx3); font-size:10px">${t}</div>
      <div style="color:var(--tx2); margin-top:2px">${h.cities.map(c=>esc(c)).join(', ')}</div>
    </div>`;
  }).join('');
}

// Oref history button toggle
document.getElementById('orefHistoryBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  const histBody = document.getElementById('orefHistoryBody');
  if (!histBody) return;
  const isOpen = !histBody.classList.contains('hidden');
  histBody.classList.toggle('hidden', isOpen);
  if (!isOpen) renderOrefHistory();
});

document.getElementById('clearOrefHistory')?.addEventListener('click', () => {
  localStorage.removeItem('oref-history');
  renderOrefHistory();
});

renderOrefHistory();

// ===== INIT =====
let sysMonitorInterval = null; // must be declared before startSysMonitor() call below
applySettings();
syncSettingsUI();
renderCustomFeeds();
window.api.setLauncherSide(S.launcherSide);
window.api.setLauncherOpacity(S.launcherBright / 100);
window.api.setLauncherTextColor(S.launcherTextColor);
if (window.api.setLauncherDraggable) window.api.setLauncherDraggable(S.launcherDraggable);

// Persist dragged launcher position (listener already registered above)
// Restore saved drag position on startup
if (S.launcherDraggable && S.launcherDraggedX !== null && S.launcherDraggedY !== null) {
  window.api.restoreLauncherDragPos(S.launcherDraggedX, S.launcherDraggedY);
}

loadNews('news');
if (S.showZmanim)      loadZmanim();
if (S.showForex)       loadForex();
if (S.showWorldClock)  startWorldClock();
if (S.showCalendar)    renderCalendar();
if (S.showMultiNotes)  renderNotes();
if (S.showStocks)      loadStocks();
if (S.showUVAir)       loadUvAir();
if (S.showYTMusic)     loadYtMusic();
if (S.showOmer)        loadOmer();
if (S.showAPOD)        loadApod();
if (S.showCrypto)      loadCrypto();
if (S.showQuote)       loadQuote();
if (S.showParasha)     loadParasha();
if (S.showDafYomi)     loadDafYomi();
if (S.showTodo)        renderTodo();
if (S.showOref)        loadOref();
if (S.showIcal)        loadIcal();
if (S.showSysMonitor)  startSysMonitor();

// Global Shortcut startup
if (S.globalShortcut && window.api.setGlobalShortcut) window.api.setGlobalShortcut(S.globalShortcut);

// ===== NEW WIDGETS LOGIC & FETCHERS =====
// System Monitor (variable hoisted above init to avoid TDZ error)
async function updateSysMonitor() {
  if (!S.showSysMonitor) return;
  const stats = await window.api.getSystemStats();
  if (!stats || stats.error) return;
  document.getElementById('cpuVal').textContent = stats.cpuPct + '%';
  document.getElementById('cpuFill').style.width = stats.cpuPct + '%';
  document.getElementById('ramVal').textContent = stats.ramPct + '%';
  document.getElementById('ramFill').style.width = stats.ramPct + '%';
  document.getElementById('ramText').textContent = `(${stats.ramGb} / ${stats.totalGb} GB)`;
}
function startSysMonitor() {
  if (sysMonitorInterval) clearInterval(sysMonitorInterval);
  updateSysMonitor();
  sysMonitorInterval = setInterval(updateSysMonitor, 3000);
}

// iCal Events
async function loadIcal() {
  if (!S.showIcal) return;
  const list = document.getElementById('icalList');
  const loading = document.getElementById('icalLoading');
  if (!S.icalUrl) {
    loading.classList.add('hidden');
    list.innerHTML = '<div class="no-results" style="padding:10px">הגדר קישור iCal בהגדרות כדי לראות אירועים.</div>';
    return;
  }
  loading.classList.remove('hidden'); list.innerHTML = '';
  try {
    const data = await window.api.fetchIcal(S.icalUrl);
    loading.classList.add('hidden');
    if (data.error || !data.events || !data.events.length) {
      list.innerHTML = `<div class="no-results" style="padding:10px">${data.error || 'אין אירועים קרובים'}</div>`;
      return;
    }
    const now = Date.now();
    const todayStr = new Date().toLocaleDateString('he-IL');
    const tomorrowStr = new Date(now + 86400000).toLocaleDateString('he-IL');
    
    list.innerHTML = data.events.map(ev => {
      const d = new Date(ev.dtstart);
      const dStr = d.toLocaleDateString('he-IL');
      const tStr = (d.getHours()===0 && d.getMinutes()===0) ? 'כל היום' : d.toLocaleTimeString('he-IL', {hour:'2-digit',minute:'2-digit'});
      const relDay = dStr === todayStr ? 'היום' : (dStr === tomorrowStr ? 'מחר' : dStr);
      return `<div class="ical-item" style="padding:8px 10px; border-bottom:1px solid var(--border); display:flex; flex-direction:column; gap:2px">
        <div style="font-weight:600; font-size:13px; color:var(--tx1)">${esc(ev.summary)}</div>
        <div style="font-size:11px; color:var(--tx2); display:flex; justify-content:space-between">
          <span>${relDay} · ${tStr}</span>
          <span>${esc(ev.location) || ''}</span>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    loading.classList.add('hidden');
    list.innerHTML = '<div class="no-results" style="padding:10px">שגיאה בטעינת לוח שנה</div>';
  }
}

// Updates
document.getElementById('checkUpdateBtn')?.addEventListener('click', async (e) => {
  const btn = e.target;
  const textEl = document.getElementById('versionText');
  const oldText = btn.textContent;
  btn.textContent = 'בודק...'; btn.disabled = true;
  try {
    const res = await window.api.checkForUpdate();
    if (res.hasUpdate) {
      textEl.innerHTML = `<span style="color:#ff6b6b">יש עדכון! (${res.latest})</span>`;
      btn.textContent = 'הורד עדכון';
      btn.onclick = () => window.api.openExternal('https://github.com/haredi-widgets/releases/latest');
    } else {
      textEl.textContent = `מעודכן (v${res.current})`;
      btn.textContent = 'מעודכן ✔';
    }
  } catch {
    textEl.textContent = 'שגיאה בבדיקה'; btn.textContent = oldText;
  }
  btn.disabled = false;
});

// ===== NEW WIDGET SETTINGS LISTENERS =====
const NEW_WIDGET_IDS = ['showCalendar','showMultiNotes','showStocks',
  'showUVAir','showYTMusic','showOmer','showAlarm','showAPOD','showCrypto','showQuote',
  'showParasha','showDafYomi','showDateConverter','showGematria','showTodo',
  'showStopwatch','showDice','showOref','showIcal','showSysMonitor'];

NEW_WIDGET_IDS.forEach(id => {
  document.getElementById(id)?.addEventListener('change', e => {
    S[id] = e.target.checked;
    saveSettings(); applySettings();
    if (e.target.checked) revealEnabledWidgetFromLibrary(id, e.target);
    if (id==='showCalendar'   && S.showCalendar)   renderCalendar();
    if (id==='showMultiNotes' && S.showMultiNotes) renderNotes();
    if (id==='showStocks'     && S.showStocks)     loadStocks();
    if (id==='showUVAir'      && S.showUVAir)      loadUvAir();
    if (id==='showYTMusic'    && S.showYTMusic)    loadYtMusic();
    if (id==='showOmer'       && S.showOmer)       loadOmer();
    if (id==='showAPOD'       && S.showAPOD)       loadApod();
    if (id==='showCrypto'        && S.showCrypto)        loadCrypto();
    if (id==='showQuote'         && S.showQuote)         loadQuote();
    if (id==='showParasha'       && S.showParasha)       loadParasha();
    if (id==='showDafYomi'       && S.showDafYomi)       loadDafYomi();
    if (id==='showTodo'          && S.showTodo)          renderTodo();
    if (id==='showOref'          && S.showOref)          loadOref();
    if (id==='showSysMonitor'    && S.showSysMonitor)    startSysMonitor();
    if (id==='showIcal'          && S.showIcal)          loadIcal();
  });
});

['orefSound', 'orefLocalOnly', 'launcherDraggable'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', e => {
    S[id] = e.target.checked; saveSettings();
    if (id === 'launcherDraggable' && window.api.setLauncherDraggable) window.api.setLauncherDraggable(S.launcherDraggable);
    if (id.startsWith('oref') && S.showOref) loadOref();
  });
});

document.getElementById('icalUrlInput')?.addEventListener('change', e => {
  S.icalUrl = e.target.value.trim(); saveSettings();
  if (S.showIcal) loadIcal();
});
document.getElementById('globalShortcutInput')?.addEventListener('change', e => {
  S.globalShortcut = e.target.value.trim(); saveSettings();
  if (window.api.setGlobalShortcut) window.api.setGlobalShortcut(S.globalShortcut);
});

// Widget style buttons
document.querySelectorAll('[data-wsize]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-wsize]').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.widgetSize = b.dataset.wsize; saveSettings(); applySettings();
}));
document.querySelectorAll('[data-wcorner]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-wcorner]').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.widgetCorner = b.dataset.wcorner; saveSettings(); applySettings();
}));
document.querySelectorAll('[data-theme]').forEach(b => {
  if (b.dataset.theme === S.theme) b.classList.add('active');
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-theme]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); S.theme = b.dataset.theme; saveSettings(); applySettings();
  });
});

// Alert sound buttons
document.querySelectorAll('[data-asound]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-asound]').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.alertSound = b.dataset.asound; saveSettings();
  playAlertSound(S.alertSound); // preview
}));

// Lock panel
document.getElementById('lockPanel')?.addEventListener('change', e => {
  S.panelLocked = e.target.checked;
  saveSettings();
  window.api.setPanelLocked(S.panelLocked);
});

// Start with Windows
(async () => {
  const el = document.getElementById('startWithWindows');
  if (!el) return;
  el.checked = await window.api.getLoginItem();
  el.addEventListener('change', e => window.api.setLoginItem(e.target.checked));
})();


// Launcher width slider
document.getElementById('launcherWidthSlider')?.addEventListener('input', e => {
  S.launcherWidth = +e.target.value;
  document.getElementById('launcherWidthVal').textContent = S.launcherWidth;
  saveSettings();
  window.api.setLauncherWidth(S.launcherWidth);
});

// Launcher trigger
document.querySelectorAll('[data-ltrigger]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-ltrigger]').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.launcherTrigger = b.dataset.ltrigger; saveSettings();
  window.api.setLauncherTrigger(S.launcherTrigger);
}));

// Launcher color
document.querySelectorAll('.lcolor-dot').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.lcolor-dot').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.launcherColor = b.dataset.lcolor; saveSettings();
  window.api.setLauncherColor(S.launcherColor);
}));

// Launcher text color
document.querySelectorAll('.ltxt-dot').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.ltxt-dot').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.launcherTextColor = b.dataset.ltxt; saveSettings();
  window.api.setLauncherTextColor(S.launcherTextColor);
}));

// Launcher vertical position
document.querySelectorAll('[data-lvpos]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-lvpos]').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.launcherVPos = b.dataset.lvpos; saveSettings();
  window.api.setLauncherVPos(S.launcherVPos);
}));

// Launcher horizontal offset
document.getElementById('launcherOffsetXSlider')?.addEventListener('input', e => {
  S.launcherOffsetX = +e.target.value;
  document.getElementById('launcherOffsetXVal').textContent = S.launcherOffsetX;
  saveSettings();
  window.api.setLauncherOffsetX(S.launcherOffsetX);
});

// Launcher corner
document.querySelectorAll('[data-lcorner]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-lcorner]').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); S.launcherCorner = b.dataset.lcorner; saveSettings();
  window.api.setLauncherCorner(S.launcherCorner);
}));

// Launcher show icon / city
document.getElementById('launcherShowIcon')?.addEventListener('change', e => {
  S.launcherShowIcon = e.target.checked; saveSettings();
  window.api.setLauncherShowIcon(S.launcherShowIcon);
});
document.getElementById('launcherShowCity')?.addEventListener('change', e => {
  S.launcherShowCity = e.target.checked; saveSettings();
  window.api.setLauncherShowCity(S.launcherShowCity);
});

// Stock symbols input
document.getElementById('stockSymbolsInput')?.addEventListener('change', e => {
  S.stockSymbols = e.target.value.trim(); saveSettings(); if (S.showStocks) loadStocks();
});


// ===== CALENDAR =====
// Keys: Gregorian month (0-indexed, 0=January) + day

async function renderCalendar() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const first = new Date(y, m, 1).getDay(); // 0=Sun
  const days = new Date(y, m+1, 0).getDate();
  const today = new Date();
  // Fetch Hebrew day numbers + month names via @hebcal/core
  let hebDays = null, hebMonths = '', hebHolidays = {};
  try {
    const res = await window.api.getHebrewMonth(y, m + 1);
    if (res) { hebDays = res.days; hebMonths = res.hebrewMonths; hebHolidays = res.holidays || {}; }
  } catch {}
  document.getElementById('calMonthYear').textContent =
    `${HEB_MONTHS_CAL[m]} ${y}${hebMonths ? ' · ' + hebMonths : ''}`;

  let html = '';
  for (let i = 0; i < first; i++) html += '<span class="cal-empty"></span>';
  for (let d = 1; d <= days; d++) {
    const isToday = d===today.getDate() && m===today.getMonth() && y===today.getFullYear();
    const isSat = new Date(y,m,d).getDay() === 6;
    const holiday = hebHolidays[d] || '';
    const hDay = hebDays ? hebrewNumeral(hebDays[d - 1]) : '';
    html += `<span class="cal-day${isToday?' today':''}${isSat?' shabbat':''}${holiday?' holiday':''}" title="${holiday}">${d}<span class="cal-heb-sub">${hDay}</span>${holiday?'<sup>✦</sup>':''}</span>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}
document.getElementById('calPrev')?.addEventListener('click', e => { e.stopPropagation(); calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
document.getElementById('calNext')?.addEventListener('click', e => { e.stopPropagation(); calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });

// ===== MULTI-NOTES =====
function loadNotesData() { try { return JSON.parse(localStorage.getItem('widget-multi-notes')||'[]'); } catch { return []; } }
function saveNotesData(arr) { try { localStorage.setItem('widget-multi-notes', JSON.stringify(arr)); } catch {} }
function renderNotes() {
  const notes = loadNotesData();
  const list = document.getElementById('notesList');
  if (!list) return;
  list.innerHTML = notes.map((n,i) => `
    <div class="mnote" style="--nc:${NOTE_COLORS[n.color||0]}">
      <div class="mnote-top">
        <div class="mnote-colors">${NOTE_COLORS.map((c,ci)=>`<button class="mnote-color-dot${ci===n.color?' active':''}" data-ni="${i}" data-ci="${ci}" style="background:${c}"></button>`).join('')}</div>
        <button class="mnote-del" data-ni="${i}">✕</button>
      </div>
      <textarea class="mnote-area" data-ni="${i}" placeholder="הקלד כאן...">${esc(n.text||'')}</textarea>
    </div>`).join('');
  list.querySelectorAll('.mnote-area').forEach(ta => ta.addEventListener('input', e => {
    const notes2 = loadNotesData(); notes2[+e.target.dataset.ni].text = e.target.value; saveNotesData(notes2);
  }));
  list.querySelectorAll('.mnote-del').forEach(btn => btn.addEventListener('click', e => {
    const notes2 = loadNotesData(); notes2.splice(+btn.dataset.ni,1); saveNotesData(notes2); renderNotes();
  }));
  list.querySelectorAll('.mnote-color-dot').forEach(dot => dot.addEventListener('click', e => {
    const notes2 = loadNotesData(); notes2[+dot.dataset.ni].color = +dot.dataset.ci; saveNotesData(notes2); renderNotes();
  }));
}
document.getElementById('noteAddBtn')?.addEventListener('click', () => {
  const notes = loadNotesData(); notes.push({text:'',color:Math.floor(Math.random()*6)}); saveNotesData(notes); renderNotes();
});

// ===== STOCKS =====
function sparkline(closes) {
  if (!closes?.length || closes.length < 2) return '';
  const mn = Math.min(...closes), mx = Math.max(...closes), rng = mx-mn||1;
  const w=80, h=28, pts = closes.map((v,i) => `${Math.round(i/(closes.length-1)*(w-2)+1)},${Math.round((1-(v-mn)/rng)*(h-4)+2)}`).join(' ');
  const color = closes[closes.length-1] >= closes[0] ? '#7aff9a' : '#ff6b6b';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}
async function loadStocks() {
  const loading = document.getElementById('stocksLoading');
  const list = document.getElementById('stocksList');
  if (!loading||!list) return;
  loading.classList.remove('hidden'); list.innerHTML = '';
  try {
    const stocks = await window.api.fetchStocks(S.stockSymbols);
    loading.classList.add('hidden');
    if (stocks?.error) { list.innerHTML=`<div class="no-results" style="font-size:12px">שגיאה: ${esc(stocks.error)}</div>`; return; }
    if (!stocks?.length) { list.innerHTML='<div class="no-results" style="font-size:12px">לא נמצאו נתונים</div>'; return; }
    list.innerHTML = stocks.map(s => {
      const up = s.changePct >= 0;
      const fmt = n => Math.abs(n) >= 1000 ? n.toLocaleString('he-IL',{maximumFractionDigits:0}) : n.toFixed(2);
      return `<div class="stock-row">
        <div class="stock-meta"><div class="stock-sym">${esc(s.symbol)}</div><div class="stock-name">${esc(s.name)}</div></div>
        <div class="stock-chart">${sparkline(s.closes)}</div>
        <div class="stock-price-wrap">
          <div class="stock-price">${fmt(s.price)} <span class="stock-cur">${esc(s.currency)}</span></div>
          <div class="stock-change ${up?'up':'dn'}">${up?'▲':'▼'} ${Math.abs(s.changePct).toFixed(2)}%</div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('stocksTime').textContent = new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
  } catch { loading.classList.add('hidden'); list.innerHTML='<div class="no-results" style="font-size:12px">שגיאה בטעינה</div>'; }
}

// ===== UV + AIR QUALITY =====
function uvLabel(v) {
  if (v<=2) return ['נמוך','#7aff9a'];
  if (v<=5) return ['בינוני','#ffd966'];
  if (v<=7) return ['גבוה','#ff9a4d'];
  if (v<=10) return ['גבוה מאוד','#ff6b6b'];
  return ['קיצוני','#e87fff'];
}
function aqiLabel(v) {
  if (v<=50)  return ['טוב','#7aff9a'];
  if (v<=100) return ['סביר','#ffd966'];
  if (v<=150) return ['לא בריא לרגישים','#ff9a4d'];
  if (v<=200) return ['לא בריא','#ff6b6b'];
  return ['מסוכן','#e87fff'];
}
async function loadUvAir() {
  const loading = document.getElementById('uvAirLoading');
  const grid = document.getElementById('uvAirGrid');
  if (!loading||!grid) return;
  loading.classList.remove('hidden'); grid.innerHTML = '';
  let lat=geoLat, lon=geoLon;
  if (S.city!=='auto'&&CITIES[S.city]) { lat=CITIES[S.city].lat; lon=CITIES[S.city].lon; }
  try {
    const d = await window.api.fetchUvAir(lat, lon);
    loading.classList.add('hidden');
    if (d?.error) throw new Error(d.error);
    const cur = d.current||{};
    const uv = cur.uv_index||0, aqi = cur.us_aqi||0;
    const [uvLbl, uvClr] = uvLabel(uv);
    const [aqiLbl, aqiClr] = aqiLabel(aqi);
    grid.innerHTML = `
      <div class="uv-card"><div class="uv-val" style="color:${uvClr}">${uv.toFixed(1)}</div><div class="uv-lbl">UV – ${uvLbl}</div></div>
      <div class="uv-card"><div class="uv-val" style="color:${aqiClr}">${aqi}</div><div class="uv-lbl">AQI – ${aqiLbl}</div></div>
      ${cur.pm2_5!=null?`<div class="uv-pill">PM2.5: ${cur.pm2_5.toFixed(1)}</div>`:''}
      ${cur.pm10!=null?`<div class="uv-pill">PM10: ${cur.pm10.toFixed(1)}</div>`:''}`;
  } catch { loading.classList.add('hidden'); grid.innerHTML='<div class="no-results" style="font-size:12px">שגיאה בטעינה</div>'; }
}

// ===== YOUTUBE MUSIC =====
async function loadYtMusic() {
  const loading = document.getElementById('ytmLoading');
  const list = document.getElementById('ytmList');
  if (!loading||!list) return;
  loading.classList.remove('hidden'); list.innerHTML = '';
  try {
    const items = await window.api.fetchYtMusic();
    loading.classList.add('hidden');
    if (items?.error || !Array.isArray(items) || !items.length) {
      list.innerHTML='<div class="no-results" style="font-size:12px">לא נמצאו פריטים</div>'; return;
    }
    list.innerHTML = items.map((it,i) => `
      <a class="ytm-item" href="${esc(it.link)}" style="animation-delay:${i*0.04}s">
        ${it.thumb ? `<img class="ytm-thumb" src="${esc(it.thumb)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="ytm-thumb-ph">🎵</div>'}
        <div class="ytm-body">
          <div class="ytm-title">${esc(it.title)}</div>
          <div class="ytm-ch">${esc(it.channel)}</div>
        </div>
      </a>`).join('');
  } catch { loading.classList.add('hidden'); list.innerHTML='<div class="no-results" style="font-size:12px">שגיאה בטעינה</div>'; }
}

// ===== OMER COUNT =====
function omerNum(n) {
  if (S.omerFormat === 'letters') return hebrewNumeral(n);
  return String(n);
}
function omerText(day) {
  if (day<1||day>49) return '';
  const suffix = S.omerNusach === 'ba' ? 'בעומר' : 'לעומר';
  const weeks=Math.floor(day/7), days=day%7;
  let txt = `היום ${omerNum(day)} יום`;
  if (weeks>0&&days>0) txt+=`, שהם ${omerNum(weeks)} שבוע${weeks>1?'ות':''} ו${omerNum(days)} ימים`;
  else if (weeks>0) txt+=`, שהם ${omerNum(weeks)} שבוע${weeks>1?'ות':''}`;
  return txt+' '+suffix;
}
async function loadOmer() {
  const disp=document.getElementById('omerDisplay'), heb=document.getElementById('omerHebrew'), wks=document.getElementById('omerWeeks');
  if (!disp) return;
  try {
    const o = await window.api.getOmer();
    if (!o.inOmer) { disp.textContent='לא בתקופת העומר'; heb.textContent=''; wks.textContent=''; return; }
    disp.textContent = `יום ${omerNum(o.day)} מתוך ${omerNum(49)}`;
    heb.textContent = omerText(o.day);
    const left = 49-o.day;
    wks.textContent = left>0 ? `נותרו ${left} ימים לשבועות` : '🎉 חג שבועות שמח!';
  } catch { disp.textContent='שגיאה'; }
}

// Omer settings popup
document.getElementById('omerGearBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('omerSettingsPopup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'omerSettingsPopup';
  popup.className = 'mini-settings-popup';
  popup.innerHTML = `
    <div class="msp-header"><span class="msp-title">הגדרות ספירה</span><button class="msp-close">✕</button></div>
    <div class="msp-row"><span>תצוגה:</span><div class="btn-group btn-group-sm">
      <button class="bg-btn${S.omerFormat==='letters'?' active':''}" data-omer-fmt="letters">אותיות</button>
      <button class="bg-btn${S.omerFormat==='numbers'?' active':''}" data-omer-fmt="numbers">מספרים</button>
    </div></div>
    <div class="msp-row"><span>נוסח:</span><div class="btn-group btn-group-sm">
      <button class="bg-btn${S.omerNusach==='la'?' active':''}" data-omer-nus="la">לעומר</button>
      <button class="bg-btn${S.omerNusach==='ba'?' active':''}" data-omer-nus="ba">בעומר</button>
    </div></div>
  `;
  document.getElementById('omerWidget').appendChild(popup);
  popup.querySelector('.msp-close').addEventListener('click', () => popup.remove());
  popup.querySelectorAll('[data-omer-fmt]').forEach(b => b.addEventListener('click', () => {
    popup.querySelectorAll('[data-omer-fmt]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); S.omerFormat = b.dataset.omerFmt; saveSettings(); loadOmer();
  }));
  popup.querySelectorAll('[data-omer-nus]').forEach(b => b.addEventListener('click', () => {
    popup.querySelectorAll('[data-omer-nus]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); S.omerNusach = b.dataset.omerNus; saveSettings(); loadOmer();
  }));
  setTimeout(() => {
    const close = ev => { if (!popup.contains(ev.target) && ev.target.id !== 'omerGearBtn') { popup.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 0);
});

// ===== ALARM / COUNTDOWN =====
function alarmBeep() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [0,200,400].forEach(dt => {
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value=880; gain.gain.setValueAtTime(0.3,ctx.currentTime+dt/1000);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dt/1000+0.3);
      osc.start(ctx.currentTime+dt/1000); osc.stop(ctx.currentTime+dt/1000+0.3);
    });
  } catch {}
}
function updateAlarmDisp() {
  const h=Math.floor(alarmLeft/3600), m=Math.floor((alarmLeft%3600)/60), s=alarmLeft%60;
  document.getElementById('alarmCountdown').textContent=`${pad(h)}:${pad(m)}:${pad(s)}`;
}
document.getElementById('alarmStart')?.addEventListener('click', () => {
  if (alarmInterval) return;
  const h=+(document.getElementById('alarmH')?.value||0);
  const m=+(document.getElementById('alarmM')?.value||0);
  const s=+(document.getElementById('alarmS')?.value||0);
  alarmTotal = h*3600+m*60+s;
  if (!alarmTotal) return;
  alarmLeft = alarmTotal;
  alarmInterval = setInterval(() => {
    alarmLeft--; updateAlarmDisp();
    if (alarmLeft<=0) { clearInterval(alarmInterval); alarmInterval=null; alarmBeep(); document.getElementById('alarmCountdown').textContent='⏰ הסתיים!'; }
  }, 1000);
});
document.getElementById('alarmStop')?.addEventListener('click', () => {
  clearInterval(alarmInterval); alarmInterval=null; alarmLeft=alarmTotal; updateAlarmDisp();
});

// ===== NASA APOD =====
async function loadApod() {
  const loading=document.getElementById('apodLoading'), content=document.getElementById('apodContent');
  if (!loading||!content) return;
  loading.classList.remove('hidden'); content.innerHTML='';
  try {
    const data = await window.api.fetchNasaApod();
    loading.classList.add('hidden');
    if (data?.error||!data?.length) { content.innerHTML='<div class="no-results" style="font-size:12px">שגיאה בטעינה</div>'; return; }
    apodItems=data; apodIdx=0; renderApod();
  } catch { loading.classList.add('hidden'); content.innerHTML='<div class="no-results" style="font-size:12px">שגיאה בטעינה</div>'; }
}
function renderApod() {
  const content=document.getElementById('apodContent');
  if (!content||!apodItems.length) return;
  const a=apodItems[apodIdx];
  const imgUrl=a.media_type==='image'?a.url:(a.thumbnail_url||'');
  content.innerHTML=`
    ${imgUrl?`<img class="apod-img" src="${esc(imgUrl)}" alt="" onerror="this.style.display='none'">`:''}
    <div class="apod-title">${esc(a.title||'')}</div>
    <div class="apod-date">${esc(a.date||'')}</div>
    <div class="apod-explain">${esc((a.explanation||'').slice(0,200))}${(a.explanation||'').length>200?'...':''}</div>
    <a class="apod-link" href="${esc(a.hdurl||a.url||'#')}">צפה בתמונה מלאה ↗</a>`;
}
document.getElementById('apodNext')?.addEventListener('click', () => { apodIdx=(apodIdx+1)%Math.max(apodItems.length,1); renderApod(); });
document.getElementById('apodPrev')?.addEventListener('click', () => { apodIdx=(apodIdx-1+Math.max(apodItems.length,1))%Math.max(apodItems.length,1); renderApod(); });

// ===== CRYPTO =====
async function loadCrypto() {
  const loading=document.getElementById('cryptoLoading'), list=document.getElementById('cryptoList');
  if (!loading||!list) return;
  loading.classList.remove('hidden'); list.innerHTML='';
  try {
    const data = await window.api.fetchCrypto();
    loading.classList.add('hidden');
    if (data?.error) throw new Error(data.error);
    list.innerHTML = Object.entries(CRYPTO_META).map(([id,m]) => {
      const c=data[id]; if(!c) return '';
      const pct=c.ils_24h_change||c.usd_24h_change||0;
      const up=pct>=0;
      return `<div class="crypto-row">
        <span class="crypto-icon">${m.icon}</span>
        <div class="crypto-meta"><div class="crypto-sym">${m.sym}</div><div class="crypto-name">${m.name}</div></div>
        <div class="crypto-price-wrap">
          <div class="crypto-price">₪${(c.ils||0).toLocaleString('he-IL',{maximumFractionDigits:0})}</div>
          <div class="crypto-change ${up?'up':'dn'}">${up?'▲':'▼'}${Math.abs(pct).toFixed(2)}%</div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('cryptoTime').textContent = new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
  } catch { loading.classList.add('hidden'); list.innerHTML='<div class="no-results" style="font-size:12px">שגיאה בטעינה</div>'; }
}


// ===== DAILY QUOTE =====
async function loadQuote() {
  const t=document.getElementById('quoteText'), a=document.getElementById('quoteAuthor');
  if (!t||!a) return;
  try {
    const q = await window.api.fetchQuote();
    t.textContent = q.text||''; a.textContent = `— ${q.author||''}`;
  } catch { t.textContent=''; }
}

// ===== TRANSIT =====

// ===== PARASHA =====
async function loadParasha() {
  const el = document.getElementById('parashaContent');
  if (!el) return;
  el.innerHTML = '<div class="spinner-sm"></div>';
  try {
    const d = await window.api.getParasha();
    if (d?.error) { el.innerHTML = '<div class="no-results">לא נמצאה פרשה</div>'; return; }
    el.innerHTML = `<div class="parasha-name">${esc(d.name)}</div><div class="parasha-date">${esc(d.date)}</div>`;
  } catch { el.innerHTML = '<div class="no-results">שגיאה</div>'; }
}

// ===== DAF YOMI =====
async function loadDafYomi() {
  const el = document.getElementById('dafYomiContent');
  if (!el) return;
  el.innerHTML = '<div class="spinner-sm"></div>';
  try {
    const d = await window.api.getDafYomi();
    if (d?.error) { el.innerHTML = '<div class="no-results">שגיאה</div>'; return; }
    el.innerHTML = `<div class="daf-text">${esc(d.tractate)} דף ${hebrewNumeral(d.daf)}</div>`;
  } catch { el.innerHTML = '<div class="no-results">שגיאה</div>'; }
}

// ===== DATE CONVERTER =====
function convertDateToHebrew() {
  const inp = document.getElementById('dcInput');
  const out = document.getElementById('dcOutput');
  if (!inp || !out) return;
  const v = inp.value;
  if (!v) { out.textContent = ''; return; }
  try {
    const d = new Date(v + 'T12:00:00');
    if (isNaN(d)) { out.textContent = 'תאריך לא תקין'; return; }
    out.textContent = fixHebrewDate(d.toLocaleDateString('he-IL-u-ca-hebrew', { year:'numeric', month:'long', day:'numeric' }));
  } catch { out.textContent = 'שגיאה'; }
}

// ===== GEMATRIA =====
const GEMATRIA_MAP = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
function calcGematria() {
  const inp = document.getElementById('gematriaInput');
  const out = document.getElementById('gematriaOutput');
  if (!inp || !out) return;
  const val = inp.value.trim().replace(/\s+/g,'');
  if (!val) { out.textContent = ''; return; }
  const total = val.split('').reduce((s,c) => s + (GEMATRIA_MAP[c]||0), 0);
  out.textContent = total > 0 ? `סכום: ${total}` : '(אין אותיות)';
}

// ===== TODO LIST =====
function loadTodoData() { try { return JSON.parse(localStorage.getItem('widget-todo')||'[]'); } catch { return []; } }
function saveTodoData(arr) { try { localStorage.setItem('widget-todo', JSON.stringify(arr)); } catch {} }
function renderTodo() {
  const list = document.getElementById('todoList');
  if (!list) return;
  const todos = loadTodoData();
  list.innerHTML = todos.map((t,i) => `
    <div class="todo-row ${t.done?'done':''}">
      <input type="checkbox" class="todo-check" data-ti="${i}" ${t.done?'checked':''}>
      <span class="todo-text">${esc(t.text)}</span>
      <button class="todo-del" data-ti="${i}">✕</button>
    </div>`).join('') || '<div class="no-results" style="font-size:11px">אין מטלות</div>';
  list.querySelectorAll('.todo-check').forEach(cb => cb.addEventListener('change', e => {
    const todos2=loadTodoData(); todos2[+e.target.dataset.ti].done=e.target.checked; saveTodoData(todos2); renderTodo();
  }));
  list.querySelectorAll('.todo-del').forEach(btn => btn.addEventListener('click', e => {
    const todos2=loadTodoData(); todos2.splice(+e.target.dataset.ti,1); saveTodoData(todos2); renderTodo();
  }));
}
document.getElementById('todoAddBtn')?.addEventListener('click', () => {
  const inp = document.getElementById('todoInput');
  if (!inp || !inp.value.trim()) return;
  const todos = loadTodoData(); todos.push({text:inp.value.trim(), done:false}); saveTodoData(todos);
  inp.value = ''; renderTodo();
});
document.getElementById('todoInput')?.addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('todoAddBtn')?.click(); });

// ===== STOPWATCH =====
let swStart=null, swElapsed=0, swRunning=false, swInterval=null, swLaps=[];
function swFmt(ms) { const t=Math.floor(ms/10); return `${pad(Math.floor(t/360000)%100)}:${pad(Math.floor(t/6000)%60)}:${pad(Math.floor(t/100)%60)}.${pad(t%100)}`; }
function swUpdate() { document.getElementById('swDisplay').textContent = swFmt(swElapsed+(swRunning?Date.now()-swStart:0)); }
document.getElementById('swStart')?.addEventListener('click', () => {
  if (swRunning) { swElapsed+=Date.now()-swStart; swRunning=false; clearInterval(swInterval); document.getElementById('swStart').innerHTML='▶ התחל'; }
  else { swStart=Date.now(); swRunning=true; swInterval=setInterval(swUpdate,100); document.getElementById('swStart').innerHTML='⏸ השהה'; }
});
document.getElementById('swLap')?.addEventListener('click', () => {
  if (!swRunning) return;
  swLaps.push(swFmt(swElapsed+Date.now()-swStart));
  const lapEl=document.getElementById('swLaps');
  if(lapEl) lapEl.innerHTML=swLaps.map((l,i)=>`<div class="sw-lap">סיבוב ${i+1}: ${l}</div>`).reverse().join('');
});
document.getElementById('swReset')?.addEventListener('click', () => {
  clearInterval(swInterval); swRunning=false; swElapsed=0; swLaps=[];
  swUpdate();
  const lapEl=document.getElementById('swLaps'); if(lapEl) lapEl.innerHTML='';
  document.getElementById('swStart').innerHTML='▶ התחל';
});

// ===== DICE / RANDOM =====
document.getElementById('diceRoll')?.addEventListener('click', () => {
  const faces=+(document.getElementById('diceFaces')?.value||6);
  const result=Math.floor(Math.random()*faces)+1;
  const el=document.getElementById('diceResult');
  if(el) el.textContent=result;
  el?.classList.remove('dice-anim'); void el?.offsetWidth; el?.classList.add('dice-anim');
});
document.getElementById('coinFlip')?.addEventListener('click', () => {
  const el=document.getElementById('coinResult');
  if(el) el.textContent=Math.random()<0.5?'🪙 עץ':'🪙 פלי';
  el?.classList.remove('dice-anim'); void el?.offsetWidth; el?.classList.add('dice-anim');
});


// ===== SYNC NEW SETTINGS UI =====
function syncNewSettingsUI() {
  const ssi=document.getElementById('stockSymbolsInput'); if (ssi) ssi.value=S.stockSymbols||'';
  NEW_WIDGET_IDS.forEach(id => { const el=document.getElementById(id); if(el) el.checked=S[id]; });
  ['orefSound', 'orefLocalOnly', 'launcherDraggable'].forEach(id => {
    const el=document.getElementById(id); if(el) el.checked=S[id];
  });
  document.querySelectorAll('[data-wsize]').forEach(b=>b.classList.toggle('active',b.dataset.wsize===S.widgetSize));
  document.querySelectorAll('[data-wcorner]').forEach(b=>b.classList.toggle('active',b.dataset.wcorner===S.widgetCorner));
  document.querySelectorAll('[data-asound]').forEach(b=>b.classList.toggle('active',b.dataset.asound===S.alertSound));
}
syncNewSettingsUI();

// ===== WIDGET DRAG-AND-DROP ORDER =====
function applyWidgetOrder() {
  if (!S.widgetOrder?.length) return;
  const col = document.getElementById('leftCol');
  if (!col) return;
  S.widgetOrder.forEach(id => {
    if (id === 'newsWidget') return; // newsWidget stays outside leftCol
    const el = document.getElementById(id);
    if (el) col.appendChild(el);
  });
  [...col.querySelectorAll(':scope > .widget')].forEach(el => {
    if (!S.widgetOrder.includes(el.id) && el.id !== 'newsWidget') {
      col.appendChild(el);
    }
  });
}

function saveWidgetOrder() {
  const col = document.getElementById('leftCol');
  if (!col) return;
  S.widgetOrder = [...col.querySelectorAll(':scope > .widget')].map(w => w.id).filter(Boolean);
  saveSettings();
}

// Add drag handles to all widgets (except news which stays fixed in dual mode)
document.querySelectorAll('.widget').forEach(widget => {
  if (widget.id === 'newsWidget') return;
  const header = widget.querySelector('.widget-header');
  if (!header) return;
  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.title = 'גרור לשינוי סדר';
  header.insertBefore(handle, header.firstChild);
  widget.setAttribute('draggable', 'true');
  widget.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', widget.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => widget.classList.add('dragging'), 0);
  });
  widget.addEventListener('dragend', () => {
    widget.classList.remove('dragging');
    saveWidgetOrder();
  });
});

const _leftColEl = document.getElementById('leftCol');
if (_leftColEl) {
  _leftColEl.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = _leftColEl.querySelector('.widget.dragging');
    if (!dragging) return;
    const target = e.target.closest('.widget:not(.dragging)');
    if (!target || !_leftColEl.contains(target)) return;
    const rect = target.getBoundingClientRect();
    if (e.clientY > rect.top + rect.height / 2) target.after(dragging);
    else target.before(dragging);
  });
  _leftColEl.addEventListener('drop', e => e.preventDefault());
}

applyWidgetOrder();
