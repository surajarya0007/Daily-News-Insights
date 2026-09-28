import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Terms of Service | Daily News Insights',
  description: 'Review the terms that govern your use of Daily News Insights and our automated news platform.',
};

export default function TermsOfService() {
  return (
    <Layout showNav={false}>
      <div className="static-page" style={{ maxWidth: 880, paddingTop: 60 }}>
        <ScrollReveal>
          <h1>Terms of Service</h1>
          <p className="page-subtitle" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)', marginBottom: 32 }}>
            Effective Date: June 20, 2026 | Last Updated: June 20, 2026
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
            1. Acceptance of Terms
          </p>
          <p>
            Welcome to Daily News Insights ("Platform", "we", "our", "us"). By accessing or using this website, you agree to be bound by these Terms of Service ("Terms"). If you do not agree with these Terms, please discontinue use of the Platform immediately.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            2. Description of Service
          </p>
          <p>
            Daily News Insights is an automated, AI-powered news aggregation and synthesis platform. Our technology programmatically clusters trending topics and utilizes artificial intelligence to generate objective, multi-source informational briefings. We reserve the right to modify, suspend, or discontinue any part of the Platform at any time without prior notice.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            3. AI-Generated Content & Disclaimer of Accuracy
          </p>
          <p>
            The content published on this Platform is synthesized, aggregated, and formatted entirely by artificial intelligence models based on third-party data sources.
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 12 }}>
              <strong>No Guarantee of Accuracy:</strong> While we program our systems to prioritize factual reporting, AI can occasionally generate incorrect information ("hallucinations"). We do not guarantee the completeness, reliability, or real-time accuracy of any synthesized article.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>Not Professional Advice:</strong> Content on Daily News Insights should not be considered professional, legal, medical, financial, or investment advice. All content is intended for general informational and entertainment purposes only.
            </li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            4. Intellectual Property & DMCA Safe Harbor
          </p>
          <p>
            Daily News Insights respects the intellectual property rights of others. Our automated systems generate content by analyzing publicly available information.
          </p>
          <ul style={{ listStyleType: 'none', paddingLeft: 0, marginBottom: 18 }}>
            <li style={{ marginBottom: 16 }}>
              <strong>A. Platform IP:</strong> Unless otherwise stated, the website design, branding, logos, and the unique synthesis algorithms of Daily News Insights are owned by the Platform. Unauthorized manual or automated reproduction of our synthesized content is prohibited.
            </li>
            <li style={{ marginBottom: 16 }}>
              <strong>B. Copyright & DMCA Takedown Notice:</strong> If you are a publisher or copyright owner and believe that our automated ingestion systems have improperly utilized your copyrighted material beyond the scope of Fair Use, you may submit a takedown request under the Digital Millennium Copyright Act (DMCA). Please provide our Designated Copyright Agent with the following:
              <ul style={{ listStyleType: 'circle', paddingLeft: 20, marginTop: 8 }}>
                <li style={{ marginBottom: 6 }}>A physical or electronic signature of the copyright owner.</li>
                <li style={{ marginBottom: 6 }}>Identification of the copyrighted work claimed to have been infringed.</li>
                <li style={{ marginBottom: 6 }}>The specific URL on Daily News Insights containing the allegedly infringing material.</li>
                <li style={{ marginBottom: 6 }}>Your contact information (email address and phone number).</li>
                <li style={{ marginBottom: 6 }}>A statement of good faith belief that the use is unauthorized, and a statement under penalty of perjury that the information is accurate.</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                Please send takedown notices to: <a href="mailto:aryasuraj351@gmail.com" style={{ color: 'var(--ir-crimson)', textDecoration: 'underline' }}>aryasuraj351@gmail.com</a>
              </p>
            </li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            5. Acceptable Use & Anti-Scraping
          </p>
          <p>
            You agree to use the Platform only for lawful purposes. You strictly agree not to:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 8 }}>Use automated scripts, bots, spiders, or scrapers to extract, copy, or redistribute our synthesized articles or database records at scale.</li>
            <li style={{ marginBottom: 8 }}>Attempt to bypass our security measures, rate limits, or intentionally overwhelm our hosting infrastructure (e.g., DDoS attacks).</li>
            <li style={{ marginBottom: 8 }}>Engage in any fraudulent clicking or automated interaction with the programmatic advertisements displayed on our site.</li>
            <li style={{ marginBottom: 8 }}>Use any content from our Platform to train external artificial intelligence models or systems without explicit written consent.</li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            6. Third-Party Sources and Links
          </p>
          <p>
            Our automated articles frequently cite and provide hyperlinks to the original third-party publishers used in the synthesis process. We have no editorial control over these external websites and are not responsible for their content, privacy policies, or practices. Accessing third-party links is done entirely at your own risk.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            7. Limitation of Liability
          </p>
          <p>
            To the fullest extent permitted by applicable law, Daily News Insights, its developers, and operators shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, marginBottom: 18 }}>
            <li style={{ marginBottom: 8 }}>Your use of or inability to use the Platform.</li>
            <li style={{ marginBottom: 8 }}>Decisions made or actions taken based on the AI-synthesized content provided on the Platform.</li>
            <li style={{ marginBottom: 8 }}>Loss of data, revenue, or digital access.</li>
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            8. Indemnification
          </p>
          <p>
            You agree to indemnify, defend, and hold harmless Daily News Insights and its operators from any claims, damages, losses, or liabilities (including legal fees) arising out of your use of the Platform, your violation of these Terms, or your infringement of any third-party rights.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            9. Governing Law and Jurisdiction
          </p>
          <p>
            These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Aligarh, Uttar Pradesh, India.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            10. Changes to Terms
          </p>
          <p>
            We may update these Terms of Service periodically to reflect changes in our automated processes, legal requirements, or advertising network policies. Continued use of the Platform after updates constitutes your formal acceptance of the revised Terms.
          </p>
        </ScrollReveal>
      </div>
    </Layout>
  );
}
