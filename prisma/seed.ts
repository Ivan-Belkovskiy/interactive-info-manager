import { prisma } from '../src/lib/prisma'; 
import bcrypt from 'bcryptjs';

async function main() {
  console.log(' !Start Prisma DB Seed! ');

  const adminLogin = 'Manager'; 
  const rawPassword = 'Dragon851171!';

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  await prisma.users.upsert({
    where: { login: adminLogin },
    update: {},
    create: {
      login: adminLogin,
      password: hashedPassword,
    },
  });

  console.log(`✅ User "${adminLogin}" successfully created!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });