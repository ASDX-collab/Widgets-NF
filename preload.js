const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Core
  togglePanel:          ()               => ipcRenderer.send('toggle-panel'),
  resizePanel:          (w)              => ipcRenderer.send('resize-panel', w),
  setLauncherSide:      (side)           => ipcRenderer.send('set-launcher-side', side),
  setLauncherOpacity:   (v)              => ipcRenderer.send('set-launcher-opacity', v),
  openExternal:         (url)            => ipcRenderer.send('open-external', url),
  showLauncherMenu:     ()               => ipcRenderer.send('show-launcher-menu'),
  onPanelState:         (cb)             => ipcRenderer.on('panel-state', (_, open) => cb(open)),
  onSetOpacity:         (cb)             => ipcRenderer.on('set-opacity', (_, v)    => cb(v)),

  // Data fetchers (original)
  fetchFeed:            (cat, extra)     => ipcRenderer.invoke('fetch-feed', cat, extra),
  fetchWeather:         (lat, lon, unit) => ipcRenderer.invoke('fetch-weather', lat, lon, unit),
  fetchWeatherLauncher: (lat, lon)       => ipcRenderer.invoke('fetch-weather-launcher', lat, lon),
  getLocation:          ()               => ipcRenderer.invoke('get-location'),
  fetchOgImage:         (url)            => ipcRenderer.invoke('fetch-og-image', url),
  fetchArticleText:     (url)            => ipcRenderer.invoke('fetch-article-text', url),
  getZmanim:            (lat, lon, cm)   => ipcRenderer.invoke('get-zmanim', lat, lon, cm),
  fetchForex:           ()               => ipcRenderer.invoke('fetch-forex'),
  fetchOref:            ()               => ipcRenderer.invoke('fetch-oref'),
  getLauncherPos:       ()               => ipcRenderer.invoke('get-launcher-pos'),
  setLauncherPosAbs:    (x, y)           => ipcRenderer.send('set-launcher-pos-abs', x, y),
  onSetLauncherDraggable:(cb)            => ipcRenderer.on('set-launcher-draggable', (_, v) => cb(v)),
  setLauncherDraggable: (v)              => ipcRenderer.send('set-launcher-draggable', v),
  setLauncherDesktopOnly: (v)            => ipcRenderer.send('set-launcher-desktop-only', v),
  onSaveLauncherDragPos:(cb)             => ipcRenderer.on('save-launcher-drag-pos', (_, x, y) => cb(x, y)),
  onSaveLauncherSide:  (cb)             => ipcRenderer.on('save-launcher-side', (_, side) => cb(side)),
  restoreLauncherDragPos:(x, y)          => ipcRenderer.send('restore-launcher-drag-pos', x, y),

  // New widgets
  getHebrewMonth:       (y, m)           => ipcRenderer.invoke('get-hebrew-month', y, m),
  fetchStocks:          (syms)           => ipcRenderer.invoke('fetch-stocks', syms),
  fetchUvAir:           (lat, lon)       => ipcRenderer.invoke('fetch-uv-air', lat, lon),
  fetchYtMusic:         ()               => ipcRenderer.invoke('fetch-yt-music'),
  fetchNasaApod:        ()               => ipcRenderer.invoke('fetch-nasa-apod'),
  fetchCrypto:          ()               => ipcRenderer.invoke('fetch-crypto'),
  getOmer:              (lat, lon)       => ipcRenderer.invoke('get-omer', lat, lon),
  fetchQuote:           ()               => ipcRenderer.invoke('fetch-quote'),
  getParasha:           ()               => ipcRenderer.invoke('get-parasha'),
  getDafYomi:           ()               => ipcRenderer.invoke('get-daf-yomi'),
  fetchIcal:            (url)            => ipcRenderer.invoke('fetch-ical', url),
  getSystemStats:       ()               => ipcRenderer.invoke('get-system-stats'),
  checkForUpdate:       ()               => ipcRenderer.invoke('check-for-update'),
  setGlobalShortcut:    (accel)          => ipcRenderer.send('set-global-shortcut', accel),
  setPanelLocked:     (v)    => ipcRenderer.send('set-panel-locked', v),
  showPanel:          ()     => ipcRenderer.send('show-panel'),
  hidePanel:          ()     => ipcRenderer.send('hide-panel'),
  setLauncherColor:   (c)    => ipcRenderer.send('set-launcher-color', c),
  setLauncherTrigger: (t)    => ipcRenderer.send('set-launcher-trigger', t),
  setLauncherSize:    (s)    => ipcRenderer.send('set-launcher-size', s),
  onSetColor:         (cb)   => ipcRenderer.on('set-color',   (_, c) => cb(c)),
  onSetTrigger:       (cb)   => ipcRenderer.on('set-trigger', (_, t) => cb(t)),

  // System theme
  getNativeTheme:       ()     => ipcRenderer.invoke('get-native-theme'),
  onSystemThemeChange:  (cb)   => ipcRenderer.on('native-theme-changed', (_, isDark) => cb(isDark)),

  // Launcher weather + text color
  sendLauncherWeather:  (data) => ipcRenderer.send('send-launcher-weather', data),
  setLauncherTextColor: (c)    => ipcRenderer.send('set-launcher-text-color', c),
  onWeatherUpdate:      (cb)   => ipcRenderer.on('on-weather-update', (_, w) => cb(w)),
  onSetTextColor:       (cb)   => ipcRenderer.on('set-text-color',    (_, c) => cb(c)),

  // Launcher width (slider-based size)
  setLauncherWidth:    (w)  => ipcRenderer.send('set-launcher-width',    w),
  onSetWidth:          (cb) => ipcRenderer.on('set-width', (_, w) => cb(w)),

  // Launcher position / appearance
  setLauncherVPos:     (v)  => ipcRenderer.send('set-launcher-vpos',     v),
  setLauncherOffsetX:  (px) => ipcRenderer.send('set-launcher-offset-x', px),
  setLauncherCorner:   (c)  => ipcRenderer.send('set-launcher-corner',   c),
  setLauncherShowIcon: (v)  => ipcRenderer.send('set-launcher-show-icon',v),
  setLauncherShowCity: (v)  => ipcRenderer.send('set-launcher-show-city',v),
  onSetCorner:   (cb) => ipcRenderer.on('set-corner',    (_, c) => cb(c)),
  onSetShowIcon: (cb) => ipcRenderer.on('set-show-icon', (_, v) => cb(v)),
  onSetShowCity: (cb) => ipcRenderer.on('set-show-city', (_, v) => cb(v)),

  // Drag (main-process handles movement via screen.getCursorScreenPoint)
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd:   () => ipcRenderer.send('drag-end'),

  // Auto-start with Windows
  getLoginItem: ()        => ipcRenderer.invoke('get-login-item'),
  setLoginItem: (enable)  => ipcRenderer.send('set-login-item', enable),
});
