import type {
  Porter,
  PorterFormData,
  PorterWithAssignments,
  PorterDepartmentAssignment,
  Absence,
  PorterType,
} from '../types'
import { MySQLDatabaseService } from './mysqlDatabase'

export class PorterServiceMySQL {
  // Get all porters
  static async getAllPorters(): Promise<Porter[]> {
    try {
      return await MySQLDatabaseService.getPorters()
    } catch (error) {
      console.error('Failed to get porters:', error)
      return []
    }
  }

  // Get porter by ID
  static async getPorterById(id: number): Promise<Porter | null> {
    try {
      const porters = await MySQLDatabaseService.getPorters()
      return porters.find((p) => p.id === id) || null
    } catch (error) {
      console.error('Failed to get porter by ID:', error)
      return null
    }
  }

  // Get porters by type
  static async getPortersByType(type: PorterType): Promise<Porter[]> {
    try {
      const porters = await MySQLDatabaseService.getPorters()
      return porters.filter((p) => p.type === type).sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Failed to get porters by type:', error)
      return []
    }
  }

  // Create new porter
  static async createPorter(data: PorterFormData): Promise<Porter> {
    try {
      const newPorter: Omit<Porter, 'id' | 'created_at' | 'updated_at'> = {
        name: data.name,
        type: data.type,
        contracted_hours: data.contracted_hours,
        break_duration_minutes: data.break_duration_minutes,
        shift_group: data.shift_group,
        is_active: true,
      }

      const createdPorter = await MySQLDatabaseService.createPorter(newPorter)

      // Handle department assignments if provided
      if (data.department_assignments && data.department_assignments.length > 0) {
        for (const assignment of data.department_assignments) {
          await MySQLDatabaseService.createAssignment({
            porter_id: createdPorter.id,
            department_id: assignment.department_id,
            is_permanent: assignment.is_permanent,
            start_date: assignment.start_date,
            end_date: assignment.end_date,
          })
        }
      }

      return createdPorter
    } catch (error) {
      console.error('Failed to create porter:', error)
      throw error
    }
  }

  // Update porter
  static async updatePorter(id: number, data: Partial<PorterFormData>): Promise<boolean> {
    try {
      const updates: Partial<Porter> = {}

      if (data.name !== undefined) updates.name = data.name
      if (data.type !== undefined) updates.type = data.type
      if (data.contracted_hours !== undefined) updates.contracted_hours = data.contracted_hours
      if (data.break_duration_minutes !== undefined)
        updates.break_duration_minutes = data.break_duration_minutes
      if (data.shift_group !== undefined) updates.shift_group = data.shift_group

      await MySQLDatabaseService.updatePorter(id, updates)
      return true
    } catch (error) {
      console.error('Failed to update porter:', error)
      return false
    }
  }

  // Delete porter (soft delete)
  static async deletePorter(id: number): Promise<boolean> {
    try {
      await MySQLDatabaseService.deletePorter(id)
      return true
    } catch (error) {
      console.error('Failed to delete porter:', error)
      return false
    }
  }

  // Get porters available for a specific date (not absent)
  static async getAvailablePorters(date: string, type?: PorterType): Promise<Porter[]> {
    try {
      const porters = await MySQLDatabaseService.getPorters()
      // Note: This would need absence checking logic once absences are implemented in MySQL

      return porters
        .filter((porter) => {
          if (!porter.is_active) return false
          if (type && porter.type !== type) return false
          // TODO: Add absence checking when absences table is implemented
          return true
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Failed to get available porters:', error)
      return []
    }
  }

  // Get porter with assignments
  static async getPorterWithAssignments(id: number): Promise<PorterWithAssignments | null> {
    try {
      const porter = await this.getPorterById(id)
      if (!porter) return null

      const assignments = await MySQLDatabaseService.getAssignments()
      const porterAssignments = assignments.filter((a) => a.porter_id === id)

      return {
        ...porter,
        assignments: porterAssignments,
        absences: [], // TODO: Implement when absences are added to MySQL
      }
    } catch (error) {
      console.error('Failed to get porter with assignments:', error)
      return null
    }
  }

  // Get porters by shift group
  static async getPortersByShiftGroup(shiftGroup: string): Promise<Porter[]> {
    try {
      const porters = await MySQLDatabaseService.getPorters()
      return porters
        .filter((p) => p.shift_group === shiftGroup)
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Failed to get porters by shift group:', error)
      return []
    }
  }

  // Initialize with seed data (for compatibility)
  static async initializeWithSeedData(): Promise<void> {
    try {
      const existingPorters = await this.getAllPorters()
      if (existingPorters.length > 0) {
        console.log('Porters already exist, skipping seed data')
        return
      }

      console.log('No existing porters found, but MySQL should already have seed data')
      // The MySQL database should already be seeded via the SQL script
    } catch (error) {
      console.error('Failed to initialize porter seed data:', error)
    }
  }

  // Get porter statistics
  static async getPorterStats(): Promise<{
    total: number
    active: number
    byType: Record<PorterType, number>
    byShiftGroup: Record<string, number>
  }> {
    try {
      const porters = await MySQLDatabaseService.getPorters()

      const stats = {
        total: porters.length,
        active: porters.filter((p) => p.is_active).length,
        byType: {} as Record<PorterType, number>,
        byShiftGroup: {} as Record<string, number>,
      }

      // Count by type
      porters.forEach((porter) => {
        stats.byType[porter.type] = (stats.byType[porter.type] || 0) + 1
        if (porter.shift_group) {
          stats.byShiftGroup[porter.shift_group] = (stats.byShiftGroup[porter.shift_group] || 0) + 1
        }
      })

      return stats
    } catch (error) {
      console.error('Failed to get porter statistics:', error)
      return {
        total: 0,
        active: 0,
        byType: {} as Record<PorterType, number>,
        byShiftGroup: {} as Record<string, number>,
      }
    }
  }
}
