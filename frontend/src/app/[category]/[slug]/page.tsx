import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleClient from '../../article/[id]/ArticleClient';
import {
  PUBLISHER_NAME,
  SITE_NAME,
  articleUrl,
  buildArticleDescription,
  categoryNameFromSlug,
  categoryUrl,
  findArticleByCategoryAndSlug,
  siteUrl,
} from '../../../lib/seo';

export const revalidate = 900;

type ArticlePageParams = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: ArticlePageParams): Promise<Metadata> {
  const { category, slug } = await params;
  const categoryName = categoryNameFromSlug(category);

  if (!categoryName) {
    return {
      title: `Article Not Found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const article = await findArticleByCategoryAndSlug(categoryName, slug);
  if (!article) {
    return {
      title: `Article Not Found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = buildArticleDescription(article);
  const canonicalUrl = articleUrl(categoryName, article.headline);
  const images = article.imageUrl ? [{ url: article.imageUrl, alt: article.headline }] : [];

  return {
    title: `${article.headline} | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: PUBLISHER_NAME }],
    keywords: [
      article.keyword,
      ...(article.categories || []),
      'Daily News Insights',
      'India news',
    ].filter(Boolean),
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: article.headline,
      description,
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt || article.createdAt,
      authors: [PUBLISHER_NAME],
      section: article.categories?.[0],
      tags: article.categories,
      images,
    },
    twitter: {
      card: article.imageUrl ? 'summary_large_image' : 'summary',
      title: article.headline,
      description,
      images: article.imageUrl ? [article.imageUrl] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageParams) {
  const { category, slug } = await params;
  const categoryName = categoryNameFromSlug(category);

  if (!categoryName) {
    notFound();
  }

  const article = await findArticleByCategoryAndSlug(categoryName, slug);

  if (!article) {
    notFound();
  }

  const canonicalUrl = articleUrl(categoryName, article.headline);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    description: buildArticleDescription(article),
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: {
      '@type': 'Organization',
      name: PUBLISHER_NAME,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/favicon.ico`,
      },
    },
    articleSection: article.categories?.[0],
    keywords: [article.keyword, ...(article.categories || [])].filter(Boolean).join(', '),
    isAccessibleForFree: true,
  };

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
        name: categoryName,
        item: categoryUrl(categoryName),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.headline,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <ArticleClient
        initialArticle={article}
        initialRelated={[]}
        initialMoreStories={[]}
        articleId={article.id}
      />
    </>
  );
}
