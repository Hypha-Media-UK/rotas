// Core entity types for the staff rotas application

export interface Department {
  id: number
  name: string
  display_order: number
  min_porters_required: number
  operating_hours: {
    [key: string]: { start: string; end: string } | null
  }
  created_at: string
  updated_at: string
  code?: string
}

// MySQL-specific Department interface
export interface MySQLDepartment {
  id: number
  name: string
  code: string
  operating_hours: any // JSON field
  required_staff: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Porter {
  id: number
  name: string
  type: PorterType
  contracted_hours?: string // e.g., "0800-2000"
  break_duration_minutes: number
  shift_group?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Additional fields to match MySQL schema
  employee_id?: string
  email?: string
  phone?: string
  qualifications?: string[]
}

export type PorterType = 'Regular' | 'Relief' | 'Supervisor'

// MySQL-specific Porter interface
export interface MySQLPorter {
  id: number
  name: string
  employee_id: string
  email: string
  phone?: string
  role: string
  qualifications: string[] // Parsed from JSON
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PorterDepartmentAssignment {
  id: number
  porter_id: number
  department_id: number
  shift_pattern_id: string
  is_permanent: boolean
  is_active: boolean
  start_date?: string
  end_date?: string
  created_at: string
}

export interface Absence {
  id: number
  porter_id: number
  start_date: string
  end_date: string
  type: AbsenceType
  notes?: string
  created_at: string
}

export type AbsenceType = 'sick' | 'annual_leave'

export interface DailyAssignment {
  id: number
  date: string
  department_id: number
  porter_id?: number
  cover_porter_id?: number
  shift_type: ShiftType
  created_at: string
  updated_at: string
}

export type ShiftType = 'day' | 'night'

export interface ShiftPattern {
  id: number
  shift_group: string
  reference_date: string // Tuesday 27th May 2025
  is_working_on_reference: boolean
  shift_type: ShiftType
  created_at: string
}

// MySQL-specific ShiftPattern interface
export interface MySQLShiftPattern {
  id: string
  name: string
  description?: string
  start_time: string
  end_time: string
  rotation_type: 'fixed' | 'alternating' | 'rotating'
  rotation_days: number
  offset_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Shift Type interface for the new shift management system
export interface ShiftType {
  id: string
  name: string
  description?: string
  start_time: string
  end_time: string
  rotation_type: 'fixed' | 'alternating' | 'rotating'
  rotation_days: number
  offset_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Form data for creating/editing shift types
export interface ShiftTypeFormData {
  name: string
  description?: string
  start_time: string
  end_time: string
  rotation_type: 'fixed' | 'alternating' | 'rotating'
  rotation_days: number
  offset_days: number
  is_active: boolean
}

// MySQL-specific Assignment interface
export interface MySQLAssignment {
  id: number
  porter_id: number
  department_id: number
  shift_pattern_id: string
  start_date: string
  end_date?: string
  is_permanent: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Extended types with joined data
export interface PorterWithAssignments extends Porter {
  assignments: PorterDepartmentAssignment[]
  absences: Absence[]
}

export interface DailyAssignmentWithDetails extends DailyAssignment {
  department: Department
  porter?: Porter
  cover_porter?: Porter
}

// UI-specific types
export interface DepartmentTableRow {
  hours: string
  total_hours: number
  allocated_porter?: Porter
  cover_porter?: Porter
  is_porter_absent: boolean
  absence_type?: AbsenceType
  cover_porter_id?: string
}

// Form types
export interface PorterFormData {
  name: string
  type: PorterType
  contracted_hours?: string
  break_duration_minutes: number
  shift_group?: string
  department_assignments: {
    department_id: number
    is_permanent: boolean
    start_date?: string
    end_date?: string
  }[]
}

// Utility types
export interface TimeRange {
  start: string
  end: string
}

export interface DateRange {
  start: string
  end: string
}

// Shift calculation types
export interface ShiftCalculation {
  is_working: boolean
  shift_type: ShiftType
  cycle_day: number // 1-8 (4 working days + 4 off days)
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Constants
export const SHIFT_GROUPS = [
  'Day Shift One',
  'Day Shift Two',
  'Night Shift One',
  'Night Shift Two',
] as const

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const PORTER_TYPES: PorterType[] = ['Regular', 'Relief', 'Supervisor']
export const ABSENCE_TYPES: AbsenceType[] = ['sick', 'annual_leave']
export const SHIFT_TYPES: ShiftType[] = ['day', 'night']
