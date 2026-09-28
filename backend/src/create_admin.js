const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const email = 'aryasuraj351@gmail.com';
  const name = 'Suraj Arya';
  const password = 'adminpassword123';
  const passwordHash = hashPassword(password);

  console.log(`[Seed] Checking if admin user "${email}" exists in database...`);
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    console.log(`[Seed] Admin user "${email}" already exists with role: "${existing.role}".`);
    if (existing.role !== 'admin') {
      console.log(`[Seed] Promoting "${email}" to admin role...`);
      const updated = await prisma.user.update({
        where: { email },
        data: { role: 'admin' }
      });
      console.log(`[Seed] Successfully promoted user:`, updated);
    }
  } else {
    console.log(`[Seed] Creating new admin user "${email}" with password: "${password}"...`);
    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'admin'
      }
    });
    console.log(`[Seed] Successfully created admin user:`, created);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
