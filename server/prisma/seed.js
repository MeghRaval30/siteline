const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Deterministic random generator for seeded data
let seed = 12345;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randomChoice(arr) { return arr[Math.floor(random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(random() * (max - min + 1)) + min; }

async function main() {
  console.log('Cleaning database...');
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
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.conversationSession.deleteMany();

  console.log('Creating Departments...');
  const execDept = await prisma.department.create({ data: { name: 'Executive' } });
  const opsDept = await prisma.department.create({ data: { name: 'Operations' } });
  const itDept = await prisma.department.create({ data: { name: 'IT', parent_dept_id: opsDept.id } });
  const hrDept = await prisma.department.create({ data: { name: 'HR' } });
  const engDept = await prisma.department.create({ data: { name: 'Engineering', parent_dept_id: opsDept.id } });
  const finDept = await prisma.department.create({ data: { name: 'Finance' } });
  const legDept = await prisma.department.create({ data: { name: 'Legal' } });
  const mktDept = await prisma.department.create({ data: { name: 'Marketing', parent_dept_id: execDept.id } });
  const salesDept = await prisma.department.create({ data: { name: 'Sales', parent_dept_id: execDept.id } });
  const rdDept = await prisma.department.create({ data: { name: 'R&D' } });
  const facDept = await prisma.department.create({ data: { name: 'Facilities' } });
  const secDept = await prisma.department.create({ data: { name: 'Security' } });

  const depts = [execDept, opsDept, itDept, hrDept, engDept, finDept, legDept, mktDept, salesDept, rdDept, facDept, secDept];

  console.log('Creating Users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const roles = ['Admin', 'Admin', 'AssetManager', 'AssetManager', 'AssetManager', 'AssetManager', 'AssetManager', 
                 'DeptHead', 'DeptHead', 'DeptHead', 'DeptHead', 'DeptHead', 'Auditor', 'Auditor', 'Auditor'];
  for (let i = roles.length; i < 50; i++) roles.push('Employee');
  
  const firstNames = ['John', 'Jane', 'Alex', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Daniel', 'Olivia', 'James', 'Sophia', 'Robert', 'Isabella', 'William', 'Mia', 'Joseph', 'Charlotte', 'Thomas', 'Amelia', 'Charles', 'Harper', 'Christopher', 'Evelyn', 'Matthew', 'Abigail'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris'];

  // Create the 3 demo accounts that the Login page references
  const demoAdmin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@siteline.local', password_hash: passwordHash, role: 'Admin', department_id: execDept.id }
  });
  const demoManager = await prisma.user.create({
    data: { name: 'Manager User', email: 'manager@siteline.local', password_hash: passwordHash, role: 'AssetManager', department_id: opsDept.id }
  });
  const demoEmployee = await prisma.user.create({
    data: { name: 'Alice Johnson', email: 'alice@siteline.local', password_hash: passwordHash, role: 'Employee', department_id: itDept.id }
  });

  const users = [demoAdmin, demoManager, demoEmployee];
  for (let i = 0; i < 50; i++) {
    const role = roles[i];
    const dept = randomChoice(depts);
    const fname = randomChoice(firstNames);
    const lname = randomChoice(lastNames);
    const user = await prisma.user.create({
      data: {
        name: `${fname} ${lname}`,
        email: `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@siteline.app`,
        password_hash: passwordHash,
        role: role,
        department_id: dept.id
      }
    });
    users.push(user);
    // Assign DeptHeads
    if (role === 'DeptHead' && !dept.head_user_id) {
      await prisma.department.update({ where: { id: dept.id }, data: { head_user_id: user.id } });
    }
  }
  const adminId = users.find(u => u.role === 'Admin').id;

  console.log('Creating Asset Categories...');
  const categoryNames = ['Laptops', 'Desktops', 'Monitors', 'Printers', 'Servers', 'Network Equipment', 'Phones', 'Tablets', 'Furniture', 'Vehicles', 'Lab Equipment', 'Safety Equipment', 'AV Equipment', 'Power Tools', 'HVAC Systems'];
  const categories = [];
  for (const name of categoryNames) {
    const cat = await prisma.assetCategory.create({ data: { name, description: `${name} category` } });
    categories.push(cat);
  }

  console.log('Creating Assets...');
  const conditions = ['New', 'Good', 'Good', 'Good', 'Fair', 'Fair', 'Poor'];
  const locations = ['HQ-Floor1', 'HQ-Floor2', 'HQ-Floor3', 'Branch-East', 'Branch-West', 'Warehouse-A'];
  const baseAssets = {
    'Laptops': ['MacBook Pro 16" M3 Max', 'MacBook Air M2', 'Dell XPS 15', 'Lenovo ThinkPad X1', 'HP Spectre x360'],
    'Desktops': ['Dell OptiPlex 7090', 'HP EliteDesk 800', 'Apple Mac Studio', 'Lenovo ThinkCentre M720'],
    'Monitors': ['Dell UltraSharp 27', 'LG UltraFine 4K', 'BenQ PD2700U', 'ASUS ProArt Display'],
    'Printers': ['HP LaserJet Pro', 'Epson EcoTank', 'Brother HL-L2350DW'],
    'Servers': ['Dell PowerEdge R740', 'HP ProLiant DL380', 'Cisco UCS C220'],
    'Network Equipment': ['Cisco Catalyst 9300', 'Ubiquiti UniFi Switch', 'Meraki MR46', 'Palo Alto PA-220'],
    'Phones': ['iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8'],
    'Tablets': ['iPad Pro 12.9"', 'Samsung Galaxy Tab S9', 'Microsoft Surface Pro 9'],
    'Furniture': ['Herman Miller Aeron', 'Steelcase Gesture', 'Standing Desk Pro', 'Meeting Table 8-person'],
    'Vehicles': ['Ford Transit Connect', 'Toyota RAV4 Hybrid', 'Tesla Model 3'],
    'Lab Equipment': ['Centrifuge 5424 R', 'Microscope CX43', 'Fume Hood 4ft', 'Incubator IN55'],
    'Safety Equipment': ['Fire Extinguisher ABC', 'First Aid Kit XL', 'Hard Hat Pro', 'Safety Harness'],
    'AV Equipment': ['Sony A7 III', 'Shure SM7B Microphone', 'Logitech Rally Bar', 'Epson Pro Cinema Projector'],
    'Power Tools': ['DeWalt 20V Drill', 'Makita Circular Saw', 'Milwaukee Impact Driver'],
    'HVAC Systems': ['Carrier Infinity System', 'Trane XR14', 'Daikin Fit']
  };

  const assets = [];
  for (let i = 1; i <= 500; i++) {
    const cat = randomChoice(categories);
    const names = baseAssets[cat.name] || [`Generic ${cat.name}`];
    const name = randomChoice(names);
    const isBookable = ['Vehicles', 'AV Equipment', 'Lab Equipment'].includes(cat.name);
    
    let status = 'Available';
    const randStatus = random();
    if (randStatus < 0.6) status = 'Allocated';
    else if (randStatus < 0.7) status = 'In Maintenance';
    else if (randStatus < 0.75) status = 'Retired';
    else if (randStatus < 0.8) status = 'Lost';

    const asset = await prisma.asset.create({
      data: {
        asset_tag: `AF-${String(i).padStart(4, '0')}`,
        name: name,
        category_id: cat.id,
        serial_number: `SN-${randomInt(100000, 999999)}`,
        acquisition_date: new Date(Date.now() - randomInt(0, 3 * 365) * 86400000),
        acquisition_cost: randomInt(100, 5000),
        condition: randomChoice(conditions),
        location: randomChoice(locations),
        is_bookable: isBookable,
        status: status,
      }
    });
    assets.push(asset);
  }

  console.log('Creating Allocations...');
  for (let i = 0; i < 200; i++) {
    const asset = randomChoice(assets.filter(a => a.status === 'Allocated'));
    if (!asset) continue;
    const user = randomChoice(users);
    
    const isOverdue = random() < 0.15;
    const allocatedAt = new Date(Date.now() - randomInt(10, 100) * 86400000);
    let expectedReturn = null;
    
    if (isOverdue) {
      expectedReturn = new Date(Date.now() - randomInt(1, 20) * 86400000);
    } else if (random() > 0.5) {
      expectedReturn = new Date(Date.now() + randomInt(10, 100) * 86400000);
    }

    await prisma.allocation.create({
      data: {
        asset_id: asset.id,
        holder_user_id: user.id,
        allocated_by: adminId,
        allocated_at: allocatedAt,
        expected_return_date: expectedReturn,
        condition_at_checkout: 'Good',
        status: 'Active'
      }
    });
  }

  console.log('Creating Maintenance Requests...');
  const maintIssues = [
    'Screen flickering at 60Hz, possible inverter failure',
    'Battery health degraded to 42%, unable to hold charge beyond 1.5 hours',
    'Network port intermittent disconnects under heavy load',
    'Calibration drift exceeding 5% threshold',
    'Strange noise coming from cooling fan',
    'Device fails to power on',
    'Software corrupted, needs re-image',
    'Physical damage to outer casing'
  ];
  
  for (let i = 0; i < 80; i++) {
    const asset = randomChoice(assets);
    const priority = randomChoice(['Critical', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Medium', 'Low', 'Low']);
    const status = randomChoice(['Pending', 'Pending', 'Pending', 'Approved', 'Approved', 'InProgress', 'Resolved', 'Resolved', 'Resolved', 'Rejected']);
    
    await prisma.maintenanceRequest.create({
      data: {
        asset_id: asset.id,
        raised_by: randomChoice(users).id,
        issue_description: randomChoice(maintIssues),
        priority,
        status,
        created_at: new Date(Date.now() - randomInt(0, 30) * 86400000)
      }
    });
  }

  console.log('Creating Bookings...');
  const bookableAssets = assets.filter(a => a.is_bookable);
  for (let i = 0; i < 60; i++) {
    if (bookableAssets.length === 0) break;
    const asset = randomChoice(bookableAssets);
    const start = new Date(Date.now() + randomInt(-10, 20) * 86400000);
    const end = new Date(start.getTime() + randomInt(1, 48) * 3600000);
    
    let status = 'Confirmed';
    if (start < new Date() && end < new Date()) status = 'Completed';
    else if (random() < 0.1) status = 'Cancelled';

    await prisma.booking.create({
      data: {
        asset_id: asset.id,
        booked_by: randomChoice(users).id,
        start_time: start,
        end_time: end,
        status,
        purpose: 'Project requirement'
      }
    });
  }

  console.log('Creating Activity Logs...');
  for (let i = 0; i < 300; i++) {
    await prisma.activityLog.create({
      data: {
        actor_user_id: randomChoice(users).id,
        action: randomChoice(['login', 'asset.viewed', 'report.generated', 'search.performed', 'settings.updated']),
        created_at: new Date(Date.now() - randomInt(0, 7) * 86400000),
        metadata: JSON.stringify({ ip: '192.168.1.x', browser: 'Chrome' })
      }
    });
  }

  console.log('Database seeded successfully!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
