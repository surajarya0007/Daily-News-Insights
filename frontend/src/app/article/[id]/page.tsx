import { notFound, redirect } from 'next/navigation';
import { articlePath, fetchArticleForSeo } from '../../../lib/seo';

type ArticlePageParams = {
  params: Promise<{ id: string }>;
};

export default async function ArticleLegacyPage({ params }: ArticlePageParams) {
  const { id } = await params;
  const article = await fetchArticleForSeo(id);

  if (!article) {
    notFound();
  }

  const primaryCategory = article.categories?.[0];
  if (!primaryCategory) {
    notFound();
  }

  redirect(articlePath(primaryCategory, article.headline));
}
