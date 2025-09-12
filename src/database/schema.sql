-- Staff Rotas Database Schema

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    min_porters_required INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Porters table
CREATE TABLE IF NOT EXISTS porters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Regular', 'Relief', 'Supervisor')) DEFAULT 'Regular',
    contracted_hours TEXT, -- e.g., "0800-2000"
    break_duration_minutes INTEGER DEFAULT 60, -- configurable break duration
    shift_group TEXT, -- e.g., "Day Shift One", "Night Shift Two", etc.
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Department assignments for porters
CREATE TABLE IF NOT EXISTS porter_department_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    porter_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    is_permanent BOOLEAN DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (porter_id) REFERENCES porters(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Absences table (sick leave)
CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    porter_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sick', 'annual_leave')) DEFAULT 'sick',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (porter_id) REFERENCES porters(id) ON DELETE CASCADE
);

-- Daily assignments table
CREATE TABLE IF NOT EXISTS daily_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    department_id INTEGER NOT NULL,
    porter_id INTEGER,
    cover_porter_id INTEGER, -- porter covering for absence/leave
    shift_type TEXT CHECK (shift_type IN ('day', 'night')) DEFAULT 'day',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (porter_id) REFERENCES porters(id) ON DELETE SET NULL,
    FOREIGN KEY (cover_porter_id) REFERENCES porters(id) ON DELETE SET NULL,
    UNIQUE(date, department_id, shift_type)
);

-- Department requirements by day/time
CREATE TABLE IF NOT EXISTS department_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time TEXT NOT NULL, -- e.g., "08:00"
    end_time TEXT NOT NULL, -- e.g., "20:00"
    required_porters INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Shift patterns table to track the 4-on/4-off rotation
CREATE TABLE IF NOT EXISTS shift_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_group TEXT NOT NULL UNIQUE,
    reference_date DATE NOT NULL, -- Tuesday 27th May 2025 for Shift One
    is_working_on_reference BOOLEAN NOT NULL, -- true if this shift is working on reference date
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_porter_department_assignments_porter_id ON porter_department_assignments(porter_id);
CREATE INDEX IF NOT EXISTS idx_porter_department_assignments_department_id ON porter_department_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_absences_porter_id ON absences(porter_id);
CREATE INDEX IF NOT EXISTS idx_absences_date_range ON absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_date ON daily_assignments(date);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_department_id ON daily_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_department_requirements_department_id ON department_requirements(department_id);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_departments_updated_at 
    AFTER UPDATE ON departments
    BEGIN
        UPDATE departments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_porters_updated_at 
    AFTER UPDATE ON porters
    BEGIN
        UPDATE porters SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_daily_assignments_updated_at 
    AFTER UPDATE ON daily_assignments
    BEGIN
        UPDATE daily_assignments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
