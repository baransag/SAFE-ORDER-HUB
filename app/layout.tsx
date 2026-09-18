import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAFE ORDER HUB — SAFE SOLUTIONS Internal Management',
  description: 'Internal Sales, Operations, and Order Management Platform for SAFE SOLUTIONS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#F7F9FC] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
