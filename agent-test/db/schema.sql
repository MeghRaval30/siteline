-- AssetFlow Agent Database Schema

CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY,
    plant_id INTEGER NOT NULL REFERENCES plants(id),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY,
    asset_tag TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    plant_id INTEGER REFERENCES plants(id),
    department_id INTEGER REFERENCES departments(id),
    status TEXT CHECK(status IN ('Available','Allocated','Under Maintenance','Reserved','Retired')) NOT NULL,
    is_bookable INTEGER DEFAULT 0,
    is_production_critical INTEGER DEFAULT 0,
    condition TEXT,
    acquisition_date TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS asset_allocations (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    allocated_at TEXT NOT NULL,
    expected_return TEXT,
    actual_return TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id),
    issue_description TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('Low','Medium','High','Critical')) NOT NULL,
    status TEXT CHECK(status IN ('Open','In Progress','Resolved','Cancelled')) NOT NULL,
    raised_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT CHECK(status IN ('Confirmed','Pending','Cancelled','Completed')) NOT NULL
);
