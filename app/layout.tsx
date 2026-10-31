import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "The Gentlemen's Club | Luxury Men's Grooming in Khulna", template: "%s | The Gentlemen's Club" },
  description: "A considered grooming experience in Khulna. Discover precision haircuts, beard styling and refined men's grooming at The Gentlemen's Club.",
  openGraph: { type: 'website', url: siteUrl, siteName: "The Gentlemen's Club", title: "The Gentlemen's Club | Luxury Men's Grooming in Khulna", description: 'Precision barbering, personal service and a little time well spent.' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<SiteFooter /></body></html>;
}
