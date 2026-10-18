import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/cairo';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'مواقيت الصلاة – أ.د. على قطب',
  description: 'Prof Ali Kotb Prayer Time — مواقيت الصلاة حسب موقعك، التقويم الهجري، القبلة، ومواقيت رمضان والأعياد.',
  applicationName: 'مواقيت الصلاة',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'مواقيت الصلاة', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b3b33' },
    { media: '(prefers-color-scheme: dark)', color: '#07141a' },
  ],
};

/** iOS startup images: [css width, css height, pixel ratio, file] */
const SPLASH: [number, number, number, string][] = [
  [440, 956, 3, 'splash-1320x2868.png'],
  [430, 932, 3, 'splash-1290x2796.png'],
  [402, 874, 3, 'splash-1206x2622.png'],
  [393, 852, 3, 'splash-1179x2556.png'],
  [390, 844, 3, 'splash-1170x2532.png'],
  [375, 812, 3, 'splash-1125x2436.png'],
  [414, 896, 2, 'splash-828x1792.png'],
  [375, 667, 2, 'splash-750x1334.png'],
];

/** Runs before paint: applies saved language/theme so there is no flash of the wrong layout. */
const BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem('pakpt.settings.v1')||'{}');var l=s.lang||'ar';var d=document.documentElement;d.lang=l;d.dir=l==='ar'?'rtl':'ltr';var t=s.theme||'auto';if(t==='auto'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        {SPLASH.map(([w, h, r, f]) => (
          <link
            key={f}
            rel="apple-touch-startup-image"
            href={`/splash/${f}`}
            media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
