import type {
  Department,
  DepartmentFormData,
  Porter,
  DepartmentType,
  OperatingSchedule,
} from '../types'
import { MySQLDatabaseService } from './mysqlDatabase'
import { PorterServiceMySQL } from './porterServiceMySQL'

interface DepartmentConfig {
  name: string
  department_type: DepartmentType
  operating_schedule: OperatingSchedule
  min_porters_required: number
  description: string
}

export class DepartmentServiceMySQL {
  // Get all departments ordered by name
  static async getAllDepartments(): Promise<Department[]> {
    try {
      return await MySQLDatabaseService.getDepartments()
    } catch (error) {
      console.error('Failed to get departments:', error)
      return []
    }
  }

  // Create new department
  static async createDepartment(data: DepartmentFormData): Promise<Department> {
    try {
      const newDepartment: Omit<Department, 'id' | 'created_at' | 'updated_at'> = {
        name: data.name,
        display_order: 1, // Default value
        min_porters_required: data.min_porters_required,
        department_type: data.department_type,
        operating_schedule: data.operating_schedule,
      }

      const createdDepartment = await MySQLDatabaseService.createDepartment(newDepartment)
      return createdDepartment
    } catch (error) {
      console.error('Failed to create department:', error)
      throw error
    }
  }

  // Update department
  static async updateDepartment(id: number, data: Partial<DepartmentFormData>): Promise<boolean> {
    try {
      const updates: Partial<Department> = {}

      if (data.name !== undefined) updates.name = data.name
      if (data.min_porters_required !== undefined)
        updates.min_porters_required = data.min_porters_required
      if (data.department_type !== undefined) updates.department_type = data.department_type
      if (data.operating_schedule !== undefined)
        updates.operating_schedule = data.operating_schedule

      await MySQLDatabaseService.updateDepartment(id, updates)
      return true
    } catch (error) {
      console.error('Failed to update department:', error)
      return false
    }
  }

  // Delete department (soft delete)
  static async deleteDepartment(id: number): Promise<boolean> {
    try {
      await MySQLDatabaseService.deleteDepartment(id)
      return true
    } catch (error) {
      console.error('Failed to delete department:', error)
      return false
    }
  }

  // Get department by ID
  static async getDepartmentById(id: number | string): Promise<Department | null> {
    try {
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id
      const departments = await MySQLDatabaseService.getDepartments()
      return departments.find((d) => d.id === numericId) || null
    } catch (error) {
      console.error('Failed to get department by ID:', error)
      return null
    }
  }

  // Get departments by type
  static async getDepartmentsByType(type: DepartmentType): Promise<Department[]> {
    try {
      const departments = await MySQLDatabaseService.getDepartments()
      return departments.filter((d) => d.department_type === type)
    } catch (error) {
      console.error('Failed to get departments by type:', error)
      return []
    }
  }

  // Get assigned porters for a department
  static async getAssignedPorters(departmentId: number): Promise<Porter[]> {
    try {
      const assignments = await MySQLDatabaseService.getAssignments()
      const departmentAssignments = assignments.filter((a) => a.department_id === departmentId)

      const porters: Porter[] = []
      for (const assignment of departmentAssignments) {
        const porter = await PorterServiceMySQL.getPorterById(assignment.porter_id)
        if (porter) {
          porters.push(porter)
        }
      }

      return porters.sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Failed to get assigned porters:', error)
      return []
    }
  }

  // Check if department is operating on a specific date/time
  static isDepartmentOperating(department: Department, date: Date): boolean {
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
    const schedule = department.operating_schedule

    // If 24-hour operation, always operating
    if (schedule.is_24_hour) {
      return true
    }

    // If days_of_week is empty, operates all days
    if (schedule.days_of_week.length === 0) {
      return true
    }

    // Check if current day is in operating days
    return schedule.days_of_week.includes(dayOfWeek)
  }

  // Get department statistics
  static async getDepartmentStats(): Promise<{
    total: number
    byType: Record<DepartmentType, number>
    totalPortersAssigned: number
  }> {
    try {
      const departments = await MySQLDatabaseService.getDepartments()
      const assignments = await MySQLDatabaseService.getAssignments()

      const stats = {
        total: departments.length,
        byType: {} as Record<DepartmentType, number>,
        totalPortersAssigned: assignments.length,
      }

      // Count by type
      departments.forEach((dept) => {
        stats.byType[dept.department_type] = (stats.byType[dept.department_type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Failed to get department statistics:', error)
      return {
        total: 0,
        byType: {} as Record<DepartmentType, number>,
        totalPortersAssigned: 0,
      }
    }
  }

  // Initialize with seed data (for compatibility)
  static async initializeWithSeedData(): Promise<void> {
    try {
      const existingDepartments = await this.getAllDepartments()
      if (existingDepartments.length > 0) {
        console.log('Departments already exist, skipping seed data')
        return
      }

      console.log('No existing departments found, but MySQL should already have seed data')
      // The MySQL database should already be seeded via the SQL script
    } catch (error) {
      console.error('Failed to initialize department seed data:', error)
    }
  }

  // Get departments that require shift support (like A&E)
  static async getDepartmentsRequiringShiftSupport(): Promise<Department[]> {
    try {
      const departments = await MySQLDatabaseService.getDepartments()
      return departments.filter((d) => d.operating_schedule.requires_shift_support)
    } catch (error) {
      console.error('Failed to get departments requiring shift support:', error)
      return []
    }
  }

  // Get 24-hour departments
  static async get24HourDepartments(): Promise<Department[]> {
    try {
      const departments = await MySQLDatabaseService.getDepartments()
      return departments.filter((d) => d.operating_schedule.is_24_hour)
    } catch (error) {
      console.error('Failed to get 24-hour departments:', error)
      return []
    }
  }
}
