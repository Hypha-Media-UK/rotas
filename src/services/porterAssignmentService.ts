import type { Porter, Department, DepartmentType } from '../types'
import { PorterService } from './porterService'
import { DepartmentService } from './departmentService'
import { ShiftService } from './shiftService'

export class PorterAssignmentService {
  // Get porters available for assignment to a specific department
  static getAvailablePortersForDepartment(departmentId: number, date?: string): Porter[] {
    const department = DepartmentService.getDepartmentById(departmentId)
    if (!department) return []

    const allPorters = PorterService.getAllPorters()
    const assignedPorters = DepartmentService.getAssignedPorters(departmentId)
    const assignedIds = new Set(assignedPorters.map(p => p.id))

    // Filter out already assigned porters
    let availablePorters = allPorters.filter(porter => !assignedIds.has(porter.id))

    // Apply department-specific filtering
    availablePorters = this.filterPortersByDepartmentType(availablePorters, department, date)

    return availablePorters.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Filter porters based on department type and operating schedule
  private static filterPortersByDepartmentType(
    porters: Porter[], 
    department: Department, 
    date?: string
  ): Porter[] {
    switch (department.department_type) {
      case 'shift_rotation':
        return this.getShiftRotationPorters(porters, department, date)
      
      case 'emergency_24h':
        return this.getEmergencyPorters(porters, department, date)
      
      case 'relief':
        return this.getReliefPorters(porters)
      
      case 'standard_hours':
        return this.getStandardHoursPorters(porters)
      
      case 'on_demand':
        return this.getOnDemandPorters(porters)
      
      default:
        return porters
    }
  }

  // Get porters for shift rotation departments (Day/Night Shift A/B, PTS A/B)
  private static getShiftRotationPorters(porters: Porter[], department: Department, date?: string): Porter[] {
    // For shift rotation departments, only show porters from the correct shift group
    const departmentName = department.name
    
    if (departmentName.includes('Day Shift')) {
      // Day Shift A/B should only show Day Shift porters
      return porters.filter(porter => 
        porter.shift_group?.includes('Day Shift') || porter.type === 'Relief'
      )
    }
    
    if (departmentName.includes('Night Shift')) {
      // Night Shift A/B should only show Night Shift porters
      return porters.filter(porter => 
        porter.shift_group?.includes('Night Shift') || porter.type === 'Relief'
      )
    }
    
    if (departmentName.includes('PTS')) {
      // PTS A/B follows day shift rotation, so show Day Shift porters + Relief
      return porters.filter(porter => 
        porter.shift_group?.includes('Day Shift') || porter.type === 'Relief'
      )
    }

    return porters
  }

  // Get porters for emergency departments (A&E)
  private static getEmergencyPorters(porters: Porter[], department: Department, date?: string): Porter[] {
    // A&E can use:
    // 1. Regular porters assigned to A&E
    // 2. Relief porters
    // 3. Additional support from active Day/Night shift porters
    
    let availablePorters = porters.filter(porter => 
      porter.type === 'Regular' || porter.type === 'Relief'
    )

    // If date is provided, add porters from active shifts
    if (date && department.operating_schedule.requires_shift_support) {
      const dayShiftInfo = ShiftService.calculateShiftForDate(date, 'day')
      const nightShiftInfo = ShiftService.calculateShiftForDate(date, 'night')

      // Add porters from active day shift
      const activeDayShiftPorters = porters.filter(porter => 
        porter.shift_group === dayShiftInfo.working_shift_group
      )

      // Add porters from active night shift
      const activeNightShiftPorters = porters.filter(porter => 
        porter.shift_group === nightShiftInfo.working_shift_group
      )

      // Combine all available porters (remove duplicates)
      const allAvailable = [
        ...availablePorters,
        ...activeDayShiftPorters,
        ...activeNightShiftPorters
      ]

      // Remove duplicates based on porter ID
      const uniquePorters = allAvailable.filter((porter, index, array) => 
        array.findIndex(p => p.id === porter.id) === index
      )

      return uniquePorters
    }

    return availablePorters
  }

  // Get porters for relief department
  private static getReliefPorters(porters: Porter[]): Porter[] {
    // Relief department can use any Relief type porters
    return porters.filter(porter => porter.type === 'Relief')
  }

  // Get porters for standard hours departments
  private static getStandardHoursPorters(porters: Porter[]): Porter[] {
    // Standard hours departments typically use Regular porters and Relief for coverage
    return porters.filter(porter => 
      porter.type === 'Regular' || porter.type === 'Relief'
    )
  }

  // Get porters for on-demand departments
  private static getOnDemandPorters(porters: Porter[]): Porter[] {
    // On-demand departments can use any available porter
    return porters
  }

  // Get department-specific assignment recommendations
  static getAssignmentRecommendations(departmentId: number, date?: string): {
    recommended: Porter[]
    additional: Porter[]
    notes: string[]
  } {
    const department = DepartmentService.getDepartmentById(departmentId)
    if (!department) {
      return { recommended: [], additional: [], notes: ['Department not found'] }
    }

    const availablePorters = this.getAvailablePortersForDepartment(departmentId, date)
    const notes: string[] = []

    let recommended: Porter[] = []
    let additional: Porter[] = []

    switch (department.department_type) {
      case 'shift_rotation':
        recommended = availablePorters.filter(porter => 
          porter.shift_group?.includes(department.name.includes('Day') ? 'Day' : 'Night')
        )
        additional = availablePorters.filter(porter => porter.type === 'Relief')
        notes.push('Shift rotation departments follow 4-on/4-off schedule')
        break

      case 'emergency_24h':
        recommended = availablePorters.filter(porter => porter.type === 'Regular')
        additional = availablePorters.filter(porter => 
          porter.type === 'Relief' || porter.shift_group
        )
        notes.push('Emergency departments operate 24/7 and can utilize shift porters for additional support')
        break

      case 'standard_hours':
        recommended = availablePorters.filter(porter => porter.type === 'Regular')
        additional = availablePorters.filter(porter => porter.type === 'Relief')
        notes.push(`Operating ${DepartmentService.formatOperatingSchedule(department)}`)
        break

      case 'relief':
        recommended = availablePorters.filter(porter => porter.type === 'Relief')
        additional = []
        notes.push('Relief porters provide coverage across all departments')
        break

      case 'on_demand':
        recommended = availablePorters.slice(0, department.min_porters_required)
        additional = availablePorters.slice(department.min_porters_required)
        notes.push('On-demand departments operate as needed')
        break

      default:
        recommended = availablePorters
        additional = []
    }

    return { recommended, additional, notes }
  }

  // Check if a porter assignment is valid for a department
  static isValidAssignment(porterId: number, departmentId: number, date?: string): {
    valid: boolean
    reason?: string
  } {
    const porter = PorterService.getPorterById(porterId)
    const department = DepartmentService.getDepartmentById(departmentId)

    if (!porter || !department) {
      return { valid: false, reason: 'Porter or department not found' }
    }

    // Check if porter is available for this department type
    const availablePorters = this.getAvailablePortersForDepartment(departmentId, date)
    const isAvailable = availablePorters.some(p => p.id === porterId)

    if (!isAvailable) {
      return { 
        valid: false, 
        reason: `${porter.name} is not suitable for ${department.name} (${department.department_type})` 
      }
    }

    return { valid: true }
  }

  // Get porter utilization statistics
  static getPorterUtilization(): {
    total: number
    assigned: number
    available: number
    byType: Record<string, { assigned: number; total: number }>
  } {
    const allPorters = PorterService.getAllPorters()
    const allDepartments = DepartmentService.getAllDepartments()

    let totalAssigned = 0
    const byType: Record<string, { assigned: number; total: number }> = {}

    // Initialize type counters
    allPorters.forEach(porter => {
      if (!byType[porter.type]) {
        byType[porter.type] = { assigned: 0, total: 0 }
      }
      byType[porter.type].total++
    })

    // Count assignments
    allDepartments.forEach(dept => {
      const assignedPorters = DepartmentService.getAssignedPorters(dept.id)
      totalAssigned += assignedPorters.length

      assignedPorters.forEach(porter => {
        if (byType[porter.type]) {
          byType[porter.type].assigned++
        }
      })
    })

    return {
      total: allPorters.length,
      assigned: totalAssigned,
      available: allPorters.length - totalAssigned,
      byType
    }
  }
}
