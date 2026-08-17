import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watchlr.app',
  appName: 'Watchlr',
  // Offline/loading fallback assets. The app normally loads `server.url` below.
  webDir: 'capacitor-www',
  // Present a normal mobile-Chrome user agent. The default Android WebView UA
  // contains the "wv" token, which embed providers (2embed/vidsrc/flixer) use to
  // detect an in-app browser and refuse to play. This makes us look like Chrome.
  overrideUserAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  server: {
    // The native WebView loads this deployed URL. Because Watchlr relies on a
    // Node backend (API routes, next-auth, MongoDB), the APK is a thin shell
    // around the hosted site rather than a bundled static app.
    url: 'https://watchlr.justtayyabkhan.com/',
    androidScheme: 'https',
    // Keep false so only real HTTPS is allowed (no cleartext HTTP).
    cleartext: false,
  },
};

export default config;
