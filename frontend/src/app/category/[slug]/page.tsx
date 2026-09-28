import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  PUBLISHER_NAME,
  SITE_NAME,
  categoryNameFromSlug,
  categoryUrl,
  fetchArticlesForCategory,
  siteUrl,
} from '../../../lib/seo';
import HomeClient from '../../HomeClient';

export const revalidate = 60;

type CategoryPageParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function getCategoryDescription(category: string, articleCount: number) {
  if (!articleCount) {
    return `Latest ${category} coverage from Daily News Insights.`;
  }

  return `Latest ${category} coverage from Daily News Insights, including ${articleCount} recent article${articleCount === 1 ? '' : 's'} and ongoing updates.`;
}

export async function generateMetadata({ params, searchParams }: CategoryPageParams): Promise<Metadata> {
  const { slug } = await params;
  const searchP = await searchParams;
  const page = searchP?.page ? parseInt(searchP.page as string) : 1;
  const category = categoryNameFromSlug(slug);

  if (!category) {
    return {
      title: `Category Not Found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { articles } = await fetchArticlesForCategory(category, page);
  const canonicalUrl = page > 1 ? `${categoryUrl(category)}?page=${page}` : categoryUrl(category);
  const description = getCategoryDescription(category, articles.length);

  return {
    title: `${category} News & Reports | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: PUBLISHER_NAME }],
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: `${category} News & Reports`,
      description,
    },
    twitter: {
      card: 'summary',
      title: `${category} News & Reports`,
      description,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageParams) {
  const { slug } = await params;
  const searchP = await searchParams;
  const page = searchP?.page ? parseInt(searchP.page as string) : 1;
  const category = categoryNameFromSlug(slug);

  if (!category) {
    notFound();
  }

  const { articles } = await fetchArticlesForCategory(category, page);
  const canonicalUrl = page > 1 ? `${categoryUrl(category)}?page=${page}` : categoryUrl(category);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <HomeClient initialArticles={articles} initialNav={category} />
    </>
  );
}
