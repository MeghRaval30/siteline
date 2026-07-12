const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding categories and assets...');

  // Create Categories
  const catLaptop = await prisma.assetCategory.upsert({
    where: { name: 'Laptops' },
    update: {},
    create: {
      name: 'Laptops',
      description: 'Company issued laptops and computers',
    },
  });

  const catMonitor = await prisma.assetCategory.upsert({
    where: { name: 'Monitors' },
    update: {},
    create: {
      name: 'Monitors',
      description: 'External displays and monitors',
    },
  });

  const catFurniture = await prisma.assetCategory.upsert({
    where: { name: 'Furniture' },
    update: {},
    create: {
      name: 'Furniture',
      description: 'Office chairs, desks, etc.',
    },
  });

  // Create Assets
  const assets = [
    {
      asset_tag: 'AF-0001',
      name: 'MacBook Pro 14" M2',
      category_id: catLaptop.id,
      serial_number: 'C02XH123456',
      condition: 'Excellent',
      location: 'NY Office',
      status: 'Available',
      is_bookable: true,
      acquisition_cost: 1999.99,
    },
    {
      asset_tag: 'AF-0002',
      name: 'Dell UltraSharp 27"',
      category_id: catMonitor.id,
      serial_number: 'CN-0ABCDE-12345',
      condition: 'Good',
      location: 'NY Office',
      status: 'Available',
      is_bookable: true,
      acquisition_cost: 450.00,
    },
    {
      asset_tag: 'AF-0003',
      name: 'Herman Miller Aeron Chair',
      category_id: catFurniture.id,
      serial_number: 'HM-A-9876',
      condition: 'Excellent',
      location: 'HQ',
      status: 'In Use',
      is_bookable: false,
      acquisition_cost: 1200.00,
    },
    {
      asset_tag: 'AF-0004',
      name: 'Lenovo ThinkPad X1 Carbon',
      category_id: catLaptop.id,
      serial_number: 'PF123456',
      condition: 'Fair',
      location: 'Remote',
      status: 'Maintenance',
      is_bookable: false,
      acquisition_cost: 1500.00,
    }
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { asset_tag: asset.asset_tag },
      update: {},
      create: asset,
    });
  }

  console.log('Seeding complete! 3 categories and 4 assets created.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
