"""
Backend tools for AssetFlow Agent.
Each function queries the SQLite database and returns structured results.
"""
import sqlite3
import re
from datetime import datetime


def _get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _rows_to_dicts(rows) -> list:
    return [dict(r) for r in rows]


# ───────────────────────────────────────────────────────────
# 1. query_assets
# ───────────────────────────────────────────────────────────
def query_assets(db_path, category=None, plant=None, status=None,
                 department=None, is_production_critical=None):
    """Return a list of assets matching the given filters."""
    conn = _get_conn(db_path)
    sql = """
        SELECT a.id, a.asset_tag, a.name, a.category, a.status,
               a.condition, a.location, a.is_bookable, a.is_production_critical,
               p.name AS plant_name, p.city AS plant_city,
               d.name AS department_name
        FROM assets a
        JOIN plants p ON a.plant_id = p.id
        JOIN departments d ON a.department_id = d.id
        WHERE 1=1
    """
    params = []
    if category:
        sql += " AND a.category = ?"
        params.append(category)
    if plant:
        sql += " AND (p.name LIKE ? OR p.city LIKE ?)"
        params.extend([f"%{plant}%", f"%{plant}%"])
    if status:
        sql += " AND a.status = ?"
        params.append(status)
    if department:
        sql += " AND d.name LIKE ?"
        params.append(f"%{department}%")
    if is_production_critical is not None:
        sql += " AND a.is_production_critical = ?"
        params.append(int(is_production_critical))
    sql += " ORDER BY a.asset_tag LIMIT 100"

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


# ───────────────────────────────────────────────────────────
# 2. get_asset_detail
# ───────────────────────────────────────────────────────────
def get_asset_detail(db_path, asset_tag):
    """Full detail on a single asset including allocation and maintenance history."""
    conn = _get_conn(db_path)

    asset = conn.execute("""
        SELECT a.*, p.name AS plant_name, p.city AS plant_city,
               d.name AS department_name
        FROM assets a
        JOIN plants p ON a.plant_id = p.id
        JOIN departments d ON a.department_id = d.id
        WHERE a.asset_tag = ?
    """, (asset_tag,)).fetchone()

    if not asset:
        conn.close()
        return {"error": f"Asset '{asset_tag}' not found"}

    asset_dict = dict(asset)

    allocations = conn.execute("""
        SELECT aa.*, e.name AS employee_name, e.role AS employee_role
        FROM asset_allocations aa
        JOIN employees e ON aa.employee_id = e.id
        WHERE aa.asset_id = ?
        ORDER BY aa.allocated_at DESC
    """, (asset_dict['id'],)).fetchall()
    asset_dict['allocation_history'] = _rows_to_dicts(allocations)

    maintenance = conn.execute("""
        SELECT * FROM maintenance_requests
        WHERE asset_id = ?
        ORDER BY raised_at DESC
    """, (asset_dict['id'],)).fetchall()
    asset_dict['maintenance_history'] = _rows_to_dicts(maintenance)

    conn.close()
    return asset_dict


# ───────────────────────────────────────────────────────────
# 3. who_has_asset
# ───────────────────────────────────────────────────────────
def who_has_asset(db_path, asset_tag):
    """Find who currently holds a specific asset."""
    conn = _get_conn(db_path)

    result = conn.execute("""
        SELECT a.asset_tag, a.name AS asset_name, a.status,
               e.name AS employee_name, e.role AS employee_role,
               d.name AS department_name, p.name AS plant_name,
               aa.allocated_at, aa.expected_return, aa.status AS alloc_status
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        JOIN employees e ON aa.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        JOIN plants p ON a.plant_id = p.id
        WHERE a.asset_tag = ? AND aa.actual_return IS NULL AND aa.status = 'Active'
        ORDER BY aa.allocated_at DESC
        LIMIT 1
    """, (asset_tag,)).fetchone()

    conn.close()
    if result:
        return dict(result)
    return {"message": f"Asset '{asset_tag}' is not currently allocated to anyone"}


# ───────────────────────────────────────────────────────────
# 4. get_employee_assets
# ───────────────────────────────────────────────────────────
def get_employee_assets(db_path, employee_name):
    """All assets currently held by an employee (fuzzy match on name)."""
    conn = _get_conn(db_path)

    rows = conn.execute("""
        SELECT e.name AS employee_name, e.role,
               a.asset_tag, a.name AS asset_name, a.category,
               aa.allocated_at, aa.expected_return, aa.status AS alloc_status,
               d.name AS department_name, p.name AS plant_name
        FROM asset_allocations aa
        JOIN employees e ON aa.employee_id = e.id
        JOIN assets a ON aa.asset_id = a.id
        JOIN departments d ON e.department_id = d.id
        JOIN plants p ON a.plant_id = p.id
        WHERE e.name LIKE ? AND aa.actual_return IS NULL AND aa.status = 'Active'
        ORDER BY aa.allocated_at DESC
    """, (f"%{employee_name}%",)).fetchall()

    conn.close()
    if rows:
        return _rows_to_dicts(rows)
    return {"message": f"No active allocations found for employee matching '{employee_name}'"}


# ───────────────────────────────────────────────────────────
# 5. count_assets
# ───────────────────────────────────────────────────────────
def count_assets(db_path, category=None, plant=None, status=None,
                 department=None, is_production_critical=None):
    """Count assets matching the given filters."""
    conn = _get_conn(db_path)
    sql = """
        SELECT COUNT(*) as count
        FROM assets a
        JOIN plants p ON a.plant_id = p.id
        JOIN departments d ON a.department_id = d.id
        WHERE 1=1
    """
    params = []
    if category:
        sql += " AND a.category = ?"
        params.append(category)
    if plant:
        sql += " AND (p.name LIKE ? OR p.city LIKE ?)"
        params.extend([f"%{plant}%", f"%{plant}%"])
    if status:
        sql += " AND a.status = ?"
        params.append(status)
    if department:
        sql += " AND d.name LIKE ?"
        params.append(f"%{department}%")
    if is_production_critical is not None:
        sql += " AND a.is_production_critical = ?"
        params.append(int(is_production_critical))

    result = conn.execute(sql, params).fetchone()
    conn.close()
    return {"count": result['count']}


# ───────────────────────────────────────────────────────────
# 6. list_maintenance_requests
# ───────────────────────────────────────────────────────────
def list_maintenance_requests(db_path, status=None, priority=None, category=None):
    """List maintenance requests with optional filters."""
    conn = _get_conn(db_path)
    sql = """
        SELECT mr.id, mr.issue_description, mr.priority, mr.status,
               mr.raised_at, mr.resolved_at,
               a.asset_tag, a.name AS asset_name, a.category,
               p.name AS plant_name
        FROM maintenance_requests mr
        JOIN assets a ON mr.asset_id = a.id
        JOIN plants p ON a.plant_id = p.id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND mr.status = ?"
        params.append(status)
    if priority:
        sql += " AND mr.priority = ?"
        params.append(priority)
    if category:
        sql += " AND a.category = ?"
        params.append(category)
    sql += " ORDER BY mr.raised_at DESC LIMIT 50"

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


# ───────────────────────────────────────────────────────────
# 7. get_overdue_allocations
# ───────────────────────────────────────────────────────────
def get_overdue_allocations(db_path):
    """Allocations past expected_return with no actual_return."""
    conn = _get_conn(db_path)
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

    rows = conn.execute("""
        SELECT aa.id, a.asset_tag, a.name AS asset_name, a.category,
               e.name AS employee_name, e.role AS employee_role,
               d.name AS department_name, p.name AS plant_name,
               aa.allocated_at, aa.expected_return,
               CAST(julianday(?) - julianday(aa.expected_return) AS INTEGER) AS days_overdue
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        JOIN employees e ON aa.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        JOIN plants p ON a.plant_id = p.id
        WHERE aa.actual_return IS NULL
          AND aa.expected_return < ?
          AND aa.status = 'Active'
        ORDER BY aa.expected_return ASC
    """, (now, now)).fetchall()

    conn.close()
    return _rows_to_dicts(rows)


# ───────────────────────────────────────────────────────────
# 8. get_upcoming_bookings
# ───────────────────────────────────────────────────────────
def get_upcoming_bookings(db_path, asset_tag=None, employee_name=None):
    """Get upcoming/active bookings with optional filters."""
    conn = _get_conn(db_path)
    sql = """
        SELECT b.id, b.start_time, b.end_time, b.status AS booking_status,
               a.asset_tag, a.name AS asset_name, a.category,
               e.name AS employee_name,
               p.name AS plant_name
        FROM bookings b
        JOIN assets a ON b.asset_id = a.id
        JOIN employees e ON b.employee_id = e.id
        JOIN plants p ON a.plant_id = p.id
        WHERE b.status IN ('Confirmed', 'Pending')
    """
    params = []
    if asset_tag:
        sql += " AND a.asset_tag = ?"
        params.append(asset_tag)
    if employee_name:
        sql += " AND e.name LIKE ?"
        params.append(f"%{employee_name}%")
    sql += " ORDER BY b.start_time ASC LIMIT 50"

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


# ───────────────────────────────────────────────────────────
# 9. get_department_summary
# ───────────────────────────────────────────────────────────
def get_department_summary(db_path, department_name):
    """Asset counts, employee counts, and maintenance stats for a department."""
    conn = _get_conn(db_path)

    dept = conn.execute(
        "SELECT d.*, p.name AS plant_name FROM departments d JOIN plants p ON d.plant_id = p.id WHERE d.name LIKE ?",
        (f"%{department_name}%",)
    ).fetchone()

    if not dept:
        conn.close()
        return {"error": f"Department matching '{department_name}' not found"}

    dept_dict = dict(dept)
    dept_id = dept_dict['id']

    # Employee count
    emp_count = conn.execute(
        "SELECT COUNT(*) as count FROM employees WHERE department_id = ?", (dept_id,)
    ).fetchone()['count']

    # Asset counts by status
    asset_stats = conn.execute("""
        SELECT status, COUNT(*) as count FROM assets
        WHERE department_id = ? GROUP BY status
    """, (dept_id,)).fetchall()

    # Open maintenance requests
    maint_stats = conn.execute("""
        SELECT mr.status, COUNT(*) as count
        FROM maintenance_requests mr
        JOIN assets a ON mr.asset_id = a.id
        WHERE a.department_id = ?
        GROUP BY mr.status
    """, (dept_id,)).fetchall()

    conn.close()
    return {
        "department": dept_dict,
        "employee_count": emp_count,
        "assets_by_status": _rows_to_dicts(asset_stats),
        "maintenance_by_status": _rows_to_dicts(maint_stats),
    }


# ───────────────────────────────────────────────────────────
# 10. run_custom_query
# ───────────────────────────────────────────────────────────
_FORBIDDEN_KEYWORDS = re.compile(
    r'\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH|PRAGMA|GRANT|REVOKE)\b',
    re.IGNORECASE,
)


def run_custom_query(db_path, sql):
    """Execute a read-only SQL query. Only SELECT statements are allowed."""
    stripped = sql.strip().rstrip(';').strip()
    if not stripped.upper().startswith('SELECT'):
        return {"error": "Only SELECT queries are allowed"}
    if _FORBIDDEN_KEYWORDS.search(stripped):
        return {"error": "Query contains forbidden keywords (write/DDL operations are not allowed)"}

    conn = _get_conn(db_path)
    try:
        if 'LIMIT' not in stripped.upper():
            stripped += " LIMIT 50"
        rows = conn.execute(stripped).fetchall()
        return _rows_to_dicts(rows)
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()


# ───────────────────────────────────────────────────────────
# TOOL_FUNCTIONS mapping
# ───────────────────────────────────────────────────────────
TOOL_FUNCTIONS = {
    'query_assets': query_assets,
    'get_asset_detail': get_asset_detail,
    'who_has_asset': who_has_asset,
    'get_employee_assets': get_employee_assets,
    'count_assets': count_assets,
    'list_maintenance_requests': list_maintenance_requests,
    'get_overdue_allocations': get_overdue_allocations,
    'get_upcoming_bookings': get_upcoming_bookings,
    'get_department_summary': get_department_summary,
    'run_custom_query': run_custom_query,
}


# ───────────────────────────────────────────────────────────
# TOOL_SCHEMAS (Ollama-compatible)
# ───────────────────────────────────────────────────────────
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "query_assets",
            "description": "Search and list assets with optional filters. Returns asset details including tag, name, category, status, condition, location, plant, and department. Use this to find assets matching specific criteria.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Filter by asset category. Options: CNC Machine, Forklift, Conveyor Belt, Compressor, Generator, Laptop, Meeting Room, Vehicle, Welding Station, 3D Printer"
                    },
                    "plant": {
                        "type": "string",
                        "description": "Filter by plant name or city (partial match). E.g. 'Detroit', 'Austin', 'Chicago'"
                    },
                    "status": {
                        "type": "string",
                        "description": "Filter by asset status. Options: Available, Allocated, Under Maintenance, Reserved, Retired"
                    },
                    "department": {
                        "type": "string",
                        "description": "Filter by department name (partial match). E.g. 'Assembly', 'IT', 'Logistics'"
                    },
                    "is_production_critical": {
                        "type": "boolean",
                        "description": "Filter by whether the asset is production-critical (true/false)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_asset_detail",
            "description": "Get complete details for a single asset by its asset tag, including full allocation history and maintenance history. Use this when you need in-depth information about a specific asset.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_tag": {
                        "type": "string",
                        "description": "The unique asset tag identifier, e.g. 'CNC-DET-001', 'FLT-AUS-002'"
                    }
                },
                "required": ["asset_tag"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "who_has_asset",
            "description": "Find out who currently holds/is allocated a specific asset. Returns the employee name, role, department, and allocation details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_tag": {
                        "type": "string",
                        "description": "The unique asset tag identifier, e.g. 'CNC-DET-001'"
                    }
                },
                "required": ["asset_tag"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_assets",
            "description": "Get all assets currently allocated to a specific employee. Uses fuzzy name matching so partial names work. Returns asset details and allocation info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "employee_name": {
                        "type": "string",
                        "description": "Full or partial employee name to search for, e.g. 'Maria', 'Johnson', 'Carlos Rodriguez'"
                    }
                },
                "required": ["employee_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "count_assets",
            "description": "Get a count of assets matching the given filters. Use this when the user just wants to know how many assets match certain criteria rather than seeing all the details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Filter by asset category. Options: CNC Machine, Forklift, Conveyor Belt, Compressor, Generator, Laptop, Meeting Room, Vehicle, Welding Station, 3D Printer"
                    },
                    "plant": {
                        "type": "string",
                        "description": "Filter by plant name or city (partial match)"
                    },
                    "status": {
                        "type": "string",
                        "description": "Filter by asset status. Options: Available, Allocated, Under Maintenance, Reserved, Retired"
                    },
                    "department": {
                        "type": "string",
                        "description": "Filter by department name (partial match)"
                    },
                    "is_production_critical": {
                        "type": "boolean",
                        "description": "Filter by whether the asset is production-critical"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_maintenance_requests",
            "description": "List maintenance requests with optional filters on status, priority, and asset category. Returns issue descriptions, priorities, statuses, dates, and associated asset info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filter by request status. Options: Open, In Progress, Resolved, Cancelled"
                    },
                    "priority": {
                        "type": "string",
                        "description": "Filter by priority level. Options: Low, Medium, High, Critical"
                    },
                    "category": {
                        "type": "string",
                        "description": "Filter by asset category to see maintenance for specific asset types"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_overdue_allocations",
            "description": "Find all asset allocations that are overdue - past their expected return date with no actual return recorded. Returns employee info, asset info, and how many days overdue.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_bookings",
            "description": "Get upcoming and active bookings for bookable assets (meeting rooms, vehicles, forklifts, 3D printers). Can filter by asset tag or employee name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_tag": {
                        "type": "string",
                        "description": "Filter bookings for a specific asset tag"
                    },
                    "employee_name": {
                        "type": "string",
                        "description": "Filter bookings by employee name (partial match)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_department_summary",
            "description": "Get a summary of a department including employee count, asset counts by status, and maintenance request statistics. Use for department-level overviews.",
            "parameters": {
                "type": "object",
                "properties": {
                    "department_name": {
                        "type": "string",
                        "description": "Department name or partial name, e.g. 'Assembly', 'IT', 'Logistics'"
                    }
                },
                "required": ["department_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_custom_query",
            "description": "Execute a custom read-only SQL SELECT query against the database. Use this for complex queries that cannot be answered by other tools. Only SELECT statements are allowed; write operations are blocked. Results limited to 50 rows. Tables: plants, departments, employees, assets, asset_allocations, maintenance_requests, bookings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "A SQL SELECT query to execute. Must start with SELECT. Example: SELECT a.asset_tag, a.name FROM assets a WHERE a.category = 'Forklift'"
                    }
                },
                "required": ["sql"]
            }
        }
    },
]
