import './globals.css';
import { AppProvider } from '@/app/layout/AppProvider';
export const instant = false;
const description =
  'EarthSignal turns NASA observations into investigations: detect a trend, examine the physics behind it, and explore what could happen next.';

export const metadata = {
  title: 'EarthSignal — NASA Earth Trend Investigation',
  description,
  openGraph: {
    title: 'EarthSignal — NASA Earth Trend Investigation',
    description,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#131D38] text-[#f4f1ea] antialiased selection:bg-[#ffc20d] selection:text-[#131D38]">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
