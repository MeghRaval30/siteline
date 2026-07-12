const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Clear existing data in reverse order of dependencies
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.auditCycleAuditor.deleteMany();
  await prisma.auditCycle.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  
  // Clear self-referential tables carefully
  await prisma.department.updateMany({ data: { head_user_id: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  
  console.log('Database cleared.');

  // Create Departments
  const deptIT = await prisma.department.create({ data: { name: 'Information Technology', status: 'Active' } });
  const deptHR = await prisma.department.create({ data: { name: 'Human Resources', status: 'Active' } });
  const deptOps = await prisma.department.create({ data: { name: 'Operations', status: 'Active' } });
  const deptEng = await prisma.department.create({ data: { name: 'Engineering', status: 'Active' } });

  console.log('Departments created.');

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@siteline.local',
      password_hash: passwordHash,
      role: 'Admin',
      department_id: deptIT.id
    }
  });

  const assetManager = await prisma.user.create({
    data: {
      name: 'Asset Manager',
      email: 'manager@siteline.local',
      password_hash: passwordHash,
      role: 'AssetManager',
      department_id: deptOps.id
    }
  });

  const employee1 = await prisma.user.create({
    data: {
      name: 'Alice Engineer',
      email: 'alice@siteline.local',
      password_hash: passwordHash,
      role: 'Employee',
      department_id: deptEng.id
    }
  });

  const employee2 = await prisma.user.create({
    data: {
      name: 'Bob HR',
      email: 'bob@siteline.local',
      password_hash: passwordHash,
      role: 'Employee',
      department_id: deptHR.id
    }
  });

  // Assign heads to departments
  await prisma.department.update({ where: { id: deptIT.id }, data: { head_user_id: admin.id } });
  await prisma.department.update({ where: { id: deptHR.id }, data: { head_user_id: employee2.id } });
  await prisma.department.update({ where: { id: deptEng.id }, data: { head_user_id: employee1.id } });

  console.log('Users created.');

  // Create Categories
  const catLaptop = await prisma.assetCategory.create({ data: { name: 'Laptops', description: 'Portable computers' } });
  const catMonitor = await prisma.assetCategory.create({ data: { name: 'Monitors', description: 'External displays' } });
  const catFurniture = await prisma.assetCategory.create({ data: { name: 'Furniture', description: 'Chairs, desks, etc.' } });
  const catVehicle = await prisma.assetCategory.create({ data: { name: 'Vehicles', description: 'Company cars' } });

  console.log('Categories created.');

  // Create Assets
  const assets = [];
  for (let i = 1; i <= 25; i++) {
    let catId = catLaptop.id;
    let name = `MacBook Pro 16"`;
    let isBookable = false;
    let cost = 2500;
    
    if (i > 10 && i <= 15) {
      catId = catMonitor.id;
      name = `Dell UltraSharp 27"`;
      cost = 400;
    } else if (i > 15 && i <= 20) {
      catId = catFurniture.id;
      name = `Herman Miller Chair`;
      cost = 1200;
    } else if (i > 20) {
      catId = catVehicle.id;
      name = `Toyota Prius (Company Pool)`;
      cost = 25000;
      isBookable = true;
    }

    const asset = await prisma.asset.create({
      data: {
        asset_tag: `AF-${String(i).padStart(4, '0')}`,
        name: `${name} #${i}`,
        category_id: catId,
        serial_number: `SN-${Math.random().toString(36).substring(7).toUpperCase()}`,
        acquisition_date: new Date(Date.now() - Math.random() * 10000000000),
        acquisition_cost: cost,
        condition: 'Good',
        location: 'HQ',
        is_bookable: isBookable,
        status: i % 5 === 0 ? 'In Maintenance' : 'Allocated'
      }
    });
    assets.push(asset);
  }

  console.log('Assets created.');

  // Create Allocations
  await prisma.allocation.create({
    data: {
      asset_id: assets[0].id,
      holder_user_id: employee1.id,
      allocated_by: assetManager.id,
      condition_at_checkout: 'Good',
      status: 'Active'
    }
  });

  await prisma.allocation.create({
    data: {
      asset_id: assets[1].id,
      holder_user_id: employee2.id,
      allocated_by: admin.id,
      condition_at_checkout: 'New',
      status: 'Active'
    }
  });

  // Create Maintenance Requests
  await prisma.maintenanceRequest.create({
    data: {
      asset_id: assets[4].id,
      raised_by: employee1.id,
      issue_description: 'Screen flickering occasionally',
      priority: 'Medium',
      status: 'Pending'
    }
  });

  await prisma.maintenanceRequest.create({
    data: {
      asset_id: assets[9].id,
      raised_by: employee2.id,
      issue_description: 'Battery not holding charge',
      priority: 'High',
      status: 'Approved',
      approved_by: assetManager.id
    }
  });

  // Create Bookings
  const poolVehicle = assets.find(a => a.is_bookable);
  if (poolVehicle) {
    await prisma.booking.create({
      data: {
        asset_id: poolVehicle.id,
        booked_by: employee1.id,
        start_time: new Date(Date.now() + 86400000), // Tomorrow
        end_time: new Date(Date.now() + 172800000), // Day after tomorrow
        status: 'confirmed',
        purpose: 'Client visit'
      }
    });
  }

  // Create Audit Cycle
  const audit = await prisma.auditCycle.create({
    data: {
      name: 'Q3 Asset Audit',
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 86400000),
      status: 'In Progress',
      created_by: admin.id
    }
  });

  await prisma.auditItem.create({
    data: {
      audit_cycle_id: audit.id,
      asset_id: assets[0].id,
      result: 'Pending'
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
