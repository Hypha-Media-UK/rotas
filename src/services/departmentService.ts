import type {
  Department,
  DepartmentFormData,
  Porter,
  DepartmentType,
  OperatingSchedule,
} from '../types'
import { jsonStorage } from './jsonStorage'
import { PorterService } from './porterService'

interface DepartmentConfig {
  name: string
  department_type: DepartmentType
  operating_schedule: OperatingSchedule
  min_porters_required: number
  description: string
}

export class DepartmentService {
  // Get all departments ordered by display_order
  static getAllDepartments(): Department[] {
    const departments = jsonStorage.getAllDepartments()
    return departments.sort(
      (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name),
    )
  }

  // Create new department
  static createDepartment(data: DepartmentFormData): number {
    const departments = jsonStorage.getAllDepartments()
    const maxOrder =
      departments.length > 0 ? Math.max(...departments.map((d) => d.display_order)) : 0

    const newDepartment: Department = {
      id: jsonStorage.incrementDepartmentId(),
      name: data.name,
      min_porters_required: data.min_porters_required,
      department_type: data.department_type,
      operating_schedule: data.operating_schedule,
      display_order: maxOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    departments.push(newDepartment)
    jsonStorage.saveDepartments(departments)
    return newDepartment.id
  }

  // Update department
  static updateDepartment(id: number, data: Partial<DepartmentFormData>): boolean {
    const departments = jsonStorage.getAllDepartments()
    const departmentIndex = departments.findIndex((d) => d.id === id)
    if (departmentIndex === -1) return false

    const department = departments[departmentIndex]

    if (data.name !== undefined) department.name = data.name
    if (data.min_porters_required !== undefined)
      department.min_porters_required = data.min_porters_required
    if (data.department_type !== undefined) department.department_type = data.department_type
    if (data.operating_schedule !== undefined)
      department.operating_schedule = data.operating_schedule

    department.updated_at = new Date().toISOString()
    jsonStorage.saveDepartments(departments)
    return true
  }

  // Delete department
  static deleteDepartment(id: number): boolean {
    const departments = jsonStorage.getAllDepartments()
    const index = departments.findIndex((d) => d.id === id)
    if (index === -1) return false

    departments.splice(index, 1)
    jsonStorage.saveDepartments(departments)
    return true
  }

  // Get department by ID
  static getDepartmentById(id: number | string): Department | null {
    // Convert to number to handle both string and number inputs
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id
    console.log(
      `🔍 getDepartmentById called with ID: ${id} (type: ${typeof id}) → converted to: ${numericId}`,
    )

    const departments = jsonStorage.getAllDepartments()
    console.log(`🔍 Total departments available: ${departments.length}`)

    const found = departments.find((d) => d.id === numericId)
    console.log(`🔍 Department found:`, found ? `${found.name} (ID: ${found.id})` : 'NOT FOUND')

    return found || null
  }

  // Reorder departments
  static reorderDepartments(departmentIds: number[]): boolean {
    const departments = jsonStorage.getAllDepartments()
    departmentIds.forEach((id, index) => {
      const department = departments.find((d) => d.id === id)
      if (department) {
        department.display_order = index + 1
        department.updated_at = new Date().toISOString()
      }
    })
    jsonStorage.saveDepartments(departments)
    return true
  }

  // Get porters assigned to a department
  static getAssignedPorters(departmentId: number): Porter[] {
    const assignments = jsonStorage.getAllAssignments()
    const porters = jsonStorage.getAllPorters()

    const assignedPorterIds = assignments
      .filter((assignment) => assignment.department_id === departmentId)
      .map((assignment) => assignment.porter_id)

    return porters.filter((porter) => assignedPorterIds.includes(porter.id) && porter.is_active)
  }

  // Assign porter to department (unified method)
  static assignPorterToDepartment(porterId: number, departmentId: number | string): boolean {
    console.log(`🔧 Attempting to assign porter ${porterId} to department ${departmentId}`)

    const porter = PorterService.getPorterById(porterId)
    const department = this.getDepartmentById(departmentId)
    const assignments = jsonStorage.getAllAssignments()

    console.log(`🔍 Porter found:`, porter ? `${porter.name} (ID: ${porter.id})` : 'NOT FOUND')
    console.log(
      `🔍 Department found:`,
      department ? `${department.name} (ID: ${department.id})` : 'NOT FOUND',
    )

    if (!porter || !department) {
      console.warn(`❌ Cannot assign: Porter ${porterId} or Department ${departmentId} not found`)
      return false
    }

    // Check if already assigned
    const existingAssignment = assignments.find(
      (a) => a.porter_id === porterId && a.department_id === departmentId,
    )
    if (existingAssignment) {
      console.log(`✅ Assignment already exists: ${porter.name} → ${department.name}`)
      return true // Changed to true - assignment exists is success
    }

    const newAssignment = {
      id: jsonStorage.incrementAssignmentId(),
      porter_id: porterId,
      department_id: departmentId,
      is_permanent: true,
      start_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    console.log(`🔧 Creating assignment:`, newAssignment)
    assignments.push(newAssignment)
    jsonStorage.saveAssignments(assignments)
    console.log(`✅ Created assignment: ${porter.name} → ${department.name}`)
    console.log(`📊 Total assignments after creation: ${assignments.length}`)
    return true
  }

  // Get all assignments for a specific porter
  static getPorterAssignments(porterId: number) {
    const assignments = jsonStorage.getAllAssignments()
    return assignments.filter((a) => a.porter_id === porterId)
  }

  // Get all assignments (for debugging)
  static getAllAssignments() {
    return jsonStorage.getAllAssignments()
  }

  // Remove porter from department
  static removePorterFromDepartment(porterId: number, departmentId: number | string): boolean {
    // Convert departmentId to number for consistency
    const numericDepartmentId =
      typeof departmentId === 'string' ? parseInt(departmentId, 10) : departmentId
    const assignments = jsonStorage.getAllAssignments()
    const initialLength = assignments.length

    const filteredAssignments = assignments.filter(
      (a) => !(a.porter_id === porterId && a.department_id === numericDepartmentId),
    )

    if (filteredAssignments.length < initialLength) {
      jsonStorage.saveAssignments(filteredAssignments)
      return true
    }

    return false
  }

  // Clear all departments (for development/testing)
  static clearAllDepartments(): void {
    jsonStorage.clearAllData()
    console.log('All departments cleared')
  }

  // Get comprehensive department configurations
  private static getDepartmentConfigurations(): DepartmentConfig[] {
    return [
      // 4-on/4-off Shift Rotation Departments
      {
        name: 'Day Shift A',
        department_type: 'shift_rotation',
        operating_schedule: {
          days_of_week: [], // All days (4-on/4-off cycle)
          start_time: '07:00',
          end_time: '19:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 5,
        description: '12-hour day shift following 4-on/4-off rotation',
      },
      {
        name: 'Day Shift B',
        department_type: 'shift_rotation',
        operating_schedule: {
          days_of_week: [], // All days (4-on/4-off cycle)
          start_time: '07:00',
          end_time: '19:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 5,
        description: '12-hour day shift following 4-on/4-off rotation',
      },
      {
        name: 'Night Shift A',
        department_type: 'shift_rotation',
        operating_schedule: {
          days_of_week: [], // All days (4-on/4-off cycle)
          start_time: '19:00',
          end_time: '07:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 3,
        description: '12-hour night shift following 4-on/4-off rotation',
      },
      {
        name: 'Night Shift B',
        department_type: 'shift_rotation',
        operating_schedule: {
          days_of_week: [], // All days (4-on/4-off cycle)
          start_time: '19:00',
          end_time: '07:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 3,
        description: '12-hour night shift following 4-on/4-off rotation',
      },
      {
        name: 'PTS A',
        department_type: 'shift_rotation',
        operating_schedule: {
          days_of_week: [], // All days (4-on/4-off cycle)
          start_time: '07:00',
          end_time: '19:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 2,
        description: 'Patient Transport Service following 4-on/4-off rotation',
      },
      {
        name: 'PTS B',
        department_type: 'shift_rotation',
        operating_schedule: {
          days_of_week: [], // All days (4-on/4-off cycle)
          start_time: '07:00',
          end_time: '19:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 2,
        description: 'Patient Transport Service following 4-on/4-off rotation',
      },
      // Relief Department
      {
        name: 'Relief',
        department_type: 'relief',
        operating_schedule: {
          days_of_week: [], // Available all days
          start_time: '00:00',
          end_time: '23:59',
          is_24_hour: true,
          requires_shift_support: false,
        },
        min_porters_required: 3,
        description: 'Relief porters available for coverage across all departments',
      },
      // Emergency 24-Hour Department
      {
        name: 'Accident & Emergency',
        department_type: 'emergency_24h',
        operating_schedule: {
          days_of_week: [], // All days
          start_time: '00:00',
          end_time: '23:59',
          is_24_hour: true,
          requires_shift_support: true, // Can utilize Day/Night shift porters
        },
        min_porters_required: 2,
        description: '24-hour emergency department with additional Day/Night shift support',
      },
      // Standard Hours Departments
      {
        name: 'Radiology',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '07:00',
          end_time: '18:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Radiology department operating weekdays 7am-6pm',
      },
      {
        name: 'Pharmacy',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '08:00',
          end_time: '17:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Pharmacy operating weekdays 8am-5pm',
      },
      {
        name: 'Medical Records',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '08:00',
          end_time: '16:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Medical Records operating weekdays 8am-4pm',
      },
      {
        name: 'Laundry',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5, 6], // Monday-Saturday
          start_time: '06:00',
          end_time: '18:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Laundry operating Monday-Saturday 6am-6pm',
      },
      {
        name: 'External Waste',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '07:00',
          end_time: '15:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'External Waste collection weekdays 7am-3pm',
      },
      {
        name: 'Post',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '09:00',
          end_time: '17:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Post room operating weekdays 9am-5pm',
      },
      {
        name: 'Sharps',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '08:00',
          end_time: '16:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Sharps collection weekdays 8am-4pm',
      },
      {
        name: 'Blood Drivers',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '07:00',
          end_time: '17:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Blood transport drivers weekdays 7am-5pm',
      },
      {
        name: 'District Drivers',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '08:00',
          end_time: '18:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'District drivers weekdays 8am-6pm',
      },
      {
        name: 'Help Desk',
        department_type: 'standard_hours',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
          start_time: '08:00',
          end_time: '17:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Help Desk operating weekdays 8am-5pm',
      },
      // On-Demand Departments
      {
        name: 'Ad-Hoc',
        department_type: 'on_demand',
        operating_schedule: {
          days_of_week: [], // As needed
          start_time: '00:00',
          end_time: '23:59',
          is_24_hour: true,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Ad-hoc tasks and special assignments as needed',
      },
      {
        name: 'Training',
        department_type: 'on_demand',
        operating_schedule: {
          days_of_week: [1, 2, 3, 4, 5], // Typically weekdays
          start_time: '09:00',
          end_time: '17:00',
          is_24_hour: false,
          requires_shift_support: false,
        },
        min_porters_required: 1,
        description: 'Training sessions and development programs',
      },
    ]
  }

  // Initialize with seed data using comprehensive department configurations
  static initializeWithSeedData(): void {
    if (jsonStorage.hasDepartments()) {
      const departments = jsonStorage.getAllDepartments()
      console.log(`Departments already initialized: ${departments.length} departments found`)
      return // Already initialized
    }

    console.log('Initializing departments with comprehensive operating schedules...')

    const departmentConfigs = this.getDepartmentConfigurations()

    departmentConfigs.forEach((config) => {
      this.createDepartment({
        name: config.name,
        min_porters_required: config.min_porters_required,
        department_type: config.department_type,
        operating_schedule: config.operating_schedule,
      })
    })

    const departments = jsonStorage.getAllDepartments()
    console.log(`Initialized ${departments.length} departments with operating schedules`)

    // Log department types for verification
    const typeGroups = departments.reduce(
      (acc, dept) => {
        acc[dept.department_type] = (acc[dept.department_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    console.log('Department types initialized:', typeGroups)

    // Initialize basic porter assignments
    this.initializePorterAssignments()

    // Auto-assign porters based on their shift groups
    this.autoAssignPortersBasedOnShiftGroups()
  }

  // Initialize basic porter assignments for demonstration
  private static initializePorterAssignments(): void {
    const assignments = jsonStorage.getAllAssignments()
    if (assignments.length > 0) {
      console.log(`✅ Porter assignments already exist: ${assignments.length} assignments found`)
      return
    }

    console.log('🔧 Initializing basic porter assignments...')

    const departments = jsonStorage.getAllDepartments()
    const porters = jsonStorage.getAllPorters()

    console.log(`📊 Found ${departments.length} departments and ${porters.length} porters`)

    // Create some sample assignments
    const assignmentConfigs = [
      // Day Shift A - assign some Day Shift A porters
      { departmentName: 'Day Shift A', porterShiftGroup: 'Day Shift A', count: 3 },
      // Day Shift B - assign some Day Shift B porters
      { departmentName: 'Day Shift B', porterShiftGroup: 'Day Shift B', count: 3 },
      // Night Shift A - assign some Night Shift A porters
      { departmentName: 'Night Shift A', porterShiftGroup: 'Night Shift A', count: 2 },
      // Night Shift B - assign some Night Shift B porters
      { departmentName: 'Night Shift B', porterShiftGroup: 'Night Shift B', count: 2 },
      // PTS A - assign some PTS A porters
      { departmentName: 'PTS A', porterShiftGroup: 'PTS A', count: 1 },
      // PTS B - assign some PTS B porters
      { departmentName: 'PTS B', porterShiftGroup: 'PTS B', count: 1 },
      // A&E - assign some relief porters
      { departmentName: 'Accident & Emergency', porterType: 'Relief', count: 2 },
      // Standard departments - assign relief porters
      { departmentName: 'Radiology', porterType: 'Relief', count: 1 },
      { departmentName: 'Pharmacy', porterType: 'Relief', count: 1 },
    ]

    let assignmentCount = 0

    assignmentConfigs.forEach((config) => {
      const department = departments.find((d) => d.name === config.departmentName)
      if (!department) {
        console.warn(`❌ Department not found: ${config.departmentName}`)
        return
      }

      let availablePorters: Porter[] = []

      if ('porterShiftGroup' in config) {
        availablePorters = porters.filter(
          (p) => p.shift_group === config.porterShiftGroup && p.is_active,
        )
        console.log(
          `🔍 Found ${availablePorters.length} porters with shift group "${config.porterShiftGroup}" for ${department.name}`,
        )
      } else if ('porterType' in config) {
        availablePorters = porters.filter((p) => p.type === config.porterType && p.is_active)
        console.log(
          `🔍 Found ${availablePorters.length} porters with type "${config.porterType}" for ${department.name}`,
        )
      }

      // Assign the first N available porters
      const portersToAssign = availablePorters.slice(0, config.count)

      portersToAssign.forEach((porter) => {
        // Create assignment directly to avoid circular dependency
        const assignments = jsonStorage.getAllAssignments()
        const newAssignment = {
          id: jsonStorage.incrementAssignmentId(),
          porter_id: porter.id,
          department_id: department.id,
          is_permanent: true,
          start_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        }
        assignments.push(newAssignment)
        jsonStorage.saveAssignments(assignments)
        assignmentCount++
        console.log(`✅ Assigned ${porter.name} to ${department.name}`)
      })
    })

    console.log(`✅ Initialized ${assignmentCount} porter assignments`)
  }

  // Auto-assign porters to departments based on their shift groups
  static autoAssignPortersBasedOnShiftGroups(): number {
    console.log('🔧 Auto-assigning porters based on shift groups...')

    const departments = jsonStorage.getAllDepartments()
    const porters = jsonStorage.getAllPorters()
    let assignmentCount = 0

    // Smart assignment strategy: distribute porters across departments
    const assignmentStrategy = [
      // Day Shift A porters - assign to Day Shift A department
      {
        shiftGroup: 'Day Shift A',
        departments: [{ name: 'Day Shift A', priority: 1, maxPorters: 7 }],
      },
      // Day Shift B porters - assign to Day Shift B department
      {
        shiftGroup: 'Day Shift B',
        departments: [{ name: 'Day Shift B', priority: 1, maxPorters: 7 }],
      },
      // Night Shift porters - assign to their respective departments
      {
        shiftGroup: 'Night Shift A',
        departments: [{ name: 'Night Shift A', priority: 1, maxPorters: 4 }],
      },
      {
        shiftGroup: 'Night Shift B',
        departments: [{ name: 'Night Shift B', priority: 1, maxPorters: 4 }],
      },
      // PTS porters - assign to their respective departments
      {
        shiftGroup: 'PTS A',
        departments: [{ name: 'PTS A', priority: 1, maxPorters: 3 }],
      },
      {
        shiftGroup: 'PTS B',
        departments: [{ name: 'PTS B', priority: 1, maxPorters: 3 }],
      },
    ]

    // Apply smart assignment strategy
    assignmentStrategy.forEach((strategy) => {
      const availablePorters = porters.filter(
        (p) => p.shift_group === strategy.shiftGroup && p.is_active,
      )

      console.log(`📊 Found ${availablePorters.length} porters for ${strategy.shiftGroup}`)

      let porterIndex = 0

      // Assign porters to departments in priority order
      strategy.departments.forEach((deptConfig) => {
        const department = departments.find((d) => d.name === deptConfig.name)
        if (!department) return

        const portersToAssign = availablePorters.slice(
          porterIndex,
          porterIndex + deptConfig.maxPorters,
        )
        porterIndex += deptConfig.maxPorters

        portersToAssign.forEach((porter) => {
          const success = this.assignPorterToDepartment(porter.id, department.id)
          if (success) assignmentCount++
        })

        console.log(`  → Assigned ${portersToAssign.length} porters to ${deptConfig.name}`)
      })
    })

    // Smart assignment for Relief porters - distribute rather than duplicate
    const reliefPorters = porters.filter((p) => p.type === 'Relief' && p.is_active)
    const reliefDepartment = departments.find((d) => d.name === 'Relief')
    const aeDepartment = departments.find((d) => d.name === 'Accident & Emergency')

    console.log(`📊 Found ${reliefPorters.length} Relief porters`)

    // Assign first half to Relief, second half to A&E
    const midPoint = Math.ceil(reliefPorters.length / 2)

    if (reliefDepartment) {
      const reliefAssignments = reliefPorters.slice(0, midPoint)
      reliefAssignments.forEach((porter) => {
        const success = this.assignPorterToDepartment(porter.id, reliefDepartment.id)
        if (success) assignmentCount++
      })
      console.log(`  → Assigned ${reliefAssignments.length} porters to Relief`)
    }

    if (aeDepartment) {
      const aeAssignments = reliefPorters.slice(midPoint)
      aeAssignments.forEach((porter) => {
        const success = this.assignPorterToDepartment(porter.id, aeDepartment.id)
        if (success) assignmentCount++
      })
      console.log(`  → Assigned ${aeAssignments.length} porters to Accident & Emergency`)
    }

    console.log(`✅ Auto-assigned ${assignmentCount} porters to departments`)
    return assignmentCount
  }

  // Get departments by type
  static getDepartmentsByType(departmentType: string): Department[] {
    const departments = jsonStorage.getAllDepartments()
    return departments.filter((dept) => dept.department_type === departmentType)
  }

  // Check if department is operating on a specific day and time
  static isDepartmentOperating(departmentId: number, dayOfWeek: number, time: string): boolean {
    const department = this.getDepartmentById(departmentId)
    if (!department) return false

    const schedule = department.operating_schedule

    // Check if operating on this day (empty array means all days)
    if (schedule.days_of_week.length > 0 && !schedule.days_of_week.includes(dayOfWeek)) {
      return false
    }

    // Check if operating at this time
    if (schedule.is_24_hour) {
      return true
    }

    // Compare time ranges (simplified - assumes same day)
    return time >= schedule.start_time && time <= schedule.end_time
  }

  // Get departments operating on a specific day
  static getDepartmentsOperatingOnDay(dayOfWeek: number): Department[] {
    const departments = jsonStorage.getAllDepartments()
    return departments.filter((dept) => {
      const schedule = dept.operating_schedule
      // Empty days_of_week array means operates all days
      return schedule.days_of_week.length === 0 || schedule.days_of_week.includes(dayOfWeek)
    })
  }

  // Get departments that require shift support (like A&E)
  static getDepartmentsRequiringShiftSupport(): Department[] {
    const departments = jsonStorage.getAllDepartments()
    return departments.filter((dept) => dept.operating_schedule.requires_shift_support)
  }

  // Format operating schedule for display
  static formatOperatingSchedule(department: Department): string {
    const schedule = department.operating_schedule

    if (schedule.is_24_hour) {
      return '24 Hours'
    }

    const days =
      schedule.days_of_week.length === 0
        ? 'All Days'
        : schedule.days_of_week
            .map((day) => {
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              return dayNames[day]
            })
            .join(', ')

    return `${days} ${schedule.start_time}-${schedule.end_time}`
  }
}
