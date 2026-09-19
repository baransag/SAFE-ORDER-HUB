import type { Metadata, Viewport } from 'next';
import './globals.css';
import SafeCopilotFloating from '@/components/SafeCopilotFloating';

export const metadata: Metadata = {
  title: 'SAFE ORDER HUB — SAFE SOLUTIONS Internal Management',
  description: 'Internal Sales, Orders, Delivery & Business Intelligence System for SAFE SOLUTIONS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SAFE HUB',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#F6F8FC] text-[#172033] antialiased selection:bg-teal-100 selection:text-teal-900">
        {children}
        <SafeCopilotFloating />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
