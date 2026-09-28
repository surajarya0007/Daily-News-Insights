import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Disclaimer | Daily News Insights',
  description: 'Read our disclaimers concerning AI-synthesized content, data sources, accuracy, and copyright practices.',
};

export default function DisclaimerPage() {
  return (
    <Layout showNav={false}>
      <div className="static-page" style={{ maxWidth: 880, paddingTop: 60 }}>
        <ScrollReveal>
          <h1>Disclaimer</h1>
          <p className="page-subtitle" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)', marginBottom: 32 }}>
            Effective Date: June 20, 2026 | Last Updated: July 2, 2026
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
            1. AI-Assisted Synthesis & Editorial Oversight
          </p>
          <p>
            Daily News Insights is an innovative, technology-driven platform that utilizes advanced machine learning models and web-scraping pipelines to discover, aggregate, and structure news reports from around the world.
          </p>
          <p style={{ fontWeight: 500, fontStyle: 'italic', borderLeft: '3px solid var(--ir-crimson)', paddingLeft: 16, margin: '20px 0' }}>
            While Daily News Insights utilizes AI-assisted technologies to aggregate and structure data, all final content is curated, reviewed, and authorized by our editorial team.
          </p>
          <p>
            Our technology programmatically clusters trending topics and drafts initial reports. A human editor supervises this flow, auditing the resulting dossiers for facts, formatting, and contextual integrity to maintain high standards of journalistic credibility.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            2. No Professional Advice
          </p>
          <p>
            The content published on this website is provided for general informational and educational purposes only. It should not be construed as professional, legal, medical, financial, investment, or tax advice.
          </p>
          <p>
            We strongly encourage our readers to independently verify any information, facts, or statistics presented here before making decisions or taking actions based on our articles. Relying on any information provided on this platform is done solely at your own risk.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            3. Accuracy and Reliability of Information
          </p>
          <p>
            While we make reasonable efforts to verify facts and gather information from established, reputable publications, we do not warrant or guarantee the absolute correctness, completeness, reliability, or timeliness of any content on this site.
          </p>
          <p>
            Because news is fast-moving and synthesized from external resources, errors or omissions may occasionally occur. If you notice any factual errors or synthesized misrepresentations, please contact us for a prompt review and correction.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            4. Image Ownership and Copyright
          </p>
          <p>
            All news photographs, logos, and images displayed on Daily News Insights are gathered from publicly available feeds, search engines, or open databases on the Internet. We do not claim ownership, copyright, or licensing rights over third-party images.
          </p>
          <p>
            All rights belong to their respective copyright holders. If you are a publisher or photographer and believe an image has been used in a manner that infringes your copyright, please reach out to us at <a href="mailto:aryasuraj351@gmail.com" style={{ color: 'var(--ir-crimson)', textDecoration: 'underline' }}>aryasuraj351@gmail.com</a> with the relevant URL. We will review and remove the image immediately.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            5. External Links and Endorsements
          </p>
          <p>
            Our reports frequently contain links to original sources, primary publishers, and external third-party websites. These links are provided to help readers trace facts and support our commitment to source transparency.
          </p>
          <p>
            We have no control over the content, reliability, or privacy policies of those external websites, and linking to them does not constitute an endorsement of their views, opinions, or products.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <p style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.8, marginBottom: 24, marginTop: 32 }}>
            6. Limitation of Liability
          </p>
          <p style={{ marginBottom: 32 }}>
            Under no circumstances shall Daily News Insights, its developers, operators, or affiliates be liable for any direct, indirect, special, incidental, or consequential damages, including loss of data, reputation, or profit, arising from your access to, use of, or inability to use this platform or its contents.
          </p>
        </ScrollReveal>
      </div>
    </Layout>
  );
}
