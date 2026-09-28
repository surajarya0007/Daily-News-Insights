import { fetchHomeArticles } from '../lib/seo';
import HomeClient from './HomeClient';

export const revalidate = 60;

export default async function Page() {
  const initialArticles = await fetchHomeArticles();

  return <HomeClient initialArticles={initialArticles} />;
}
