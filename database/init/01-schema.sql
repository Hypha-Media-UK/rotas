-- Rota Track Database Schema
USE rota_track;

-- Porters table
CREATE TABLE porters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100) NOT NULL,
    qualifications JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Departments table
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    operating_hours JSON NOT NULL,
    required_staff INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
);

-- Shift patterns table
CREATE TABLE shift_patterns (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    rotation_type ENUM('fixed', 'alternating', 'rotating') DEFAULT 'fixed',
    rotation_days INT DEFAULT 1,
    offset_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
);

-- Assignments table
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    porter_id INT NOT NULL,
    department_id INT NOT NULL,
    shift_pattern_id VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_permanent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (porter_id) REFERENCES porters(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_pattern_id) REFERENCES shift_patterns(id) ON DELETE CASCADE,
    INDEX idx_porter (porter_id),
    INDEX idx_department (department_id),
    INDEX idx_shift_pattern (shift_pattern_id),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_active (is_active)
);

-- Insert sample porters from original app
INSERT INTO porters (name, employee_id, email, phone, role, qualifications) VALUES
('Stephen Cooper', 'P001', 'stephen.cooper@hospital.nhs.uk', '01234 567890', 'Day Shift One', '["Basic Porter", "Manual Handling"]'),
('Darren Milhench', 'P002', 'darren.milhench@hospital.nhs.uk', '01234 567891', 'Day Shift One', '["Basic Porter", "Manual Handling"]'),
('Darren Mycroft', 'P003', 'darren.mycroft@hospital.nhs.uk', '01234 567892', 'Day Shift One', '["Basic Porter", "Manual Handling"]'),
('Kevin Gaskell', 'P004', 'kevin.gaskell@hospital.nhs.uk', '01234 567893', 'Day Shift One', '["Basic Porter", "Manual Handling"]'),
('Merv Permalloo', 'P005', 'merv.permalloo@hospital.nhs.uk', '01234 567894', 'Day Shift One', '["Basic Porter", "Manual Handling"]'),
('Rob Mcpartland', 'P006', 'rob.mcpartland@hospital.nhs.uk', '01234 567895', 'Day Shift Two', '["Basic Porter", "Manual Handling"]'),
('John Evans', 'P007', 'john.evans@hospital.nhs.uk', '01234 567896', 'Day Shift Two', '["Basic Porter", "Manual Handling"]'),
('Charlotte Rimmer', 'P008', 'charlotte.rimmer@hospital.nhs.uk', '01234 567897', 'Day Shift Two', '["Basic Porter", "Manual Handling"]'),
('Carla Barton', 'P009', 'carla.barton@hospital.nhs.uk', '01234 567898', 'Day Shift Two', '["Basic Porter", "Manual Handling"]'),
('Andrew Trudgeon', 'P010', 'andrew.trudgeon@hospital.nhs.uk', '01234 567899', 'Day Shift Two', '["Basic Porter", "Manual Handling"]');

-- Insert sample departments from original app
INSERT INTO departments (name, code, operating_hours, required_staff) VALUES
('Emergency Department', 'ED', '{"monday": {"start": "00:00", "end": "23:59"}, "tuesday": {"start": "00:00", "end": "23:59"}, "wednesday": {"start": "00:00", "end": "23:59"}, "thursday": {"start": "00:00", "end": "23:59"}, "friday": {"start": "00:00", "end": "23:59"}, "saturday": {"start": "00:00", "end": "23:59"}, "sunday": {"start": "00:00", "end": "23:59"}}', 2),
('Outpatients', 'OPD', '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}, "saturday": null, "sunday": null}', 1),
('Theatres', 'THR', '{"monday": {"start": "07:00", "end": "20:00"}, "tuesday": {"start": "07:00", "end": "20:00"}, "wednesday": {"start": "07:00", "end": "20:00"}, "thursday": {"start": "07:00", "end": "20:00"}, "friday": {"start": "07:00", "end": "20:00"}, "saturday": {"start": "08:00", "end": "16:00"}, "sunday": null}', 1),
('Wards', 'WARD', '{"monday": {"start": "07:00", "end": "21:00"}, "tuesday": {"start": "07:00", "end": "21:00"}, "wednesday": {"start": "07:00", "end": "21:00"}, "thursday": {"start": "07:00", "end": "21:00"}, "friday": {"start": "07:00", "end": "21:00"}, "saturday": {"start": "08:00", "end": "18:00"}, "sunday": {"start": "08:00", "end": "18:00"}}', 2),
('Radiology', 'RAD', '{"monday": {"start": "08:00", "end": "18:00"}, "tuesday": {"start": "08:00", "end": "18:00"}, "wednesday": {"start": "08:00", "end": "18:00"}, "thursday": {"start": "08:00", "end": "18:00"}, "friday": {"start": "08:00", "end": "18:00"}, "saturday": {"start": "09:00", "end": "13:00"}, "sunday": null}', 1);

-- Insert simple shift patterns
INSERT INTO shift_patterns (id, name, description, start_time, end_time, rotation_type, rotation_days, offset_days) VALUES
('day_shift', 'Day Shift', 'Standard day shift 7am-7pm', '07:00:00', '19:00:00', 'fixed', 1, 0),
('night_shift', 'Night Shift', 'Standard night shift 7pm-7am', '19:00:00', '07:00:00', 'fixed', 1, 0),
('early_shift', 'Early Shift', 'Early morning shift 6am-2pm', '06:00:00', '14:00:00', 'fixed', 1, 0),
('late_shift', 'Late Shift', 'Late shift 2pm-10pm', '14:00:00', '22:00:00', 'fixed', 1, 0);

-- Insert sample assignments
INSERT INTO assignments (porter_id, department_id, shift_pattern_id, start_date, is_permanent) VALUES
(1, 1, 'day_shift', '2025-01-11', TRUE),
(2, 1, 'day_shift', '2025-01-11', TRUE),
(3, 2, 'day_shift', '2025-01-11', TRUE),
(4, 3, 'early_shift', '2025-01-11', TRUE),
(5, 4, 'day_shift', '2025-01-11', TRUE),
(6, 1, 'night_shift', '2025-01-11', TRUE),
(7, 2, 'late_shift', '2025-01-11', TRUE),
(8, 5, 'day_shift', '2025-01-11', TRUE),
(9, 4, 'late_shift', '2025-01-11', TRUE),
(10, 3, 'day_shift', '2025-01-11', TRUE);
