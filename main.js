const { app, BrowserWindow, ipcMain, screen, shell, Menu, Tray, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const https = require('https');
const http  = require('http');

let panelWindow   = null;
let launcherWindow = null;
let tray          = null;
let panelVisible    = false;
let panelLocked     = false;
let currentLauncherW = 140;
let currentLauncherH = 52;
let currentLauncherVPos   = 'bottom'; // top / center / bottom
let currentLauncherOffsetX = 8;       // px from screen edge
const LAUNCHER_SIZES = { small:[100,40], normal:[140,52], large:[175,65] };

// ===== RSS FEEDS =====
const RSS_FEEDS = {
  news:   ['https://www.jdn.co.il/feed/','https://www.kore.co.il/feed/','https://www.emess.co.il/feed','https://hm-news.co.il/feed/'],
  tech:   ['https://www.geektime.co.il/feed','https://www.tgspot.co.il/feed/'],
  economy:['https://www.sponser.co.il/Content_rss_articles.aspx?CatId=4','https://il.investing.com/rss/news_95.rss','https://bizzness.net/feed/'],
  stocks: ['https://www.sponser.co.il/Content_rss_articles.aspx?CatId=7','https://il.investing.com/rss/news_285.rss'],
  music:  ['https://newsmusic.blogspot.com/feeds/posts/default?alt=rss'],
};

// ===== TIMEOUT HELPER =====
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

// ===== HTTP =====
function fetchUrl(url, redirects = 6, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    if (!redirects) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const headers = Object.assign({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }, extraHeaders);
    const req = lib.get(url, { headers, timeout:12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchUrl(res.headers.location, redirects-1, extraHeaders).then(resolve).catch(reject);
      res.setEncoding('utf8');
      let d = ''; res.on('data', c => d+=c); res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ===== OG:IMAGE FETCHER =====
async function fetchOgImage(url) {
  try {
    const html = await fetchUrl(url);
    const patterns = [
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m && m[1] && m[1].startsWith('http')) return m[1];
    }
  } catch {}
  return '';
}

// ===== GEO =====
async function fetchGeoLocation() {
  const raw = await withTimeout(
    fetchUrl('http://ip-api.com/json/?lang=he&fields=status,lat,lon,city'),
    8000
  );
  const d = JSON.parse(raw);
  if (d.status === 'success') return { lat:d.lat, lon:d.lon, city:d.city };
  throw new Error('geo failed');
}

// ===== RSS =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// Fix malformed XML entities (e.g. &nbsp; &mdash; in RSS feeds)
function sanitizeXml(str) {
  return str.replace(/&(?!(amp|lt|gt|apos|quot|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

function cleanText(s) {
  if (!s) return '';
  return s.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
          .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
          .replace(/&#\d+;/g,'').replace(/\s+/g,' ').trim();
}

function isArticleUrl(url) {
  if (!url) return false;
  if (url.startsWith('feed:') || url.startsWith('view-source:')) return false;
  if (/\/(feed|rss|atom)(\/|$|\?)/.test(url)) return false;
  if (/\.(rss|xml|atom)(\?|$)/.test(url)) return false;
  if (/CatId=/.test(url)) return false;  // sponser category page
  return url.startsWith('http');
}

function extractLink(item) {
  if (isArticleUrl(item.link)) return item.link;
  const guid = typeof item.guid === 'string' ? item.guid : '';
  if (isArticleUrl(guid)) return guid;
  return item.link || guid || '';
}

function extractImage(item) {
  if (item.enclosure?.url && item.enclosure.url.match(/\.(jpg|jpeg|png|gif|webp)/i)) return item.enclosure.url;
  const mt = item.mediaThumbnail;
  if (mt) {
    if (Array.isArray(mt) && mt[0]?.$?.url) return mt[0].$.url;
    if (mt.$?.url) return mt.$.url;
  }
  const mc = item.mediaContent;
  if (mc?.$?.url) return mc.$.url;
  if (Array.isArray(mc)) { for (const m of mc) { if (m?.$?.url) return m.$.url; } }
  // search in content HTML
  const html = item['content:encoded'] || item.content || item.summary || '';
  const m = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*)["']/i);
  if (m) return m[1];
  // data-src (lazy loaded)
  const m2 = html.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (m2) return m2[1];
  return '';
}

function fmtDate(s) {
  if (!s) return '';
  try { const d=new Date(s); return d.toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch { return ''; }
}

// Friendly names for feeds that return their URL as title
const FEED_NAMES = {
  'geektime.co.il':        'גיקטיים',
  'tgspot.co.il':          'טלגדג\'ט',
  'jdn.co.il':             'JDN חדשות',
  'kore.co.il':            'קורא',
  'emess.co.il':           'האמת',
  'hm-news.co.il':         'HM חדשות',
  'sponser.co.il':         'ספונסר',
  'investing.com':         'Investing.com',
  'bizzness.net':          'Bizzness',
  'newsmusic.blogspot.com':'חדשות מוזיקה',
};

function getSourceName(feedUrl, feedTitle) {
  // Use the actual RSS feed title if it's a real title (not a URL)
  if (feedTitle && !feedTitle.startsWith('http') && !feedTitle.includes('://') && feedTitle.trim().length > 1) {
    return feedTitle;
  }
  // Fallback: friendly name from our map
  for (const [domain, name] of Object.entries(FEED_NAMES)) {
    if (feedUrl.includes(domain)) return name;
  }
  // Last resort: hostname
  try { return new URL(feedUrl).hostname.replace(/^www\./,''); } catch {}
  return feedUrl;
}

let RSSParser;
async function fetchFeed(category, extraUrls = []) {
  if (!RSSParser) RSSParser = require('rss-parser');
  const parser = new RSSParser({
    customFields: { item:[['media:thumbnail','mediaThumbnail'],['media:content','mediaContent'],['content:encoded','content:encoded']] },
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  const urls = [...(RSS_FEEDS[category] || []), ...(extraUrls || [])];
  const items = [];
  for (const url of urls) {
    try {
      let feed;
      try {
        const raw = await withTimeout(fetchUrl(url), 12000);
        feed = await parser.parseString(sanitizeXml(raw));
      } catch {
        feed = await parser.parseURL(url);
      }
      const src = getSourceName(url, cleanText(feed.title||''));
      for (const item of (feed.items||[]).slice(0, 10)) {
        const link = extractLink(item);
        let summary = cleanText(item.contentSnippet || item.summary || '');
        if (summary.length > 200) summary = summary.slice(0,200)+'...';
        // Fallback: extract title from description when <title> is empty (e.g. Geektime)
        let title = cleanText(item.title||'');
        if (!title) {
          const descHtml = item['content:encoded'] || item.description || item.summary || '';
          const m = descHtml.match(/The post <a[^>]*>([^<]+)<\/a> appeared first on/);
          if (m) title = m[1];
        }
        items.push({
          title, summary, link,
          image:   extractImage(item),
          date:    fmtDate(item.pubDate||item.isoDate),
          rawDate: new Date(item.pubDate||item.isoDate||0).getTime(),
          source:  src,
        });
      }
    } catch(e) { console.error(`RSS [${url}]:`, e.message); }
  }
  return items.sort((a, b) => (b.rawDate||0) - (a.rawDate||0));
}

// ===== WEATHER =====
const WMO = {
  0:['שמש','☀️'],1:['בהיר','🌤️'],2:['מעונן חלקית','⛅'],3:['מעונן','☁️'],
  45:['ערפל','🌫️'],48:['ערפל קרח','🌫️'],51:['טפטוף','🌦️'],53:['טפטוף','🌦️'],
  55:['טפטוף כבד','🌧️'],61:['גשם קל','🌧️'],63:['גשם','🌧️'],65:['גשם כבד','🌧️'],
  71:['שלג קל','🌨️'],73:['שלג','❄️'],75:['שלג כבד','❄️'],
  80:['גשמים','🌦️'],81:['גשמים','🌧️'],82:['גשמים כבדים','⛈️'],
  95:['סופת רעמים','⛈️'],96:['סופה+ברד','⛈️'],99:['סופה חזקה','⛈️'],
};
async function fetchWeather(lat, lon, unit='celsius') {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    +`&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature`
    +`&daily=weathercode,temperature_2m_max,temperature_2m_min`
    +`&timezone=Asia%2FJerusalem&forecast_days=5&temperature_unit=${unit}`;
  const data = JSON.parse(await withTimeout(fetchUrl(url), 12000));
  const cur=data.current||{}, daily=data.daily||{};
  const [desc,icon]=WMO[cur.weathercode||0]||['','🌡️'];
  const daysHe=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const u = unit==='fahrenheit'?'°F':'°';
  const forecast=(daily.time||[]).slice(0,5).map((t,i)=>{
    const [,fi]=WMO[(daily.weathercode||[])[i]||0]||['','🌡️'];
    return { day:daysHe[new Date(t).getDay()], max:Math.round((daily.temperature_2m_max||[])[i]??0), min:Math.round((daily.temperature_2m_min||[])[i]??0), icon:fi, u };
  });
  return { temp:Math.round(cur.temperature_2m||0), feels_like:Math.round(cur.apparent_temperature||0), humidity:cur.relativehumidity_2m||0, wind:Math.round(cur.windspeed_10m||0), desc, icon, forecast, u };
}

// ===== ZMANIM (using @hebcal/core — no external API needed) =====
function calcZmanim(lat, lon, candleMins = 18) {
  const { HDate, Location, Zmanim } = require('@hebcal/core');
  const now     = new Date();
  const hdate   = new HDate(now);
  const location = new Location(lat, lon, true, 'Asia/Jerusalem', 'Israel');
  const z       = new Zmanim(location, hdate, false);

  function fmt(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jerusalem' });
  }
  function safe(fn) { try { return fn(); } catch { return null; } }

  const sunsetDate = safe(() => z.sunset());
  const dow        = now.getDay(); // 5=Fri, 6=Sat
  let candles = null, havdalah = null;

  if (dow === 5 && sunsetDate) {
    candles  = fmt(new Date(sunsetDate.getTime() - candleMins * 60000));
  }
  if (dow === 6) {
    havdalah = fmt(safe(() => z.tzeit(8.5)));  // ~50 min after sunset (Rabbeinu Tam)
  }

  // Hebrew date using HDate
  let hebrewDateStr = '';
  try {
    const HMONTHS = {1:'ניסן',2:'אייר',3:'סיון',4:'תמוז',5:'אב',6:'אלול',
                     7:'תשרי',8:'חשון',9:'כסלו',10:'טבת',11:'שבט',12:'אדר',13:'אדר ב׳'};
    const day   = hdate.getDate();
    const month = HMONTHS[hdate.getMonth()] || '';
    // Year in gematria via locale
    const yearLocale = now.toLocaleDateString('he-IL-u-ca-hebrew', {year:'numeric'});
    hebrewDateStr = `${toHebrewDay(day)} ב${month} ${yearLocale}`;
  } catch {}

  return {
    alot:          fmt(safe(() => z.alotHaShachar())),
    sunrise:       fmt(safe(() => z.sunrise())),
    shmaMGA:       fmt(safe(() => z.sofZmanShma(false))),
    shmaGRA:       fmt(safe(() => z.sofZmanShma(true))),
    tefilaMGA:     fmt(safe(() => z.sofZmanTfilla(false))),
    tefilaGRA:     fmt(safe(() => z.sofZmanTfilla(true))),
    chatzot:       fmt(safe(() => z.chatzot())),
    minchaGedola:  fmt(safe(() => z.minchaGedola())),
    minchaKetana:  fmt(safe(() => z.minchaKetana())),
    plagHaMincha:  fmt(safe(() => z.plagHaMincha())),
    sunset:        fmt(sunsetDate),
    tzeit:         fmt(safe(() => z.tzeit(7.083))),
    candles, havdalah, dow, hebrewDateStr,
  };
}

// Hebrew numeral helper (used in main process for HDate)
function toHebrewDay(n) {
  const ones  = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens  = ['','י','כ','ל','מ'];
  if (n===15) return 'ט"ו'; if (n===16) return 'ט"ז';
  let r = '';
  if (n>=10){ r += tens[Math.floor(n/10)]; n%=10; }
  r += ones[n];
  if (r.length===1) return r+"'";
  return r.slice(0,-1)+'"'+r.slice(-1);
}

// ===== WINDOWS =====
app.whenReady().then(() => { createPanel(); createLauncher(); createTray(); });

nativeTheme.on('updated', () => {
  panelWindow?.webContents.send('native-theme-changed', nativeTheme.shouldUseDarkColors);
});

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('ווידגטים');
  const updateMenu = () => Menu.buildFromTemplate([
    { label: panelVisible ? 'סגור ווידגטים' : 'פתח ווידגטים', click: () => panelVisible ? hidePanel() : showPanel(currentSide) },
    { type: 'separator' },
    { label: 'סגור תוכנה', click: () => app.quit() },
  ]);
  tray.setContextMenu(updateMenu());
  tray.on('click', () => { panelVisible ? hidePanel() : showPanel(currentSide); tray.setContextMenu(updateMenu()); });
}

function getLauncherX(side, workArea) {
  const off = currentLauncherOffsetX;
  if (side === 'right') return workArea.x + workArea.width - currentLauncherW - off;
  return workArea.x + off;
}

function getLauncherY(workArea) {
  if (currentLauncherVPos === 'top')    return workArea.y + currentLauncherOffsetX;
  if (currentLauncherVPos === 'center') return workArea.y + Math.floor((workArea.height - currentLauncherH) / 2);
  return workArea.y + workArea.height - currentLauncherH; // bottom
}

function repositionLauncher() {
  if (!launcherWindow) return;
  const { workArea } = screen.getPrimaryDisplay();
  launcherWindow.setPosition(getLauncherX(currentSide, workArea), getLauncherY(workArea));
}

function createPanel() {
  const { workArea } = screen.getPrimaryDisplay();
  const panelH = Math.min(workArea.height, 920);
  panelWindow = new BrowserWindow({
    width:460, height:panelH, x:workArea.x, y:workArea.y + Math.floor((workArea.height - panelH) / 2),
    frame:false, transparent:true, alwaysOnTop:false,
    skipTaskbar:true, resizable:false, show:false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false, backgroundThrottling:true },
  });
  panelWindow.loadFile(path.join(__dirname,'index.html'));
  panelWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F12') panelWindow.webContents.openDevTools({ mode: 'detach' });
  });
  // Open all links in external browser
  panelWindow.webContents.setWindowOpenHandler(({url}) => { shell.openExternal(url); return {action:'deny'}; });
  panelWindow.webContents.on('will-navigate', (e,url) => { if(url!==panelWindow.webContents.getURL()){ e.preventDefault(); shell.openExternal(url); } });
  panelWindow.on('blur', () => { if(panelVisible && !panelLocked) hidePanel(); });

}

function createLauncher(side='left') {
  const { workArea } = screen.getPrimaryDisplay();
  if (launcherWindow) { launcherWindow.destroy(); launcherWindow=null; }
  launcherWindow = new BrowserWindow({
    width:140, height:52,
    x:getLauncherX(side, workArea), y:getLauncherY(workArea),
    frame:false, transparent:true, alwaysOnTop:true,
    skipTaskbar:true, resizable:false, movable:false, focusable:false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false, backgroundThrottling:true },
  });
  launcherWindow.loadFile(path.join(__dirname,'launcher.html'));
}

function showPanel(side='left') {
  if (!panelWindow) return;
  const { workArea } = screen.getPrimaryDisplay();
  const bounds = panelWindow.getBounds();
  const x = side==='right' ? workArea.x+workArea.width-bounds.width : workArea.x;
  const y = workArea.y + Math.floor((workArea.height - bounds.height) / 2);
  panelWindow.setPosition(x, y);
  panelWindow.show(); panelWindow.focus(); panelVisible=true;
  launcherWindow?.webContents.send('panel-state', true);
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: 'סגור ווידגטים', click: () => { hidePanel(); } },
    { type: 'separator' },
    { label: 'סגור תוכנה', click: () => app.quit() },
  ]));
}
function hidePanel() {
  panelWindow?.hide(); panelVisible=false;
  launcherWindow?.webContents.send('panel-state', false);
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: 'פתח ווידגטים', click: () => { showPanel(currentSide); } },
    { type: 'separator' },
    { label: 'סגור תוכנה', click: () => app.quit() },
  ]));
}

// ===== IPC =====
let currentSide = 'left';

ipcMain.on('toggle-panel', () => panelVisible ? hidePanel() : showPanel(currentSide));

ipcMain.handle('get-native-theme', () => nativeTheme.shouldUseDarkColors);
ipcMain.on('send-launcher-weather', (_, data) => { launcherWindow?.webContents.send('on-weather-update', data); });
ipcMain.on('set-launcher-text-color', (_, c) => { launcherWindow?.webContents.send('set-text-color', c); });

ipcMain.handle('fetch-feed',    async (_,cat,extra)  => { try { return await fetchFeed(cat, extra); }     catch { return []; } });
ipcMain.handle('fetch-weather', async (_,lat,lon,u)  => { try { return await fetchWeather(lat,lon,u); } catch(e) { return {error:e.message}; } });
ipcMain.handle('get-location',  async ()             => { try { return await fetchGeoLocation(); }       catch { return {lat:31.7683,lon:35.2137,city:'ירושלים'}; } });
ipcMain.handle('fetch-og-image',async (_,url)        => { try { return await fetchOgImage(url); }        catch { return ''; } });
ipcMain.handle('get-zmanim',    async (_,lat,lon,cm) => { try { return calcZmanim(lat,lon,cm); }        catch(e) { return {error:e.message}; } });
ipcMain.handle('get-hebrew-month', async (_, gYear, gMonth) => {
  try {
    const { HDate, HebrewCalendar, flags } = require('@hebcal/core');
    const HEB_MONTH_NAMES = {
      1:'ניסן', 2:'אייר', 3:'סיון', 4:'תמוז', 5:'אב', 6:'אלול',
      7:'תשרי', 8:'חשון', 9:'כסלו', 10:'טבת', 11:'שבט', 12:'אדר', 13:'אדר ב׳',
    };
    const daysInMonth = new Date(gYear, gMonth, 0).getDate();
    const days = [];
    const hebrewMonthNames = new Set();
    for (let d = 1; d <= daysInMonth; d++) {
      const hd = new HDate(new Date(gYear, gMonth - 1, d));
      days.push(hd.getDate());
      hebrewMonthNames.add(HEB_MONTH_NAMES[hd.getMonth()] || '');
    }
    // Get holidays for this month using HebrewCalendar
    const holidays = {};
    try {
      const evts = HebrewCalendar.calendar({
        start: new HDate(new Date(gYear, gMonth - 1, 1)),
        end:   new HDate(new Date(gYear, gMonth - 1, daysInMonth)),
        il: true, sedrot: false, omer: false, shabbatMevarchim: false,
        noModern: false,
      });
      const WANTED = flags.CHAG | flags.MINOR_FAST | flags.MAJOR_FAST |
                     flags.MODERN_HOLIDAY | flags.ROSH_CHODESH | flags.SPECIAL_SHABBAT;
      for (const ev of evts) {
        if (!(ev.getFlags() & WANTED)) continue;
        const greg = ev.getDate().greg();
        if (greg.getFullYear() === gYear && greg.getMonth() === gMonth - 1) {
          const day = greg.getDate();
          const name = ev.render('he');
          holidays[day] = holidays[day] ? holidays[day] + ' · ' + name : name;
        }
      }
    } catch {}
    return { days, hebrewMonths: [...hebrewMonthNames].filter(Boolean).join(' – '), holidays };
  } catch(e) { return null; }
});
ipcMain.handle('fetch-weather-launcher', async(_,lat,lon) => { try { return await fetchWeather(lat,lon); } catch { return null; } });
ipcMain.handle('fetch-forex',   async ()             => {
  try {
    const raw = await fetchUrl('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/ils.json');
    return JSON.parse(raw);
  } catch(e) { return {error:e.message}; }
});

ipcMain.on('open-external', (_, url) => shell.openExternal(url));

ipcMain.on('set-launcher-opacity', (_, val) => {
  launcherWindow?.webContents.send('set-opacity', val);
});

ipcMain.on('set-launcher-side', (_, side) => {
  currentSide = side;
  repositionLauncher();
});

ipcMain.on('resize-panel', (_, width) => {
  if (!panelWindow) return;
  const { workArea } = screen.getPrimaryDisplay();
  const h = panelWindow.getBounds().height; // keep existing height
  const x = currentSide === 'right' ? workArea.x + workArea.width - width : workArea.x;
  const y = workArea.y + Math.floor((workArea.height - h) / 2);
  panelWindow.setBounds({ x, y, width, height: h });
});

ipcMain.on('show-launcher-menu', () => {
  const menu = Menu.buildFromTemplate([
    { label: 'פתח ווידג\'טים', click: () => panelVisible ? hidePanel() : showPanel(currentSide) },
    { type: 'separator' },
    { label: 'סגור תוכנה', click: () => app.quit() },
  ]);
  menu.popup({ window: launcherWindow });
});

// ===== STOCKS (Yahoo Finance – free, no key) =====
ipcMain.handle('fetch-stocks', async (_, symbolsStr = 'TA35.TA,BTC-USD,MSFT,AAPL') => {
  try {
    const symbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);
    const results = [];
    for (const sym of symbols) {
      try {
        const raw = await withTimeout(
          fetchUrl(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`, 6, { 'Origin': 'https://finance.yahoo.com', 'Referer': 'https://finance.yahoo.com/', 'Accept': 'application/json' }),
          10000
        );
        const data = JSON.parse(raw);
        const res = data?.chart?.result?.[0];
        if (!res) continue;
        const meta = res.meta;
        const closes = (res.indicators?.quote?.[0]?.close || []).filter(v => v != null);
        results.push({
          symbol: sym,
          name: meta.shortName || meta.symbol || sym,
          price: meta.regularMarketPrice || 0,
          prev: meta.previousClose || meta.chartPreviousClose || 0,
          changePct: meta.previousClose
            ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100)
            : 0,
          currency: meta.currency || '',
          closes: closes.slice(-7),
        });
      } catch(e) { console.error(`Stock [${sym}]:`, e.message); }
    }
    return results;
  } catch(e) { return { error: e.message }; }
});



// ===== UV + AIR QUALITY (open-meteo – free) =====
ipcMain.handle('fetch-uv-air', async (_, lat, lon) => {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=uv_index,us_aqi,pm2_5,pm10,european_aqi`;
    const raw = await withTimeout(fetchUrl(url), 10000);
    return JSON.parse(raw);
  } catch(e) { return { error: e.message }; }
});

// ===== YOUTUBE MUSIC CHANNELS =====
// channel_id entries use ?channel_id=UC..., user entries use ?user=NAME
const YT_MUSIC_CHANNELS = [
  { rss: 'channel_id=UCJ4dbLAwK9HZilPlyrj-9vQ', name: 'א אידישע וויס' },
  { rss: 'channel_id=UCJxECluw4yBOJChpzKwxjSA', name: 'נפתלי קמפה' },
  { rss: 'channel_id=UCDi07HVQVRGLtRS9gH_0woA', name: 'משה קליין' },
  { rss: 'channel_id=UCgGb3s4V-jKqxGghfiIgvlg', name: 'נחמן פילמר' },
  { rss: 'channel_id=UCnQ7AkaLl9n808Xlql3VknA', name: 'אברימי רוט' },
  { rss: 'channel_id=UC_vOeqbvaSt_P5haPc03oNQ', name: 'מרדכי בן דוד' },
  { rss: 'channel_id=UCHwxQ7twj_VWIPMcJ3Zdyqg', name: 'ישי ריבו' },
  { rss: 'channel_id=UCYCWdJniUxe41JbVwO0_SLA', name: 'אברהם פריד' },
  { rss: 'channel_id=UCBY1pzHy9ZMy7X9_d6PWqNg', name: 'יוסי גרין' },
  { rss: 'channel_id=UC2tXgvgIGFZosvnvpKfi3hw', name: 'שמחה פרידמן' },
  { rss: 'channel_id=UCefarW8iWzuNO7NedV-om-w', name: 'בני פרידמן' },
  { rss: 'channel_id=UCbtujRIJF4ASDVJ8S0XN0Vw', name: 'אלי פרידמן' },
  { rss: 'channel_id=UCrr0YNlKrezZQ9_PaWcu_zQ', name: 'נמואל הרוש' },
  { rss: 'channel_id=UCf1mExKt7DUVf-75wU-mzdA', name: 'קובי גרינבוים' },
  { rss: 'channel_id=UCux1RYTOxEnGeta5mc0U0vQ', name: 'קובי ברומר' },
  { rss: 'channel_id=UCTVRe7FcTlGJ3fbTpdVLpTQ', name: 'מרדכי שפירא' },
  { rss: 'channel_id=UCrwZcXgl5IdVLdYbD5T0R7g', name: 'שוקי סלומון' },
  { rss: 'channel_id=UCdHFq8lLwyjgCUIdpn8rM9A', name: 'פיני איינהורן' },
  { rss: 'channel_id=UCYNqohhjOXH913YOYs4dUlg', name: 'שלומי גרטנר' },
  { rss: 'channel_id=UCqvWt8C9EwztYQMvhRUe-xA', name: 'שולי רנד' },
  { rss: 'channel_id=UCmKXGno-w4e-Jd-CfNuSeZw', name: 'צמאה' },
  { rss: 'channel_id=UCkmuyB6EBM3bEtmzkPmqa3Q', name: 'מיילך קאהן' },
  { rss: 'channel_id=UCurJsTmmLI48R1PPjMAoHsQ', name: 'דייויד טויב' },
  { rss: 'channel_id=UCfrOhAU7Jg8PA0UCutoMkuw', name: 'רולי דיקמן' },
  { rss: 'channel_id=UCqdYHENRH70GHI-GEpodP7A', name: 'מנחם טוקר' },
  { rss: 'channel_id=UCdqVrSFheoirrzkeelWzhxA', name: 'ישראל סוסנה' },
  { rss: 'channel_id=UCjzHeG1KWoonmf9d5KBvSiw', name: 'מנגינות עדינות' },
  { rss: 'channel_id=UCzqpZ8XdZsLBGNYKbEZn-TA', name: 'shiezoli' },
  { rss: 'channel_id=UCYyf_XtgMDoO7lcvXrjMFMA', name: 'מוטי וייס' },
  { rss: 'channel_id=UCMhsUovfy9eOmprODQGefXw', name: 'משה פלד' },
  { rss: 'channel_id=UChYinYNAHvZSrp--Q12k98A', name: 'אפרים מרקוביץ' },
  { rss: 'channel_id=UCu3EnsblzJsaLa5cqNxRqeQ', name: 'יאיר אלייצור' },
  { rss: 'channel_id=UCa2ILnMVXvuII6mw7Elz9wA', name: 'אליהו חייט' },
  { rss: 'channel_id=UCGAsrXLjxzq2rrlc0B2gFYg', name: 'נהוראי אריאלי' },
  { rss: 'channel_id=UC9vGsLCykSgXVVf4QRYqJ_A', name: 'יואלי דיקמן' },
  { rss: 'channel_id=UCiZXqxS2Bg7zRlXeOViIaIg', name: 'מקהלת מלכות' },
  { rss: 'channel_id=UC8QdnhyXXB8Y6FHQTvtDuRQ', name: 'יונתן שווארץ' },
  { rss: 'channel_id=UCjh-noHUsafx_CSiieHNXFg', name: 'מוטי שטיינמץ' },
  { rss: 'channel_id=UCteKUiRZjGiFAjpD9lqAZ9w', name: 'מיכאל שניצלר' },
  { rss: 'channel_id=UCD59asvJYhzfCvQ5XjuO_NA', name: 'יהודה גלילי' },
  { rss: 'channel_id=UCNfZF4HnWVgNtH8j1BaABrQ', name: 'יענקי לנדאו' },
  { rss: 'channel_id=UCu00Gaae-7JWKNrU3YM_u9w', name: 'מוטי אילאוויטש' },
  { rss: 'user=AaronRazel',        name: 'אהרן רזאל' },
  { rss: 'user=AviElssonOfficial', name: 'אבי אילסון' },
  { rss: 'user=YonatanShainfeld',  name: 'יונתן שיינפלד' },
  { rss: 'user=Hamenagnim',        name: 'תזמורת המנגנים' },
  { rss: 'user=Shwekeyofficial',   name: 'יעקב שוואקי' },
];

ipcMain.handle('fetch-yt-music', async () => {
  if (!RSSParser) RSSParser = require('rss-parser');
  const parser = new RSSParser({ timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' } });
  // Shuffle and pick 8 random channels each load for variety + speed
  const shuffled = [...YT_MUSIC_CHANNELS].sort(() => Math.random() - 0.5).slice(0, 8);
  const items = [];
  for (const ch of shuffled) {
    try {
      const feed = await withTimeout(
        parser.parseURL(`https://www.youtube.com/feeds/videos.xml?${ch.rss}`),
        8000
      );
      for (const item of (feed.items || []).slice(0, 2)) {
        const videoId = (item.id || '').split(':').pop() || '';
        items.push({
          title: cleanText(item.title || ''),
          link: item.link || `https://www.youtube.com/watch?v=${videoId}`,
          thumb: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '',
          date: fmtDate(item.pubDate || item.isoDate || ''),
          channel: ch.name || cleanText(feed.title || ''),
          videoId,
        });
      }
    } catch(e) { console.error('YT RSS:', ch.name, e.message); }
  }
  return items.length ? items : { error: 'no items' };
});

// ===== NASA APOD (DEMO_KEY – 30 req/hr free) =====
ipcMain.handle('fetch-nasa-apod', async () => {
  try {
    const raw = await withTimeout(
      fetchUrl('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&count=5&thumbs=true'),
      15000
    );
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [data];
  } catch(e) { return { error: e.message }; }
});

// ===== CRYPTO (CoinGecko – free, no key) =====
ipcMain.handle('fetch-crypto', async () => {
  try {
    const raw = await withTimeout(
      fetchUrl('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=ils,usd&include_24hr_change=true'),
      12000
    );
    return JSON.parse(raw);
  } catch(e) { return { error: e.message }; }
});

// ===== OMER COUNT (uses @hebcal/core) =====
ipcMain.handle('get-omer', async () => {
  try {
    const { HDate } = require('@hebcal/core');
    const now = new Date();
    const hdate = new HDate(now);
    const year = hdate.getFullYear();
    const startAbs = new HDate(16, 1, year).abs(); // 16 Nisan
    const endAbs   = new HDate(5,  3, year).abs(); // 5 Sivan (last day)
    const todayAbs = hdate.abs();
    if (todayAbs >= startAbs && todayAbs <= endAbs) {
      return { day: todayAbs - startAbs + 1, inOmer: true };
    }
    return { day: 0, inOmer: false };
  } catch(e) { return { error: e.message, inOmer: false }; }
});

// ===== DAILY QUOTE (hardcoded – completely free) =====
const DAILY_QUOTES = [
  { text:'אם אין אני לי, מי לי? וכשאני לעצמי, מה אני? ואם לא עכשיו, אימתי?', author:'הלל הזקן – אבות א, יד' },
  { text:'כל המציל נפש אחת, מעלה עליו הכתוב כאילו הציל עולם מלא', author:'תלמוד בבלי, סנהדרין לז' },
  { text:'ואהבת לרעך כמוך – זה כלל גדול בתורה', author:'רבי עקיבא' },
  { text:'על שלשה דברים העולם עומד: על התורה, ועל העבודה, ועל גמילות חסדים', author:'שמעון הצדיק – אבות א, ב' },
  { text:'חכם הוא הלומד מכל אדם', author:'בן זומא – אבות ד, א' },
  { text:'אי זהו עשיר? השמח בחלקו', author:'בן זומא – אבות ד, א' },
  { text:'בכל דרכיך דעהו, והוא יישר אורחותיך', author:'משלי ג, ו' },
  { text:'לב שמח ייטיב גהה, ורוח נכאה תיבש גרם', author:'משלי יז, כב' },
  { text:'עשה לך רב, וקנה לך חבר', author:'יהושע בן פרחיה – אבות א, ו' },
  { text:'הוי שפל רוח בפני כל אדם', author:'לויטס – אבות ד, ד' },
  { text:'דרך ארץ קדמה לתורה', author:'ויקרא רבה' },
  { text:'מה שאתה שונא לנפשך, אל תעשה לחברך', author:'הלל הזקן – שבת לא' },
  { text:'כל ישראל ערבים זה בזה', author:'שבועות לט' },
  { text:'הכל בידי שמיים חוץ מיראת שמיים', author:'ברכות לג' },
  { text:'יפה שעה אחת של תשובה ומעשים טובים בעולם הזה מכל חיי העולם הבא', author:'אבות ד, יז' },
  { text:'אל תסתכל בקנקן אלא במה שיש בו', author:'אבות ד, כז' },
  { text:'הוי רץ למצווה קלה כבחמורה', author:'בן עזאי – אבות ד, ב' },
  { text:'קנה חכמה, קנה בינה', author:'משלי ד, ה' },
  { text:'צדיק באמונתו יחיה', author:'חבקוק ב, ד' },
  { text:'לא כל המרבה בדברים טוב', author:'שמעון בן גמליאל – אבות א, יז' },
  { text:'חזק ואמץ, אל תירא ואל תחת', author:'יהושע א, ט' },
  { text:'מי שאינו מוסיף, גורע', author:'הלל הזקן – אבות א, יג' },
  { text:'שלום שלום לרחוק ולקרוב', author:'ישעיהו נז, יט' },
  { text:'טוב לב משתה תמיד', author:'משלי טו, טו' },
  { text:'ראה חיים עם האישה אשר אהבת', author:'קהלת ט, ט' },
  { text:'אין אדם יודע את שעתו', author:'קהלת ט, יב' },
  { text:'כבד את אביך ואת אמך', author:'שמות כ, יב' },
  { text:'המאמין אינו מפחד, והמפחד אינו מאמין', author:'פתגם חסידי' },
  { text:'יותר ממה שבעל הבית עושה עם עני, עני עושה עם בעל הבית', author:'רות רבה' },
  { text:'מה טובו אהליך יעקב, משכנותיך ישראל', author:'במדבר כד, ה' },
];
ipcMain.handle('fetch-quote', async () => {
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  return DAILY_QUOTES[doy % DAILY_QUOTES.length];
});

// ===== PARASHA (uses @hebcal/core) =====
ipcMain.handle('get-parasha', async () => {
  try {
    const { HebrewCalendar, HDate, flags } = require('@hebcal/core');
    const hdate = new HDate(new Date());
    const events = HebrewCalendar.calendar({
      start: hdate, end: new HDate(hdate.abs() + 7),
      sedrot: true, il: true, noHolidays: true,
    });
    const e = events.find(ev => ev.getFlags() & flags.PARSHA_HASHAVUA);
    if (!e) return { error: 'not found' };
    const greg = e.getDate().greg();
    return {
      name: e.render('he'),
      date: greg.toLocaleDateString('he-IL', { day:'numeric', month:'long', weekday:'long' }),
    };
  } catch(err) { return { error: err.message }; }
});

// ===== DAF YOMI =====
// Cycle 14 started Jan 5, 2020 (day 0 = ברכות ב)
const DAF_TRACTATES = [
  ['ברכות',63],['שבת',156],['עירובין',104],['פסחים',120],['שקלים',21],
  ['יומא',87],['סוכה',55],['ביצה',39],['ראש השנה',34],['תענית',30],
  ['מגילה',31],['מועד קטן',28],['חגיגה',26],['יבמות',121],['כתובות',111],
  ['נדרים',90],['נזיר',65],['סוטה',48],['גיטין',89],['קידושין',81],
  ['בבא קמא',118],['בבא מציעא',118],['בבא בתרא',175],['סנהדרין',112],
  ['מכות',23],['שבועות',48],['עבודה זרה',75],['הוריות',13],['זבחים',119],
  ['מנחות',109],['חולין',141],['בכורות',60],['ערכין',33],['תמורה',33],
  ['כריתות',27],['מעילה',21],['קינים',24],['תמיד',32],['מידות',36],['נידה',72],
];
const CYCLE14_START = new Date('2020-01-05');
ipcMain.handle('get-daf-yomi', async () => {
  try {
    const now = new Date();
    const dayNum = Math.floor((now - CYCLE14_START) / 86400000) % 2711;
    let rem = dayNum, tractate = '', daf = 2;
    for (const [name, pages] of DAF_TRACTATES) {
      if (rem < pages) { tractate = name; daf = rem + 2; break; }
      rem -= pages;
    }
    return { tractate, daf, text: `${tractate} דף ${daf}` };
  } catch(e) { return { error: e.message }; }
});

ipcMain.on('set-panel-locked', (_, locked) => { panelLocked = locked; });
ipcMain.on('show-panel',       ()           => { if (!panelVisible) showPanel(currentSide); });
ipcMain.on('hide-panel',       ()           => { if (!panelLocked) hidePanel(); });
ipcMain.on('set-launcher-color',   (_, color)   => { launcherWindow?.webContents.send('set-color',   color); });
ipcMain.on('set-launcher-trigger', (_, trigger) => { launcherWindow?.webContents.send('set-trigger', trigger); });
ipcMain.on('set-launcher-size', (_, size) => {
  // Legacy named-size support
  if (!launcherWindow) return;
  const { workArea } = screen.getPrimaryDisplay();
  const [w, h] = LAUNCHER_SIZES[size] || LAUNCHER_SIZES.normal;
  currentLauncherW = w; currentLauncherH = h;
  launcherWindow.setBounds({ x: getLauncherX(currentSide, workArea), y: getLauncherY(workArea), width: w, height: h });
  launcherWindow.webContents.send('set-width', w);
});

ipcMain.on('set-launcher-width', (_, width) => {
  if (!launcherWindow) return;
  const h = Math.max(34, Math.round(width * 0.37));
  currentLauncherW = width; currentLauncherH = h;
  const { workArea } = screen.getPrimaryDisplay();
  launcherWindow.setBounds({ x: getLauncherX(currentSide, workArea), y: getLauncherY(workArea), width, height: h });
  launcherWindow.webContents.send('set-width', width);
});

ipcMain.on('set-launcher-vpos',    (_, vpos) => {
  currentLauncherVPos = vpos;
  repositionLauncher();
});

ipcMain.on('set-launcher-offset-x', (_, px) => {
  currentLauncherOffsetX = px;
  repositionLauncher();
});

ipcMain.on('set-launcher-corner',   (_, c) => { launcherWindow?.webContents.send('set-corner',     c); });
ipcMain.on('set-launcher-show-icon',(_, v) => { launcherWindow?.webContents.send('set-show-icon',  v); });
ipcMain.on('set-launcher-show-city',(_, v) => { launcherWindow?.webContents.send('set-show-city',  v); });

ipcMain.handle('get-login-item', () => app.getLoginItemSettings().openAtLogin);
ipcMain.on('set-login-item', (_, enable) => app.setLoginItemSettings({ openAtLogin: enable }));

// With tray icon the app stays alive even when all windows are hidden
app.on('window-all-closed', () => { /* stay in tray */ });
