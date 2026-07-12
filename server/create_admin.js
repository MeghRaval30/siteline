const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@siteline.com' },
    update: {},
    create: {
      email: 'admin@siteline.com',
      name: 'System Admin',
      password_hash: passwordHash,
      role: 'Admin',
      status: 'Active'
    },
  });
  
  console.log('Admin user created:', admin.email);
  console.log('Password: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
