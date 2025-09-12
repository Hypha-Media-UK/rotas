import type { Department, DepartmentFormData } from '@/types'
import { ApiClient } from './apiClient'

export class DepartmentServiceAPI {
  // Get all departments
  static async getAllDepartments(): Promise<Department[]> {
    try {
      console.log('🔍 Fetching all departments from API...')
      const departments = await ApiClient.getDepartments()
      console.log(`✅ Successfully fetched ${departments.length} departments from API`)
      return departments
    } catch (error) {
      console.error('❌ Error fetching departments from API:', error)
      return []
    }
  }

  // Get department by ID
  static async getDepartmentById(id: number): Promise<Department | null> {
    try {
      console.log(`🔍 Fetching department ${id} from API...`)
      const department = await ApiClient.getDepartmentById(id)
      if (department) {
        console.log(`✅ Successfully fetched department ${department.name} from API`)
      } else {
        console.log(`ℹ️ Department ${id} not found in API`)
      }
      return department
    } catch (error) {
      console.error(`❌ Error fetching department ${id} from API:`, error)
      return null
    }
  }

  // Create new department
  static async createDepartment(data: any): Promise<Department> {
    try {
      console.log(`🆕 Creating new department ${data.name} via API...`)

      const newDepartment = {
        name: data.name,
        min_porters_required: data.min_porters_required,
        operating_hours: data.operating_hours || {
          sunday: null,
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' },
          saturday: null,
        },
      }

      const createdDepartment = await ApiClient.createDepartment(newDepartment)
      console.log(
        `✅ Successfully created department ${createdDepartment.name} (ID: ${createdDepartment.id}) via API`,
      )

      return createdDepartment
    } catch (error) {
      console.error(`❌ Error creating department ${data.name} via API:`, error)
      throw error
    }
  }

  // Update department
  static async updateDepartment(id: number, data: any): Promise<void> {
    try {
      console.log(`📝 Updating department ${id} via API...`)

      const updates: Partial<Department> = {}

      if (data.name !== undefined) updates.name = data.name
      if (data.min_porters_required !== undefined)
        updates.min_porters_required = data.min_porters_required
      if (data.operating_hours !== undefined) updates.operating_hours = data.operating_hours

      await ApiClient.updateDepartment(id, updates)
      console.log(`✅ Successfully updated department ${id} via API`)
    } catch (error) {
      console.error(`❌ Error updating department ${id} via API:`, error)
      throw error
    }
  }

  // Delete department (soft delete)
  static async deleteDepartment(id: number): Promise<void> {
    try {
      console.log(`🗑️ Deleting department ${id} via API...`)
      await ApiClient.deleteDepartment(id)
      console.log(`✅ Successfully deleted department ${id} via API`)
    } catch (error) {
      console.error(`❌ Error deleting department ${id} via API:`, error)
      throw error
    }
  }

  // Get active departments
  static async getActiveDepartments(): Promise<Department[]> {
    try {
      // All departments from API are active (filtered on backend)
      return await this.getAllDepartments()
    } catch (error) {
      console.error('❌ Error fetching active departments from API:', error)
      return []
    }
  }

  // Search departments by name
  static async searchDepartments(query: string): Promise<Department[]> {
    try {
      const allDepartments = await this.getAllDepartments()
      const lowercaseQuery = query.toLowerCase()
      return allDepartments.filter(
        (department) =>
          department.name.toLowerCase().includes(lowercaseQuery) ||
          department.code?.toLowerCase().includes(lowercaseQuery),
      )
    } catch (error) {
      console.error(`❌ Error searching departments with query "${query}" from API:`, error)
      return []
    }
  }

  // Get department statistics
  static async getDepartmentStats(): Promise<{
    total: number
    byType: Record<string, number>
    totalRequiredStaff: number
  }> {
    try {
      const allDepartments = await this.getAllDepartments()

      const byType: Record<string, number> = {}
      let totalRequiredStaff = 0

      allDepartments.forEach((department) => {
        const type = 'regular' // All departments are now regular type
        byType[type] = (byType[type] || 0) + 1
        totalRequiredStaff += department.min_porters_required
      })

      return {
        total: allDepartments.length,
        byType,
        totalRequiredStaff,
      }
    } catch (error) {
      console.error('❌ Error fetching department statistics from API:', error)
      return {
        total: 0,
        byType: {},
        totalRequiredStaff: 0,
      }
    }
  }

  // Get departments that need more staff
  static async getDepartmentsNeedingStaff(): Promise<Department[]> {
    try {
      const allDepartments = await this.getAllDepartments()
      // This would need assignment data to determine actual staffing levels
      // For now, return all departments as potentially needing staff
      return allDepartments.filter((dept) => dept.min_porters_required > 0)
    } catch (error) {
      console.error('❌ Error fetching departments needing staff from API:', error)
      return []
    }
  }

  // Porter assignment methods
  static async assignPorterToDepartment(porterId: number, departmentId: number): Promise<boolean> {
    try {
      console.log(`🔗 Assigning porter ${porterId} to department ${departmentId} via API...`)
      await ApiClient.assignPorterToDepartment(porterId, departmentId)
      console.log(
        `✅ Successfully assigned porter ${porterId} to department ${departmentId} via API`,
      )
      return true
    } catch (error) {
      console.error(
        `❌ Error assigning porter ${porterId} to department ${departmentId} via API:`,
        error,
      )
      return false
    }
  }

  static async getPorterAssignments(porterId: number): Promise<any[]> {
    try {
      console.log(`🔍 Fetching assignments for porter ${porterId} via API...`)
      const assignments = await ApiClient.getPorterAssignments(porterId)
      console.log(
        `✅ Successfully fetched ${assignments.length} assignments for porter ${porterId} via API`,
      )
      return assignments
    } catch (error) {
      console.error(`❌ Error fetching assignments for porter ${porterId} via API:`, error)
      return []
    }
  }

  static async removePorterAssignment(porterId: number, departmentId: number): Promise<boolean> {
    try {
      console.log(
        `🔗 Removing porter ${porterId} assignment from department ${departmentId} via API...`,
      )
      await ApiClient.removePorterAssignment(porterId, departmentId)
      console.log(
        `✅ Successfully removed porter ${porterId} assignment from department ${departmentId} via API`,
      )
      return true
    } catch (error) {
      console.error(
        `❌ Error removing porter ${porterId} assignment from department ${departmentId} via API:`,
        error,
      )
      return false
    }
  }
}
