"""
Seed script for AssetFlow Agent database.
Generates realistic synthetic data for manufacturing asset management.
"""
import sqlite3
import random
import os
from datetime import datetime, timedelta

# Reproducible data
random.seed(42)

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, 'assetflow.db')
SCHEMA_PATH = os.path.join(DB_DIR, 'schema.sql')


def random_date(start: datetime, end: datetime) -> str:
    delta = end - start
    offset = random.randint(0, int(delta.total_seconds()))
    return (start + timedelta(seconds=offset)).strftime('%Y-%m-%dT%H:%M:%S')


def seed():
    # Remove existing DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # Apply schema
    with open(SCHEMA_PATH, 'r') as f:
        cur.executescript(f.read())

    # ── Plants ──────────────────────────────────────────────
    plants = [
        (1, 'Detroit Manufacturing Hub', 'Detroit'),
        (2, 'Austin Tech Center', 'Austin'),
        (3, 'Chicago Distribution Center', 'Chicago'),
    ]
    cur.executemany("INSERT INTO plants VALUES (?,?,?)", plants)

    # ── Departments ─────────────────────────────────────────
    departments = [
        (1, 1, 'Assembly'),
        (2, 1, 'Quality Control'),
        (3, 1, 'Maintenance'),
        (4, 2, 'IT'),
        (5, 2, 'R&D'),
        (6, 2, 'Administration'),
        (7, 3, 'Logistics'),
        (8, 3, 'Packaging'),
        (9, 1, 'Welding'),
        (10, 3, 'Fleet Management'),
    ]
    cur.executemany("INSERT INTO departments VALUES (?,?,?)", departments)

    # ── Employees ───────────────────────────────────────────
    first_names = [
        'James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia',
        'David', 'Jennifer', 'William', 'Elizabeth', 'Carlos', 'Aisha',
        'Wei', 'Priya', 'Tomasz', 'Fatima', 'Raj', 'Sarah', 'Ahmed',
        'Yuki', 'Olga', 'Juan', 'Kenji', 'Amara', 'Diego', 'Natasha',
        'Hassan', 'Elena', 'Kwame', 'Sofia', 'Viktor', 'Chen',
    ]
    last_names = [
        'Rodriguez', 'Smith', 'Johnson', 'Williams', 'Brown', 'Garcia',
        'Martinez', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas',
        'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Moore',
        'Lee', 'Clark', 'Patel', 'Kim', 'Nakamura', 'Okafor', 'Mueller',
        'Petrov', 'Svensson', 'Tanaka', 'Nguyen', 'Kowalski', 'Chen', 'Ali',
    ]
    roles = ['Operator', 'Supervisor', 'Technician', 'Engineer', 'Manager',
             'Analyst', 'Team Lead', 'Intern', 'Senior Engineer', 'Coordinator']
    dept_ids = [d[0] for d in departments]

    employees = []
    used_names = set()
    for i in range(1, 36):
        while True:
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            if name not in used_names:
                used_names.add(name)
                break
        role = random.choice(roles)
        dept = random.choice(dept_ids)
        employees.append((i, name, dept, role))
    cur.executemany("INSERT INTO employees VALUES (?,?,?,?)", employees)

    # ── Assets ──────────────────────────────────────────────
    categories_config = {
        'CNC Machine': {
            'names': ['CNC Vertical Mill', 'CNC Lathe Pro', 'CNC 5-Axis Router', 'CNC Plasma Cutter', 'CNC Wire EDM'],
            'prefix': 'CNC', 'bookable': 0, 'critical': 1,
            'locations': ['Machine Shop Bay {n}', 'Production Floor A{n}', 'Heavy Equipment Hall {n}'],
        },
        'Forklift': {
            'names': ['Toyota 8FBE18 Electric Forklift', 'Crown FC 5200 Reach Truck', 'Hyster H50FT Gas Forklift', 'Yale ERC050 Counterbalance'],
            'prefix': 'FLT', 'bookable': 1, 'critical': 0,
            'locations': ['Warehouse Aisle {n}', 'Loading Dock {n}', 'Storage Bay {n}'],
        },
        'Conveyor Belt': {
            'names': ['Dorner 3200 Series Conveyor', 'Hytrol EZ-Logic Conveyor', 'Interroll Belt Conveyor', 'FlexLink X85 Conveyor'],
            'prefix': 'CNV', 'bookable': 0, 'critical': 1,
            'locations': ['Assembly Line {n}', 'Packaging Line {n}', 'Sorting Station {n}'],
        },
        'Compressor': {
            'names': ['Atlas Copco GA 30+', 'Ingersoll Rand R-Series', 'Kaeser SFC 37', 'Sullair ShopTek ST11'],
            'prefix': 'CMP', 'bookable': 0, 'critical': 1,
            'locations': ['Utility Room {n}', 'Compressor Bay {n}', 'Mechanical Room {n}'],
        },
        'Generator': {
            'names': ['Caterpillar C9.3 Diesel Generator', 'Cummins QSB7 Standby Generator', 'Kohler KD800 Generator', 'Generac SD600 Diesel'],
            'prefix': 'GEN', 'bookable': 0, 'critical': 1,
            'locations': ['Power Plant Room {n}', 'Emergency Power Bay {n}', 'Outdoor Generator Pad {n}'],
        },
        'Laptop': {
            'names': ['Dell Latitude 5540', 'Lenovo ThinkPad T14s', 'HP EliteBook 860 G10', 'MacBook Pro 16"'],
            'prefix': 'LPT', 'bookable': 0, 'critical': 0,
            'locations': ['IT Asset Room {n}', 'Office Floor {n}', 'Hot Desk Area {n}'],
        },
        'Meeting Room': {
            'names': ['Boardroom Alpha', 'Conference Room Beta', 'Huddle Space Gamma', 'Training Lab Delta',
                       'Video Suite Epsilon', 'War Room Zeta'],
            'prefix': 'MTR', 'bookable': 1, 'critical': 0,
            'locations': ['Building A Floor {n}', 'Building B Floor {n}', 'Building C Floor {n}'],
        },
        'Vehicle': {
            'names': ['Ford Transit 250 Van', 'Chevrolet Silverado 1500', 'Ram ProMaster Cargo Van',
                       'Toyota Tacoma Utility Truck'],
            'prefix': 'VEH', 'bookable': 1, 'critical': 0,
            'locations': ['Fleet Parking Lot {n}', 'Vehicle Bay {n}', 'Motor Pool {n}'],
        },
        'Welding Station': {
            'names': ['Lincoln PowerMIG 260', 'Miller TIG Dynasty 280', 'ESAB Rebel EMP 235ic',
                       'Fronius TPS 320i MIG Welder'],
            'prefix': 'WLD', 'bookable': 0, 'critical': 1,
            'locations': ['Welding Bay {n}', 'Fabrication Shop {n}', 'Metalwork Area {n}'],
        },
        '3D Printer': {
            'names': ['Stratasys F370 FDM', 'Formlabs Form 3L SLA', 'Markforged X7 Carbon Fiber',
                       'Ultimaker S5 Pro Bundle'],
            'prefix': 'PRT', 'bookable': 1, 'critical': 0,
            'locations': ['Prototyping Lab {n}', 'R&D Workshop {n}', 'Additive Mfg Room {n}'],
        },
    }

    city_codes = {'Detroit': 'DET', 'Austin': 'AUS', 'Chicago': 'CHI'}
    plant_depts = {}
    for d in departments:
        pid = d[1]
        plant_depts.setdefault(pid, []).append(d[0])

    statuses = ['Available'] * 60 + ['Allocated'] * 15 + ['Under Maintenance'] * 15 + ['Reserved'] * 5 + ['Retired'] * 5
    conditions = ['Excellent'] * 25 + ['Good'] * 40 + ['Fair'] * 25 + ['Poor'] * 10

    assets = []
    asset_id = 0
    cat_counters = {}
    now = datetime(2026, 7, 12)
    acq_start = datetime(2019, 1, 1)

    for category, cfg in categories_config.items():
        # Distribute ~12 assets per category across plants
        count = random.randint(10, 15)
        for _ in range(count):
            asset_id += 1
            plant = random.choice(plants)
            plant_id = plant[0]
            city = plant[2]
            city_code = city_codes[city]

            key = f"{cfg['prefix']}-{city_code}"
            cat_counters[key] = cat_counters.get(key, 0) + 1
            asset_tag = f"{cfg['prefix']}-{city_code}-{cat_counters[key]:03d}"

            name = random.choice(cfg['names'])
            status = random.choice(statuses)
            is_bookable = cfg['bookable']
            is_critical = cfg['critical']
            condition = random.choice(conditions)
            acq_date = random_date(acq_start, now - timedelta(days=90))
            loc_template = random.choice(cfg['locations'])
            location = loc_template.format(n=random.randint(1, 6))
            dept_id = random.choice(plant_depts[plant_id])

            assets.append((
                asset_id, asset_tag, name, category, plant_id, dept_id,
                status, is_bookable, is_critical, condition, acq_date, location
            ))

    cur.executemany("INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", assets)

    # ── Asset Allocations ───────────────────────────────────
    allocatable_assets = [a for a in assets if a[6] in ('Allocated', 'Available', 'Under Maintenance')]
    alloc_assets_sample = random.sample(allocatable_assets, min(60, len(allocatable_assets)))

    allocations = []
    alloc_id = 0
    emp_ids = [e[0] for e in employees]

    for asset_row in alloc_assets_sample:
        num_allocs = random.choice([1, 1, 1, 2, 2, 3])
        for _ in range(num_allocs):
            alloc_id += 1
            emp_id = random.choice(emp_ids)
            alloc_start = datetime.fromisoformat(random_date(
                now - timedelta(days=365), now - timedelta(days=5)
            ))
            duration_days = random.randint(3, 90)
            expected_ret = alloc_start + timedelta(days=duration_days)

            # Decide: completed, active, or overdue
            r = random.random()
            if r < 0.45:
                # Completed
                actual_ret = (expected_ret - timedelta(days=random.randint(-5, 10))).strftime('%Y-%m-%dT%H:%M:%S')
                status = 'Returned'
            elif r < 0.70:
                # Active (not yet due)
                actual_ret = None
                expected_ret = now + timedelta(days=random.randint(1, 60))
                status = 'Active'
            else:
                # Overdue
                actual_ret = None
                expected_ret = now - timedelta(days=random.randint(1, 45))
                status = 'Active'

            allocations.append((
                alloc_id, asset_row[0], emp_id,
                alloc_start.strftime('%Y-%m-%dT%H:%M:%S'),
                expected_ret.strftime('%Y-%m-%dT%H:%M:%S'),
                actual_ret,
                status,
            ))

    cur.executemany("INSERT INTO asset_allocations VALUES (?,?,?,?,?,?,?)", allocations)

    # ── Maintenance Requests ────────────────────────────────
    issue_templates = [
        "Hydraulic cylinder leaking at joint {p}, pressure dropping below {v} PSI",
        "Touchscreen display flickering intermittently, unresponsive to input after {h} hours of operation",
        "Belt alignment off by {mm}mm causing product jams at station {s}",
        "Unusual grinding noise from spindle bearing at {rpm} RPM, vibration exceeding {g}G threshold",
        "Coolant pump seal failure, fluid leak rate approximately {l} liters per hour",
        "Emergency stop circuit intermittent - relay K{k} showing {ohm} ohm resistance instead of expected 0",
        "Motor overheating, thermal sensor reading {t}°C (max rated {tmax}°C) under normal load",
        "PLC communication timeout on Modbus channel {ch}, losing {pct}% of sensor readings",
        "Weld spatter buildup on torch nozzle reducing gas coverage, porosity defects on parts",
        "Battery capacity degraded to {bat}% - unit shuts down after {min} minutes of continuous use",
        "Chain drive tensioner spring broken, chain slack measured at {sl}mm (spec: max 3mm)",
        "Air filter differential pressure alarm - reading {dp}\" WC, replacement overdue by {d} days",
        "Laser alignment drift detected, cutting accuracy off by {off}mm on X-axis",
        "Gearbox oil analysis shows elevated iron particles at {fe} ppm (limit: 100 ppm)",
        "Safety light curtain false-triggering during normal operation, causing {stops} unplanned stops per shift",
        "Pneumatic valve {valve} stuck in open position, cylinder {cyl} not retracting",
        "Encoder feedback error on axis {axis}, position accuracy degraded to ±{acc}mm",
        "Exhaust ventilation fan motor drawing {amps}A (rated {rated}A), suspected winding fault",
        "Fork tine crack detected during inspection, visible hairline fracture at {loc}mm from heel",
        "Compressor discharge temperature alarm at {ct}°C, suspect blocked aftercooler fins",
        "Print bed leveling sensor drift, first-layer adhesion failures on {pct}% of prints",
        "Conveyor roller bearing seized at position {pos}, belt tracking affected downstream",
        "Generator fuel injector #{inj} showing {var}% flow variation from spec",
        "UPS battery string {str} showing {mv}mV cell imbalance, runtime reduced to {rt} minutes",
        "Welding wire feed inconsistent, stuttering every {sec} seconds causing cold lap defects",
        "Parking brake cable stretched beyond adjustment range, vehicle rolls on {deg}° incline",
        "HVAC unit compressor short-cycling, {cyc} starts per hour (normal: 4-6)",
        "Projector bulb nearing end of life at {hrs} hours (rated {rated_hrs}), brightness at {bright}%",
        "Hydraulic press ram seal weeping, estimated {ml}ml oil loss per cycle",
        "Robotic arm joint {joint} servo fault code E-{code}, intermittent positional overshoot",
    ]

    priorities = ['Low'] * 20 + ['Medium'] * 40 + ['High'] * 30 + ['Critical'] * 10
    maint_statuses = ['Open'] * 30 + ['In Progress'] * 25 + ['Resolved'] * 35 + ['Cancelled'] * 10

    maintenance = []
    maint_assets = random.sample(assets, min(40, len(assets)))
    for i, asset_row in enumerate(maint_assets, 1):
        template = random.choice(issue_templates)
        # Fill in template placeholders with random values
        desc = template.format(
            p=random.choice(['A1', 'B3', 'C2', 'D4', 'A7']),
            v=random.randint(1500, 3000),
            h=random.randint(1, 8),
            mm=random.randint(5, 25),
            s=random.randint(1, 12),
            rpm=random.randint(800, 5000),
            g=round(random.uniform(0.5, 4.0), 1),
            l=round(random.uniform(0.1, 2.5), 1),
            k=random.randint(1, 12),
            ohm=random.randint(50, 500),
            t=random.randint(85, 130),
            tmax=random.randint(75, 100),
            ch=random.randint(1, 8),
            pct=random.randint(5, 40),
            bat=random.randint(20, 60),
            min=random.randint(15, 90),
            sl=random.randint(5, 15),
            dp=round(random.uniform(3.0, 8.0), 1),
            d=random.randint(10, 90),
            off=round(random.uniform(0.05, 1.5), 2),
            fe=random.randint(120, 500),
            stops=random.randint(5, 30),
            valve=random.choice(['V-101', 'V-203', 'V-305', 'V-412']),
            cyl=random.choice(['C1', 'C2', 'C3', 'C4']),
            axis=random.choice(['X', 'Y', 'Z', 'A']),
            acc=round(random.uniform(0.05, 0.5), 2),
            amps=round(random.uniform(12, 45), 1),
            rated=round(random.uniform(8, 30), 1),
            loc=random.randint(50, 400),
            ct=random.randint(95, 140),
            pos=random.randint(1, 30),
            inj=random.randint(1, 6),
            var=round(random.uniform(5, 25), 1),
            str=random.choice(['A', 'B', 'C']),
            mv=random.randint(50, 300),
            rt=random.randint(3, 20),
            sec=round(random.uniform(1, 10), 1),
            deg=random.randint(3, 15),
            cyc=random.randint(10, 25),
            hrs=random.randint(3000, 9000),
            rated_hrs=random.choice([5000, 6000, 8000, 10000]),
            bright=random.randint(40, 70),
            ml=random.randint(5, 50),
            joint=random.choice(['J1', 'J2', 'J3', 'J4', 'J5', 'J6']),
            code=random.randint(1000, 9999),
        )

        priority = random.choice(priorities)
        m_status = random.choice(maint_statuses)
        raised = random_date(now - timedelta(days=180), now - timedelta(days=1))
        resolved = None
        if m_status == 'Resolved':
            raised_dt = datetime.fromisoformat(raised)
            resolved = random_date(raised_dt + timedelta(hours=2), min(raised_dt + timedelta(days=30), now))
        elif m_status == 'Cancelled':
            raised_dt = datetime.fromisoformat(raised)
            resolved = random_date(raised_dt + timedelta(hours=1), min(raised_dt + timedelta(days=5), now))

        maintenance.append((i, asset_row[0], desc, priority, m_status, raised, resolved))

    cur.executemany("INSERT INTO maintenance_requests VALUES (?,?,?,?,?,?,?)", maintenance)

    # ── Bookings ────────────────────────────────────────────
    bookable_assets = [a for a in assets if a[7] == 1]  # is_bookable
    booking_statuses = ['Confirmed'] * 35 + ['Pending'] * 25 + ['Cancelled'] * 15 + ['Completed'] * 25

    bookings = []
    for i in range(1, 56):
        asset_row = random.choice(bookable_assets)
        emp_id = random.choice(emp_ids)
        start = datetime.fromisoformat(random_date(now - timedelta(days=30), now + timedelta(days=30)))
        duration_hrs = random.choice([1, 2, 2, 4, 4, 8, 8, 24])
        end = start + timedelta(hours=duration_hrs)
        b_status = random.choice(booking_statuses)

        # Past bookings should be Completed or Cancelled
        if end < now and b_status in ('Confirmed', 'Pending'):
            b_status = random.choice(['Completed', 'Cancelled'])
        # Future bookings shouldn't be Completed
        if start > now and b_status == 'Completed':
            b_status = 'Confirmed'

        bookings.append((
            i, asset_row[0], emp_id,
            start.strftime('%Y-%m-%dT%H:%M:%S'),
            end.strftime('%Y-%m-%dT%H:%M:%S'),
            b_status,
        ))

    cur.executemany("INSERT INTO bookings VALUES (?,?,?,?,?,?)", bookings)

    conn.commit()

    # ── Summary ─────────────────────────────────────────────
    print("=" * 50)
    print("  AssetFlow Agent - Database Seeded Successfully")
    print("=" * 50)
    tables = ['plants', 'departments', 'employees', 'assets',
              'asset_allocations', 'maintenance_requests', 'bookings']
    for table in tables:
        count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table:25s} : {count:>5d} rows")
    print("=" * 50)
    print(f"  Database: {DB_PATH}")

    conn.close()


if __name__ == '__main__':
    seed()
