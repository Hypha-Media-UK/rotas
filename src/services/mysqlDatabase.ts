import mysql from 'mysql2/promise'
import type {
  Porter,
  Department,
  PorterDepartmentAssignment,
  Absence,
  ShiftPattern,
  MySQLPorter,
  MySQLDepartment,
  MySQLShiftPattern,
  MySQLAssignment,
} from '@/types'

// MySQL database configuration
interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

// Database row types that match MySQL schema
interface PorterRow {
  id: number
  name: string
  employee_id: string
  email: string
  phone?: string
  role: string
  qualifications: string // JSON string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface DepartmentRow {
  id: number
  name: string
  code: string
  operating_hours: string // JSON string
  required_staff: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface ShiftPatternRow {
  id: string
  name: string
  description?: string
  start_time: string
  end_time: string
  rotation_type: 'fixed' | 'alternating' | 'rotating'
  rotation_days: number
  offset_days: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface AssignmentRow {
  id: number
  porter_id: number
  department_id: number
  shift_pattern_id: string
  start_date: Date
  end_date?: Date
  is_permanent: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export class MySQLDatabaseService {
  private static connection: mysql.Connection | null = null
  private static config: DatabaseConfig = {
    host: 'localhost',
    port: 3308, // Using the mapped port from docker-compose
    user: 'rota_user',
    password: 'rota_password',
    database: 'rota_track',
  }

  static async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection(this.config)
      console.log('✅ Connected to MySQL database')
    } catch (error) {
      console.error('❌ Failed to connect to database:', error)
      throw new Error('Database connection failed')
    }
  }

  static async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end()
      this.connection = null
      console.log('🔌 Disconnected from MySQL database')
    }
  }

  private static async ensureConnection(): Promise<mysql.Connection> {
    if (!this.connection) {
      await this.connect()
    }
    return this.connection!
  }

  // Porter operations
  static async getPorters(): Promise<Porter[]> {
    const conn = await this.ensureConnection()
    const [rows] = await (conn as any).execute(
      'SELECT * FROM porters WHERE is_active = TRUE ORDER BY name',
    )

    return (rows as PorterRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.role as any, // Map role to type
      contracted_hours: undefined, // Not in MySQL schema yet
      break_duration_minutes: 30, // Default value
      shift_group: row.role, // Use role as shift_group for now
      is_active: row.is_active,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }))
  }

  static async createPorter(
    porter: Omit<Porter, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Porter> {
    const conn = await this.ensureConnection()

    // Generate employee_id and email from name
    const employeeId = `P${Date.now().toString().slice(-6)}`
    const email = `${porter.name.toLowerCase().replace(/\s+/g, '.')}.porter@hospital.nhs.uk`

    const [result] = await (conn as any).execute(
      `INSERT INTO porters (name, employee_id, email, role, qualifications, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [porter.name, employeeId, email, porter.type, JSON.stringify([]), porter.is_active],
    )

    const insertId = (result as any).insertId
    const [rows] = await (conn as any).execute('SELECT * FROM porters WHERE id = ?', [insertId])
    const newPorter = (rows as PorterRow[])[0]

    return {
      id: newPorter.id,
      name: newPorter.name,
      type: newPorter.role as any,
      contracted_hours: undefined,
      break_duration_minutes: 30,
      shift_group: newPorter.role,
      is_active: newPorter.is_active,
      created_at: newPorter.created_at.toISOString(),
      updated_at: newPorter.updated_at.toISOString(),
    }
  }

  static async updatePorter(id: number, updates: Partial<Porter>): Promise<void> {
    const conn = await this.ensureConnection()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.type !== undefined) {
      fields.push('role = ?')
      values.push(updates.type)
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(updates.is_active)
    }

    if (fields.length > 0) {
      values.push(id)
      await (conn as any).execute(
        `UPDATE porters SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
      )
    }
  }

  static async deletePorter(id: number): Promise<void> {
    const conn = await this.ensureConnection()
    await (conn as any).execute('UPDATE porters SET is_active = FALSE WHERE id = ?', [id])
  }

  // Department operations
  static async getDepartments(): Promise<Department[]> {
    const conn = await this.ensureConnection()
    const [rows] = await (conn as any).execute(
      'SELECT * FROM departments WHERE is_active = TRUE ORDER BY name',
    )

    return (rows as DepartmentRow[]).map((row) => {
      const operatingHours = JSON.parse(row.operating_hours || '{}')

      return {
        id: row.id,
        name: row.name,
        display_order: 1, // Default value, not in MySQL schema
        min_porters_required: row.required_staff,
        department_type: 'standard_hours' as any, // Default value
        operating_schedule: {
          days_of_week: [], // Will need to parse from operating_hours
          start_time: '07:00',
          end_time: '18:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      }
    })
  }

  static async createDepartment(
    department: Omit<Department, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Department> {
    const conn = await this.ensureConnection()

    // Generate department code from name
    const code = department.name.toUpperCase().replace(/\s+/g, '_').slice(0, 10)

    const [result] = await (conn as any).execute(
      `INSERT INTO departments (name, code, operating_hours, required_staff, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        department.name,
        code,
        JSON.stringify({}), // Will need to convert operating_schedule
        department.min_porters_required,
        true,
      ],
    )

    const insertId = (result as any).insertId
    const [rows] = await (conn as any).execute('SELECT * FROM departments WHERE id = ?', [insertId])
    const newDept = (rows as DepartmentRow[])[0]

    return {
      id: newDept.id,
      name: newDept.name,
      display_order: 1,
      min_porters_required: newDept.required_staff,
      department_type: department.department_type,
      operating_schedule: department.operating_schedule,
      created_at: newDept.created_at.toISOString(),
      updated_at: newDept.updated_at.toISOString(),
    }
  }

  static async updateDepartment(id: number, updates: Partial<Department>): Promise<void> {
    const conn = await this.ensureConnection()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.min_porters_required !== undefined) {
      fields.push('required_staff = ?')
      values.push(updates.min_porters_required)
    }

    if (fields.length > 0) {
      values.push(id)
      await (conn as any).execute(
        `UPDATE departments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
      )
    }
  }

  static async deleteDepartment(id: number): Promise<void> {
    const conn = await this.ensureConnection()
    await (conn as any).execute('UPDATE departments SET is_active = FALSE WHERE id = ?', [id])
  }

  // Shift Pattern operations
  static async getShiftPatterns(): Promise<ShiftPattern[]> {
    const conn = await this.ensureConnection()
    const [rows] = await (conn as any).execute(
      'SELECT * FROM shift_patterns WHERE is_active = TRUE ORDER BY name',
    )

    return (rows as ShiftPatternRow[]).map((row) => ({
      id: parseInt(row.id), // Convert string to number for compatibility
      shift_group: row.name,
      reference_date: '2025-05-27', // Default reference date
      is_working_on_reference: true,
      shift_type: row.name.toLowerCase().includes('night') ? 'night' : 'day',
      created_at: row.created_at.toISOString(),
    }))
  }

  // Assignment operations
  static async getAssignments(): Promise<PorterDepartmentAssignment[]> {
    const conn = await this.ensureConnection()
    const [rows] = await (conn as any).execute(
      'SELECT * FROM assignments WHERE is_active = TRUE ORDER BY start_date',
    )

    return (rows as AssignmentRow[]).map((row) => ({
      id: row.id,
      porter_id: row.porter_id,
      department_id: row.department_id,
      is_permanent: row.is_permanent,
      start_date: row.start_date.toISOString().split('T')[0],
      end_date: row.end_date ? row.end_date.toISOString().split('T')[0] : undefined,
      created_at: row.created_at.toISOString(),
    }))
  }

  static async createAssignment(
    assignment: Omit<PorterDepartmentAssignment, 'id' | 'created_at'>,
  ): Promise<PorterDepartmentAssignment> {
    const conn = await this.ensureConnection()

    const [result] = await (conn as any).execute(
      `INSERT INTO assignments (porter_id, department_id, shift_pattern_id, start_date, end_date, is_permanent, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.porter_id,
        assignment.department_id,
        'day_shift', // Default shift pattern
        assignment.start_date || new Date().toISOString().split('T')[0],
        assignment.end_date || null,
        assignment.is_permanent,
        true,
      ],
    )

    const insertId = (result as any).insertId
    const [rows] = await (conn as any).execute('SELECT * FROM assignments WHERE id = ?', [insertId])
    const newAssignment = (rows as AssignmentRow[])[0]

    return {
      id: newAssignment.id,
      porter_id: newAssignment.porter_id,
      department_id: newAssignment.department_id,
      is_permanent: newAssignment.is_permanent,
      start_date: newAssignment.start_date.toISOString().split('T')[0],
      end_date: newAssignment.end_date
        ? newAssignment.end_date.toISOString().split('T')[0]
        : undefined,
      created_at: newAssignment.created_at.toISOString(),
    }
  }
}
