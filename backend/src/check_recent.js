const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent Articles:');
  articles.forEach(a => {
    console.log(`- Headline: ${a.headline}`);
    console.log(`  Categories: ${JSON.stringify(a.categories)}`);
    console.log(`  Source: ${a.sourceName}`);
    console.log(`  CreatedAt: ${a.createdAt}`);
    console.log(`  Url: ${a.sourceUrl}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
