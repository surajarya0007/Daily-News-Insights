const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCounts() {
  const articles = await prisma.article.findMany();
  const counts = {};
  articles.forEach(a => {
    if (a.categories) {
      a.categories.forEach(c => {
        counts[c] = (counts[c] || 0) + 1;
      });
    }
  });

  const homepageCats = ['Home', 'India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'];
  console.log('\n--- Article Counts per Homepage Category (Google News RSS) ---');
  homepageCats.forEach(cat => {
    if (cat === 'Home') {
      console.log(`- ${cat}: ${articles.length} articles`);
    } else {
      console.log(`- ${cat}: ${counts[cat] || 0} articles`);
    }
  });
}

async function triggerIngestion(category) {
  console.log(`[Script] Triggering ingestion for: ${category}`);
  try {
    const res = await fetch(`http://localhost:5000/api/news/ingest?category=${category}`, { method: 'POST' });
    const data = await res.json();
    console.log(`[Script] Ingestion result for ${category}:`, JSON.stringify(data));
  } catch (err) {
    console.error(`[Script] Failed to trigger ingestion for ${category}:`, err.message);
  }
}

async function main() {
  // 1. Initial count check
  await checkCounts();

  // 2. Trigger ingestion for categories that need data
  const targetCategories = ['world', 'science', 'health', 'politics', 'entertainment', 'finance', 'business'];
  for (const cat of targetCategories) {
    await triggerIngestion(cat);
    // Wait a brief moment to allow server processing
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 3. Final count check
  console.log('\n=== Ingestion Completed. Fetching final database counts... ===');
  await checkCounts();
}

main().catch(console.error).finally(() => prisma.$disconnect());
