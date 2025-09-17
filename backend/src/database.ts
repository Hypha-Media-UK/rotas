import mysql from 'mysql2/promise'

// Database configuration
interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

// Database row types that match MySQL schema
export interface PorterRow {
  id: number
  name: string
  employee_id: string
  email: string
  phone?: string
  role: string
  shift_group?: string
  contracted_hours?: string // JSON string
  qualifications: string // JSON string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface DepartmentRow {
  id: number
  name: string
  code: string
  operating_hours: string // JSON string
  required_staff: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ShiftPatternRow {
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

export interface AssignmentRow {
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

export class DatabaseService {
  private static connection: mysql.Connection | null = null
  private static config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3308'),
    user: process.env.DB_USER || 'rota_user',
    password: process.env.DB_PASSWORD || 'rota_password',
    database: process.env.DB_NAME || 'rota_track',
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

  // Helper method to generate default contracted hours based on role
  private static getDefaultContractedHours(
    role: string,
  ): Record<string, { start: string; end: string }> {
    if (role.toLowerCase().includes('night')) {
      // Night shift: 20:00 - 08:00
      return {
        monday: { start: '20:00', end: '08:00' },
        tuesday: { start: '20:00', end: '08:00' },
        wednesday: { start: '20:00', end: '08:00' },
        thursday: { start: '20:00', end: '08:00' },
        friday: { start: '20:00', end: '08:00' },
        saturday: { start: '20:00', end: '08:00' },
        sunday: { start: '20:00', end: '08:00' },
      }
    } else {
      // Day shift: 08:00 - 20:00 (default for all other roles)
      return {
        monday: { start: '08:00', end: '20:00' },
        tuesday: { start: '08:00', end: '20:00' },
        wednesday: { start: '08:00', end: '20:00' },
        thursday: { start: '08:00', end: '20:00' },
        friday: { start: '08:00', end: '20:00' },
        saturday: { start: '08:00', end: '20:00' },
        sunday: { start: '08:00', end: '20:00' },
      }
    }
  }

  // Porter operations
  static async getPorters(): Promise<PorterRow[]> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute('SELECT * FROM porters WHERE is_active = TRUE ORDER BY name')
    return rows as PorterRow[]
  }

  static async getPorterById(id: number): Promise<PorterRow | null> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute('SELECT * FROM porters WHERE id = ? AND is_active = TRUE', [
      id,
    ])
    const porters = rows as PorterRow[]
    return porters.length > 0 ? porters[0] : null
  }

  static async createPorter(porter: {
    name: string
    employee_id: string
    email: string
    phone?: string
    role: string
    qualifications?: string[]
    contracted_hours?: Record<string, { start: string; end: string }>
  }): Promise<PorterRow> {
    const conn = await this.ensureConnection()

    // Generate default contracted hours if not provided
    const defaultContractedHours =
      porter.contracted_hours || this.getDefaultContractedHours(porter.role)

    const [result] = await conn.execute(
      `INSERT INTO porters (name, employee_id, email, phone, role, contracted_hours, qualifications, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        porter.name,
        porter.employee_id,
        porter.email,
        porter.phone || null,
        porter.role,
        JSON.stringify(defaultContractedHours),
        JSON.stringify(porter.qualifications || []),
        true,
      ],
    )

    const insertId = (result as any).insertId
    const [rows] = await conn.execute('SELECT * FROM porters WHERE id = ?', [insertId])
    return (rows as PorterRow[])[0]
  }

  static async updatePorter(
    id: number,
    updates: Partial<{
      name: string
      employee_id: string
      email: string
      phone: string
      role: string
      shift_group: string
      contracted_hours: Record<string, { start: string; end: string }>
      qualifications: string[]
      is_active: boolean
    }>,
  ): Promise<void> {
    const conn = await this.ensureConnection()
    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'qualifications' || key === 'contracted_hours') {
          fields.push(`${key} = ?`)
          values.push(JSON.stringify(value))
        } else {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      }
    })

    if (fields.length > 0) {
      values.push(id)
      await conn.execute(
        `UPDATE porters SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
      )
    }
  }

  static async deletePorter(id: number): Promise<void> {
    const conn = await this.ensureConnection()
    await conn.execute('UPDATE porters SET is_active = FALSE WHERE id = ?', [id])
  }

  // Department operations
  static async getDepartments(): Promise<DepartmentRow[]> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute(
      'SELECT * FROM departments WHERE is_active = TRUE ORDER BY display_order, name',
    )
    return rows as DepartmentRow[]
  }

  static async getDepartmentById(id: number): Promise<DepartmentRow | null> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute(
      'SELECT * FROM departments WHERE id = ? AND is_active = TRUE',
      [id],
    )
    const departments = rows as DepartmentRow[]
    return departments.length > 0 ? departments[0] : null
  }

  static async createDepartment(department: {
    name: string
    code: string
    operating_hours: any
    required_staff: number
  }): Promise<DepartmentRow> {
    const conn = await this.ensureConnection()

    const [result] = await conn.execute(
      `INSERT INTO departments (name, code, operating_hours, required_staff, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        department.name,
        department.code,
        JSON.stringify(department.operating_hours),
        department.required_staff,
        true,
      ],
    )

    const insertId = (result as any).insertId
    const [rows] = await conn.execute('SELECT * FROM departments WHERE id = ?', [insertId])
    return (rows as DepartmentRow[])[0]
  }

  static async updateDepartment(
    id: number,
    updates: Partial<{
      name: string
      code: string
      operating_hours: any
      required_staff: number
      is_active: boolean
    }>,
  ): Promise<void> {
    const conn = await this.ensureConnection()
    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'operating_hours') {
          fields.push(`${key} = ?`)
          values.push(JSON.stringify(value))
        } else {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      }
    })

    if (fields.length > 0) {
      values.push(id)
      await conn.execute(
        `UPDATE departments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
      )
    }
  }

  static async deleteDepartment(id: number): Promise<void> {
    const conn = await this.ensureConnection()
    await conn.execute('UPDATE departments SET is_active = FALSE WHERE id = ?', [id])
  }

  static async reorderDepartments(departmentIds: number[]): Promise<void> {
    const conn = await this.ensureConnection()

    // Start a transaction to ensure all updates happen atomically
    await conn.beginTransaction()

    try {
      // Update each department's display_order based on its position in the array
      for (let i = 0; i < departmentIds.length; i++) {
        const departmentId = departmentIds[i]
        const displayOrder = i + 1

        await conn.execute(
          'UPDATE departments SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = TRUE',
          [displayOrder, departmentId],
        )
      }

      // Commit the transaction
      await conn.commit()
    } catch (error) {
      // Rollback on error
      await conn.rollback()
      throw error
    }
  }

  // Shift Pattern operations
  static async getShiftPatterns(): Promise<ShiftPatternRow[]> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute(
      'SELECT * FROM shift_patterns WHERE is_active = TRUE ORDER BY name',
    )
    return rows as ShiftPatternRow[]
  }

  static async getShiftPatternById(id: string): Promise<ShiftPatternRow | null> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute(
      'SELECT * FROM shift_patterns WHERE id = ? AND is_active = TRUE',
      [id],
    )
    const results = rows as ShiftPatternRow[]
    return results.length > 0 ? results[0] : null
  }

  static async createShiftPattern(shiftPattern: {
    id: string
    name: string
    description?: string
    start_time: string
    end_time: string
    rotation_type: 'fixed' | 'alternating' | 'rotating'
    rotation_days: number
    offset_days: number
    is_active?: boolean
  }): Promise<ShiftPatternRow> {
    const conn = await this.ensureConnection()

    const [result] = await conn.execute(
      `INSERT INTO shift_patterns (id, name, description, start_time, end_time, rotation_type, rotation_days, offset_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shiftPattern.id,
        shiftPattern.name,
        shiftPattern.description || null,
        shiftPattern.start_time,
        shiftPattern.end_time,
        shiftPattern.rotation_type,
        shiftPattern.rotation_days,
        shiftPattern.offset_days,
        shiftPattern.is_active !== false,
      ],
    )

    const insertResult = result as any
    return (await this.getShiftPatternById(shiftPattern.id)) as ShiftPatternRow
  }

  static async updateShiftPattern(
    id: string,
    updates: Partial<{
      name: string
      description: string
      start_time: string
      end_time: string
      rotation_type: 'fixed' | 'alternating' | 'rotating'
      rotation_days: number
      offset_days: number
      is_active: boolean
    }>,
  ): Promise<void> {
    const conn = await this.ensureConnection()

    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.start_time !== undefined) {
      fields.push('start_time = ?')
      values.push(updates.start_time)
    }
    if (updates.end_time !== undefined) {
      fields.push('end_time = ?')
      values.push(updates.end_time)
    }
    if (updates.rotation_type !== undefined) {
      fields.push('rotation_type = ?')
      values.push(updates.rotation_type)
    }
    if (updates.rotation_days !== undefined) {
      fields.push('rotation_days = ?')
      values.push(updates.rotation_days)
    }
    if (updates.offset_days !== undefined) {
      fields.push('offset_days = ?')
      values.push(updates.offset_days)
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(updates.is_active)
    }

    if (fields.length === 0) {
      return // No updates to make
    }

    values.push(id)
    await conn.execute(`UPDATE shift_patterns SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  static async deleteShiftPattern(id: string): Promise<void> {
    const conn = await this.ensureConnection()
    await conn.execute('UPDATE shift_patterns SET is_active = FALSE WHERE id = ?', [id])
  }

  // Assignment operations
  static async getAssignments(): Promise<AssignmentRow[]> {
    const conn = await this.ensureConnection()
    const [rows] = await conn.execute(
      'SELECT * FROM assignments WHERE is_active = TRUE ORDER BY start_date',
    )
    return rows as AssignmentRow[]
  }

  static async createAssignment(assignment: {
    porter_id: number
    department_id: number
    shift_pattern_id: string
    start_date: string
    end_date?: string
    is_permanent: boolean
  }): Promise<AssignmentRow> {
    const conn = await this.ensureConnection()

    const [result] = await conn.execute(
      `INSERT INTO assignments (porter_id, department_id, shift_pattern_id, start_date, end_date, is_permanent, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.porter_id,
        assignment.department_id,
        assignment.shift_pattern_id,
        assignment.start_date,
        assignment.end_date || null,
        assignment.is_permanent,
        true,
      ],
    )

    const insertId = (result as any).insertId
    const [rows] = await conn.execute('SELECT * FROM assignments WHERE id = ?', [insertId])
    return (rows as AssignmentRow[])[0]
  }
}
