import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Create test user
  const userPassword = await bcrypt.hash('User123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'testuser',
      password: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log(`✅ Test user created: ${user.email}`);

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for development',
      email: 'contact@testorg.com',
      status: 'ACTIVE',
      subscriptionTier: 'PROFESSIONAL',
      members: {
        create: [
          {
            userId: admin.id,
            role: 'OWNER',
          },
          {
            userId: user.id,
            role: 'MEMBER',
          },
        ],
      },
    },
  });

  console.log(`✅ Organization created: ${organization.name}`);

  // Create system settings
  await prisma.systemSettings.upsert({
    where: { key: 'app_name' },
    update: {},
    create: {
      key: 'app_name',
      value: 'Certificate Management Platform',
      category: 'general',
    },
  });

  await prisma.systemSettings.upsert({
    where: { key: 'app_version' },
    update: {},
    create: {
      key: 'app_version',
      value: '1.0.0',
      category: 'general',
    },
  });

  console.log('✅ System settings created');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
