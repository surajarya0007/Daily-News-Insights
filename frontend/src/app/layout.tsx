import type { Metadata } from "next";
import { Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { siteUrl } from "../lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Daily News Insights",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  name: "Daily News Insights",
  url: siteUrl,
  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}/favicon.ico`,
  },
  sameAs: [],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Daily News Insights - Autonomous News Intelligence Platform",
  description:
    "Daily News Insights (DNI) delivers AI-synthesized news covering India, World, Business, Tech, Science, Health and more. Updated every 4 hours with real-time intelligence.",
  keywords: "news insights, AI news, autonomous news, Daily News Insights, DNI, breaking news, world news, business news, technology news",
  authors: [{ name: "Daily News Insights Editorial Desk" }],
  alternates: {
    canonical: "/",
    types: {
      'application/rss+xml': `${siteUrl}/feed.xml`,
    },
  },
  openGraph: {
    title: "Daily News Insights - Autonomous News Intelligence Platform",
    description: "AI-synthesized news covering India, World, Business, Tech, Science, Health and more.",
    url: "/",
    type: "website",
    locale: "en_IN",
    siteName: "Daily News Insights",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily News Insights",
    description: "Daily News Insights - Autonomous News Intelligence Platform",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-7269654171240753";
  
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${sourceSerif.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="33Py6xfPlW7GFKro5pRaEFVKRdLp-22ejIpY24euPl4" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href="/favicon.ico" />
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} />
        )}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="preconnect" href="https://live.staticflickr.com" />
        
        {/* Google AdSense */}
        <meta name="google-adsense-account" content="ca-pub-7269654171240753" />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('ir-theme');
                  var theme = stored === 'light' || stored === 'dark'
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.style.colorScheme = theme;

                  // Lock the data-theme attribute using MutationObserver to prevent hydration resets
                  var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      if (mutation.attributeName === 'data-theme') {
                        var current = document.documentElement.getAttribute('data-theme');
                        if (current !== theme) {
                          observer.disconnect();
                          document.documentElement.setAttribute('data-theme', theme);
                          document.documentElement.style.colorScheme = theme;
                          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                        }
                      }
                    });
                  });
                  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                  window.__themeObserver = observer;
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
