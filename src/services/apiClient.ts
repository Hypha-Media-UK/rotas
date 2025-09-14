// API client for communicating with the backend server
import type {
  Porter,
  Department,
  ShiftPattern,
  PorterDepartmentAssignment,
  ShiftType,
} from '@/types'
import { invalidateCache } from '@/utils/cache'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      0,
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export class ApiClient {
  // Transform operating hours from API format to frontend format
  private static transformOperatingHours(operatingHours: any): any {
    if (!operatingHours || typeof operatingHours !== 'object') {
      return {
        days_of_week: [1, 2, 3, 4, 5, 6, 7], // Default to all days
        start_time: '00:00',
        end_time: '23:59',
        is_24_hour: true,
        requires_shift_support: false,
      }
    }

    // Convert day-by-day format to days_of_week array
    const dayMap: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
    }

    const activeDays: number[] = []
    let startTime = '00:00'
    let endTime = '23:59'
    let is24Hour = false

    // Check which days are active and get time ranges
    for (const [day, schedule] of Object.entries(operatingHours)) {
      if (schedule && typeof schedule === 'object' && 'start' in schedule && 'end' in schedule) {
        const dayNum = dayMap[day.toLowerCase()]
        if (dayNum) {
          activeDays.push(dayNum)
          // Use the first day's schedule as the default time range
          if (activeDays.length === 1) {
            startTime = (schedule as any).start || '00:00'
            endTime = (schedule as any).end || '23:59'
            is24Hour = startTime === '00:00' && endTime === '23:59'
          }
        }
      }
    }

    return {
      days_of_week: activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5, 6, 7],
      start_time: startTime,
      end_time: endTime,
      is_24_hour: is24Hour,
      requires_shift_support: false, // Default value
    }
  }

  // Porter operations
  static async getPorters(): Promise<Porter[]> {
    const porters = await apiRequest<any[]>('/porters')

    // Transform backend data to frontend format
    return porters.map((porter) => ({
      id: porter.id,
      name: porter.name,
      type: porter.role as any, // Map role to type
      contracted_hours: porter.contracted_hours || undefined, // Use real contracted_hours from database
      break_duration_minutes: 30, // Default value
      shift_group: porter.shift_group || undefined, // Use actual shift_group from database
      is_active: Boolean(porter.is_active),
      employee_id: porter.employee_id,
      email: porter.email,
      phone: porter.phone,
      qualifications: Array.isArray(porter.qualifications) ? porter.qualifications : [],
      created_at: porter.created_at,
      updated_at: porter.updated_at,
    }))
  }

  static async getPorterById(id: number): Promise<Porter | null> {
    try {
      const porter = await apiRequest<any>(`/porters/${id}`)

      return {
        id: porter.id,
        name: porter.name,
        type: porter.role as any,
        contracted_hours: porter.contracted_hours || undefined, // Use real contracted_hours from database
        break_duration_minutes: 30,
        shift_group: porter.role.includes('Day')
          ? 'Day Shift'
          : porter.role.includes('Night')
            ? 'Night Shift'
            : porter.role.includes('PTS')
              ? 'PTS'
              : undefined,
        is_active: Boolean(porter.is_active),
        employee_id: porter.employee_id,
        email: porter.email,
        phone: porter.phone,
        qualifications: Array.isArray(porter.qualifications) ? porter.qualifications : [],
        created_at: porter.created_at,
        updated_at: porter.updated_at,
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  static async createPorter(porter: {
    name: string
    type: string
    employee_id?: string
    email?: string
    phone?: string
    qualifications?: string[]
    contracted_hours?: Record<string, { start: string; end: string }>
  }): Promise<Porter> {
    // Generate employee_id and email if not provided
    const employee_id = porter.employee_id || `P${Date.now().toString().slice(-6)}`
    const email =
      porter.email || `${porter.name.toLowerCase().replace(/\s+/g, '.')}.porter@hospital.nhs.uk`

    const newPorter = await apiRequest<any>('/porters', {
      method: 'POST',
      body: JSON.stringify({
        name: porter.name,
        employee_id,
        email,
        phone: porter.phone,
        role: porter.type, // Map type to role
        qualifications: porter.qualifications || [],
        contracted_hours: porter.contracted_hours,
      }),
    })

    return {
      id: newPorter.id,
      name: newPorter.name,
      type: newPorter.role as any,
      contracted_hours: newPorter.contracted_hours || undefined, // Use real data from backend
      break_duration_minutes: 30,
      shift_group: newPorter.role.includes('Day')
        ? 'Day Shift'
        : newPorter.role.includes('Night')
          ? 'Night Shift'
          : newPorter.role.includes('PTS')
            ? 'PTS'
            : undefined,
      is_active: Boolean(newPorter.is_active),
      employee_id: newPorter.employee_id,
      email: newPorter.email,
      phone: newPorter.phone,
      qualifications: Array.isArray(newPorter.qualifications) ? newPorter.qualifications : [],
      created_at: newPorter.created_at,
      updated_at: newPorter.updated_at,
    }
  }

  static async updatePorter(id: number, updates: Partial<Porter>): Promise<void> {
    const backendUpdates: any = {}

    if (updates.name !== undefined) backendUpdates.name = updates.name
    if (updates.type !== undefined) backendUpdates.role = updates.type
    if (updates.employee_id !== undefined) backendUpdates.employee_id = updates.employee_id
    if (updates.email !== undefined) backendUpdates.email = updates.email
    if (updates.phone !== undefined) backendUpdates.phone = updates.phone
    if (updates.qualifications !== undefined) backendUpdates.qualifications = updates.qualifications
    if (updates.contracted_hours !== undefined)
      backendUpdates.contracted_hours = updates.contracted_hours
    if (updates.is_active !== undefined) backendUpdates.is_active = updates.is_active
    if (updates.shift_group !== undefined) backendUpdates.shift_group = updates.shift_group

    await apiRequest(`/porters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendUpdates),
    })
  }

  static async deletePorter(id: number): Promise<void> {
    await apiRequest(`/porters/${id}`, {
      method: 'DELETE',
    })
  }

  // Transform backend shift pattern data to frontend format
  private static transformShiftPatternToShiftType(pattern: any): ShiftType {
    return {
      id: pattern.id,
      name: pattern.name,
      description: pattern.description || '',
      start_time: pattern.start_time,
      end_time: pattern.end_time,
      rotation_type: pattern.rotation_type,
      rotation_days: pattern.rotation_days,
      offset_days: pattern.offset_days,
      is_active: pattern.is_active,
      created_at: pattern.created_at,
      updated_at: pattern.updated_at,
    }
  }

  // Transform frontend shift type data to backend format
  private static transformShiftTypeToShiftPattern(shiftType: any): any {
    return {
      id: shiftType.id,
      name: shiftType.name,
      description: shiftType.description || null,
      start_time: shiftType.start_time,
      end_time: shiftType.end_time,
      rotation_type: shiftType.rotation_type,
      rotation_days: shiftType.rotation_days,
      offset_days: shiftType.offset_days,
      is_active: shiftType.is_active !== false,
    }
  }

  // Shift Type operations
  static async getShiftTypes(): Promise<ShiftType[]> {
    console.log('🔍 Fetching shift types from database...')
    const patterns = await apiRequest<any[]>('/shift-patterns')
    const shiftTypes = patterns.map(this.transformShiftPatternToShiftType)
    console.log(`✅ Found ${shiftTypes.length} shift types in database`)
    return shiftTypes
  }

  static async getShiftTypeById(id: string): Promise<ShiftType | null> {
    console.log(`🔍 Searching for shift type ${id} in database...`)
    try {
      const pattern = await apiRequest<any>(`/shift-patterns/${id}`)
      const shiftType = this.transformShiftPatternToShiftType(pattern)
      console.log(`✅ Found shift type: ${shiftType.name}`)
      return shiftType
    } catch (error) {
      console.log(`❌ Shift type ${id} not found in database`)
      return null
    }
  }

  static async createShiftType(shiftType: {
    name: string
    description?: string
    start_time: string
    end_time: string
    rotation_type: 'fixed' | 'alternating' | 'rotating'
    rotation_days: number
    offset_days: number
    is_active: boolean
  }): Promise<ShiftType> {
    console.log(`🆕 Creating new shift type: ${shiftType.name}`)
    const shiftTypeWithId = {
      id: `shift_${Date.now()}`,
      ...shiftType,
    }

    const backendData = this.transformShiftTypeToShiftPattern(shiftTypeWithId)
    const createdPattern = await apiRequest<any>('/shift-patterns', {
      method: 'POST',
      body: JSON.stringify(backendData),
    })

    const newShiftType = this.transformShiftPatternToShiftType(createdPattern)
    console.log(
      `✅ Successfully created shift type in database: ${newShiftType.name} (ID: ${newShiftType.id})`,
    )

    return newShiftType
  }

  static async updateShiftType(id: string, updates: Partial<ShiftType>): Promise<void> {
    console.log(`📝 Updating shift type ${id} in database...`)

    const backendUpdates = this.transformShiftTypeToShiftPattern(updates)
    await apiRequest(`/shift-patterns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendUpdates),
    })

    console.log(`✅ Successfully updated shift type ${id} in database`)
  }

  static async deleteShiftType(id: string): Promise<void> {
    console.log(`🗑️ Deleting shift type ${id} from database...`)

    await apiRequest(`/shift-patterns/${id}`, {
      method: 'DELETE',
    })

    console.log(`✅ Successfully deleted shift type ${id} from database`)
  }

  static async getPortersByShiftType(shiftTypeId: string): Promise<Porter[]> {
    // For now, return empty array - this would need backend implementation
    console.log(`⚠️ getPortersByShiftType(${shiftTypeId}) not yet implemented in backend`)
    return []
  }

  // Department operations
  static async getDepartments(): Promise<Department[]> {
    const departments = await apiRequest<any[]>('/departments')

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      display_order: 1, // Default value
      min_porters_required: dept.required_staff,
      operating_hours: dept.operating_hours,
      created_at: dept.created_at,
      updated_at: dept.updated_at,
      code: dept.code,
    }))
  }

  static async getDepartmentById(id: number): Promise<Department | null> {
    try {
      const dept = await apiRequest<any>(`/departments/${id}`)

      return {
        id: dept.id,
        name: dept.name,
        display_order: 1,
        min_porters_required: dept.required_staff,
        operating_hours: dept.operating_hours,
        created_at: dept.created_at,
        updated_at: dept.updated_at,
        code: dept.code,
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  static async createDepartment(department: {
    name: string
    min_porters_required: number
    operating_hours?: any
  }): Promise<Department> {
    // Generate a unique code by checking existing departments
    const existingDepartments = await this.getDepartments()
    const existingCodes = existingDepartments.map((d) => d.code).filter(Boolean)

    let baseCode = department.name.toUpperCase().replace(/\s+/g, '_').slice(0, 8)
    let code = baseCode
    let counter = 1

    // Ensure the code is unique
    while (existingCodes.includes(code)) {
      code = `${baseCode}_${counter}`
      if (code.length > 10) {
        baseCode = baseCode.slice(0, 6)
        code = `${baseCode}_${counter}`
      }
      counter++
    }

    const newDept = await apiRequest<any>('/departments', {
      method: 'POST',
      body: JSON.stringify({
        name: department.name,
        code,
        operating_hours: department.operating_hours || {},
        required_staff: department.min_porters_required,
      }),
    })

    return {
      id: newDept.id,
      name: newDept.name,
      display_order: 1,
      min_porters_required: newDept.required_staff,
      operating_hours: newDept.operating_hours,
      created_at: newDept.created_at,
      updated_at: newDept.updated_at,
      code: newDept.code,
    }
  }

  static async updateDepartment(id: number, updates: Partial<Department>): Promise<void> {
    const backendUpdates: any = {}

    if (updates.name !== undefined) backendUpdates.name = updates.name
    if (updates.min_porters_required !== undefined)
      backendUpdates.required_staff = updates.min_porters_required
    if (updates.operating_hours !== undefined)
      backendUpdates.operating_hours = updates.operating_hours
    if (updates.code !== undefined) backendUpdates.code = updates.code

    await apiRequest(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendUpdates),
    })
  }

  static async deleteDepartment(id: number): Promise<void> {
    await apiRequest(`/departments/${id}`, {
      method: 'DELETE',
    })
  }

  // Shift pattern operations
  static async getShiftPatterns(): Promise<ShiftPattern[]> {
    const patterns = await apiRequest<any[]>('/shift-patterns')

    return patterns.map((pattern) => ({
      id: parseInt(pattern.id),
      name: pattern.name,
      description: pattern.description,
      start_time: pattern.start_time,
      end_time: pattern.end_time,
      rotation_type: pattern.rotation_type,
      rotation_days: pattern.rotation_days,
      offset_days: pattern.offset_days,
      is_active: Boolean(pattern.is_active),
      created_at: pattern.created_at,
      updated_at: pattern.updated_at,
    }))
  }

  // Assignment operations
  static async getAssignments(): Promise<PorterDepartmentAssignment[]> {
    const assignments = await apiRequest<any[]>('/assignments')

    return assignments.map((assignment) => ({
      id: assignment.id,
      porter_id: assignment.porter_id,
      department_id: assignment.department_id,
      shift_pattern_id: assignment.shift_pattern_id,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      is_permanent: Boolean(assignment.is_permanent),
      is_active: Boolean(assignment.is_active),
      created_at: assignment.created_at,
    }))
  }

  static async createAssignment(assignment: {
    porter_id: number
    department_id: number
    shift_pattern_id: string
    start_date: string
    end_date?: string
    is_permanent: boolean
  }): Promise<PorterDepartmentAssignment> {
    const newAssignment = await apiRequest<any>('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    })

    // Invalidate assignment cache since we created a new assignment
    invalidateCache.assignments()

    return {
      id: newAssignment.id,
      porter_id: newAssignment.porter_id,
      department_id: newAssignment.department_id,
      shift_pattern_id: newAssignment.shift_pattern_id,
      start_date: newAssignment.start_date,
      end_date: newAssignment.end_date,
      is_permanent: Boolean(newAssignment.is_permanent),
      is_active: Boolean(newAssignment.is_active),
      created_at: newAssignment.created_at,
    }
  }

  // Convenience methods for porter-department assignments
  static async getPorterAssignments(porterId: number): Promise<PorterDepartmentAssignment[]> {
    const assignments = await this.getAssignments()
    return assignments.filter(
      (assignment) => assignment.porter_id === porterId && assignment.is_active,
    )
  }

  static async assignPorterToDepartment(
    porterId: number,
    departmentId: number,
  ): Promise<PorterDepartmentAssignment> {
    return await this.createAssignment({
      porter_id: porterId,
      department_id: departmentId,
      shift_pattern_id: 'day_shift', // Default shift pattern
      start_date: new Date().toISOString().split('T')[0],
      is_permanent: true,
    })
  }

  // NOTE: Backend API doesn't support updating assignments
  // The updateAssignment method has been removed because PUT /assignments/{id} returns 404

  static async removePorterAssignment(porterId: number, departmentId: number): Promise<void> {
    // NOTE: Backend API doesn't support updating or deleting assignments
    // This method is kept for compatibility but doesn't actually remove assignments
    console.log(
      `ℹ️ removePorterAssignment called for porter ${porterId} and department ${departmentId}`,
    )
    console.log(`ℹ️ Backend API doesn't support assignment removal - operation skipped`)
  }
}
