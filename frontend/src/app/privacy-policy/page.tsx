import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Daily News Insights',
  description: 'Read how Daily News Insights collects, stores, and protects user data across the platform.',
};

export default function PrivacyPolicy() {
  return (
    <Layout showNav={false}>
      <div className="static-page" style={{ maxWidth: 880, paddingTop: 60 }}>
        <ScrollReveal>
          <h1>Privacy Policy</h1>
          <p className="page-subtitle" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)', marginBottom: 32 }}>
            Effective Date: June 20, 2026 | Last Updated: June 20, 2026
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
            1. Introduction
          </p>
          <p>
            Welcome to Daily News Insights (“Company”, “we”, “our”, “us”). We respect your privacy and are committed to protecting your personal data. Because our platform serves a global audience, we process personal data in accordance with applicable data protection laws, including the Digital Personal Data Protection Act, 2023 (DPDP Act) in India, the General Data Protection Regulation (GDPR) in the European Union/UK, and the California Consumer Privacy Act (CCPA/CPRA) in the United States.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            2. Information We Collect
          </p>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)', marginBottom: 12 }}>
            A. Information You Provide Voluntarily
          </p>
          <p style={{ marginBottom: 24 }}>
            If you choose to contact us, subscribe to newsletters, or create an account (if applicable), we may collect your name, email address, username, and any information submitted through forms. Account creation is completely optional.
          </p>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)', marginBottom: 12 }}>
            B. Automatically Collected Information & Advertising Data
          </p>
          <p>
            When you access our website, we and our third-party advertising partners automatically collect:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 8 }}>IP address, device type, operating system, and browser type.</li>
            <li style={{ marginBottom: 8 }}>Pages visited, time spent on the site, and referring URLs.</li>
            <li style={{ marginBottom: 8 }}>Ad-related identifiers: Unique mobile advertising IDs and tracking cookies used by ad networks to display relevant marketing materials.</li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            3. Purpose of Data Collection
          </p>
          <p>
            We collect and process personal data to:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 8 }}>Provide, optimize, and maintain website functionality.</li>
            <li style={{ marginBottom: 8 }}>Respond to inquiries or user support requests.</li>
            <li style={{ marginBottom: 8 }}>Deliver and optimize advertisements: Show relevant ads to users, monitor ad performance, and generate advertising revenue.</li>
            <li style={{ marginBottom: 8 }}>Ensure platform security, monitor traffic anomalies, and prevent fraudulent activity.</li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            4. Third-Party Advertising & Cookie Disclosures (Required for Ad Networks)
          </p>
          <p>
            Our website displays advertisements served by third-party ad networks (such as Google AdSense). These third-party vendors use cookies, web beacons, and unique identifiers to serve ads based on your previous visits to our website or other sites on the internet.
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 12 }}>
              <strong>Google’s DART Cookie:</strong> Google’s use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>Opting Out:</strong> Users may opt out of personalized advertising by visiting Google Ads Settings or by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ir-crimson)', textDecoration: 'underline' }}>www.aboutads.info</a>.
            </li>
          </ul>
          <p>
            You can manage or disable cookies through your individual browser settings, though doing so may impact how certain features of our platform function.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            5. AI-Synthesized Content
          </p>
          <p>
            Our platform publishes multi-source content aggregated and synthesized with the assistance of Artificial Intelligence (AI). User interaction data may be used internally to improve content relevance and website performance. We do not sell your personal details to third parties, nor do we feed personal user information into external AI training models.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            6. Data Sharing and Disclosure
          </p>
          <p>
            We do not sell personal data for monetary gains. However, to keep our website running, we share limited diagnostic and usage data with:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 8 }}>Cloud infrastructure, DNS, and hosting networks (e.g., Cloudflare, Supabase).</li>
            <li style={{ marginBottom: 8 }}>Analytics frameworks (e.g., Google Analytics).</li>
            <li style={{ marginBottom: 8 }}>Programmatic ad exchanges and marketing networks.</li>
            <li style={{ marginBottom: 8 }}>Legal authorities if strictly requested under valid law enforcement protocols.</li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            7. Global User Rights
          </p>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)', marginBottom: 12 }}>
            A. Indian Residents (DPDP Act)
          </p>
          <p style={{ marginBottom: 16 }}>
            You have the right to access your personal data, request correction of inaccurate data, request erasure, or withdraw your consent.
          </p>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)', marginBottom: 12 }}>
            B. EU/UK Residents (GDPR)
          </p>
          <p style={{ marginBottom: 16 }}>
            You have the right to access, rectify, or erase your personal data, restrict or object to processing, and request data portability. Where processing relies on consent, you can withdraw it at any time.
          </p>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)', marginBottom: 12 }}>
            C. US Residents (CCPA/CPRA)
          </p>
          <p style={{ marginBottom: 24 }}>
            You have the right to know what personal data we collect, request deletion, opt out of the "sale or sharing" of your personal information for targeted advertising, and not receive discriminatory treatment for exercising your rights.
          </p>
          <p>
            To exercise any of these rights, please contact us using the information provided below.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            8. Data Retention
          </p>
          <p>
            We retain personal data only as long as necessary to provide services, fulfill legal obligations, resolve operational disputes, and enforce our agreements.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            9. Children's Privacy
          </p>
          <p>
            Our platform is intended for a general audience and is not targeted toward individuals under 13 years of age (or 18 in jurisdictions where required by law). We do not knowingly collect personal data from minors.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            10. Contact Us
          </p>
          <p>
            If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
          </p>
          <p style={{ margin: 0 }}>
            Email: <a href="mailto:aryasuraj351@gmail.com" style={{ color: 'var(--ir-crimson)', textDecoration: 'underline' }}>aryasuraj351@gmail.com</a>
          </p>
          <p style={{ margin: '8px 0 0 0' }}>
            Website: <a href="https://dailynewsinsights.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ir-crimson)', textDecoration: 'underline' }}>dailynewsinsights.com</a>
          </p>
        </ScrollReveal>
      </div>
    </Layout>
  );
}
