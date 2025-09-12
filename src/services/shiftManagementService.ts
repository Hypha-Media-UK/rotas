import type { ShiftType, ShiftTypeFormData, Porter } from '@/types'
import { ApiClient } from './apiClient'

export class ShiftManagementService {
  // Get all shift types
  static async getAllShiftTypes(): Promise<ShiftType[]> {
    try {
      console.log('🔍 Fetching all shift types from API...')
      const shiftTypes = await ApiClient.getShiftTypes()
      console.log(`✅ Successfully fetched ${shiftTypes.length} shift types from API`)
      return shiftTypes
    } catch (error) {
      console.error('❌ Error fetching shift types from API:', error)
      return []
    }
  }

  // Get active shift types only
  static async getActiveShiftTypes(): Promise<ShiftType[]> {
    try {
      const allShiftTypes = await this.getAllShiftTypes()
      return allShiftTypes.filter((shift) => shift.is_active)
    } catch (error) {
      console.error('❌ Error fetching active shift types from API:', error)
      return []
    }
  }

  // Get shift type by ID
  static async getShiftTypeById(id: string): Promise<ShiftType | null> {
    try {
      console.log(`🔍 Fetching shift type ${id} from API...`)
      const shiftType = await ApiClient.getShiftTypeById(id)
      if (shiftType) {
        console.log(`✅ Successfully fetched shift type ${shiftType.name} from API`)
      } else {
        console.log(`ℹ️ Shift type ${id} not found in API`)
      }
      return shiftType
    } catch (error) {
      console.error(`❌ Error fetching shift type ${id} from API:`, error)
      return null
    }
  }

  // Create new shift type
  static async createShiftType(data: ShiftTypeFormData): Promise<ShiftType> {
    try {
      console.log(`🆕 Creating new shift type ${data.name} via API...`)

      const newShiftType = {
        name: data.name,
        description: data.description || '',
        start_time: data.start_time,
        end_time: data.end_time,
        rotation_type: data.rotation_type,
        rotation_days: data.rotation_days,
        offset_days: data.offset_days || 0,
        is_active: data.is_active !== false,
      }

      const createdShiftType = await ApiClient.createShiftType(newShiftType)
      console.log(
        `✅ Successfully created shift type ${createdShiftType.name} (ID: ${createdShiftType.id}) via API`,
      )

      return createdShiftType
    } catch (error) {
      console.error(`❌ Error creating shift type ${data.name} via API:`, error)
      throw error
    }
  }

  // Update shift type
  static async updateShiftType(id: string, data: Partial<ShiftTypeFormData>): Promise<void> {
    try {
      console.log(`📝 Updating shift type ${id} via API...`)

      const updates: Partial<ShiftType> = {}

      if (data.name !== undefined) updates.name = data.name
      if (data.description !== undefined) updates.description = data.description
      if (data.start_time !== undefined) updates.start_time = data.start_time
      if (data.end_time !== undefined) updates.end_time = data.end_time
      if (data.rotation_type !== undefined) updates.rotation_type = data.rotation_type
      if (data.rotation_days !== undefined) updates.rotation_days = data.rotation_days
      if (data.offset_days !== undefined) updates.offset_days = data.offset_days
      if (data.is_active !== undefined) updates.is_active = data.is_active

      await ApiClient.updateShiftType(id, updates)
      console.log(`✅ Successfully updated shift type ${id} via API`)
    } catch (error) {
      console.error(`❌ Error updating shift type ${id} via API:`, error)
      throw error
    }
  }

  // Delete shift type (soft delete)
  static async deleteShiftType(id: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting shift type ${id} via API...`)
      await ApiClient.deleteShiftType(id)
      console.log(`✅ Successfully deleted shift type ${id} via API`)
    } catch (error) {
      console.error(`❌ Error deleting shift type ${id} via API:`, error)
      throw error
    }
  }

  // Assign porter to shift type
  static async assignPorterToShiftType(porterId: number, shiftTypeId: string): Promise<void> {
    try {
      console.log(`👤 Assigning porter ${porterId} to shift type ${shiftTypeId} via API...`)

      // Get the shift type to use its name as the shift_group
      const shiftType = await this.getShiftTypeById(shiftTypeId)
      if (!shiftType) {
        throw new Error(`Shift type ${shiftTypeId} not found`)
      }

      // Update the porter's shift_group field to match the shift type name
      await ApiClient.updatePorter(porterId, {
        shift_group: shiftType.name,
      })

      console.log(
        `✅ Successfully assigned porter ${porterId} to shift type ${shiftType.name} via API`,
      )
    } catch (error) {
      console.error(
        `❌ Error assigning porter ${porterId} to shift type ${shiftTypeId} via API:`,
        error,
      )
      throw error
    }
  }

  // Remove porter from shift type
  static async removePorterFromShiftType(porterId: number): Promise<void> {
    try {
      console.log(`👤 Removing porter ${porterId} from shift assignment via API...`)

      await ApiClient.updatePorter(porterId, {
        shift_group: null,
      })

      console.log(`✅ Successfully removed porter ${porterId} from shift assignment via API`)
    } catch (error) {
      console.error(`❌ Error removing porter ${porterId} from shift assignment via API:`, error)
      throw error
    }
  }

  // Get porters assigned to a specific shift type
  static async getPortersForShiftType(shiftTypeId: string): Promise<Porter[]> {
    try {
      console.log(`👥 Fetching porters for shift type ${shiftTypeId} from API...`)

      // This would need to be implemented in the API client
      const porters = await ApiClient.getPortersByShiftType(shiftTypeId)

      console.log(
        `✅ Successfully fetched ${porters.length} porters for shift type ${shiftTypeId} from API`,
      )
      return porters
    } catch (error) {
      console.error(`❌ Error fetching porters for shift type ${shiftTypeId} from API:`, error)
      return []
    }
  }

  // Get shift type statistics
  static async getShiftTypeStats(): Promise<{
    total: number
    active: number
    inactive: number
    totalAssignedPorters: number
    byRotationType: Record<string, number>
  }> {
    try {
      const allShiftTypes = await this.getAllShiftTypes()

      const stats = {
        total: allShiftTypes.length,
        active: allShiftTypes.filter((shift) => shift.is_active).length,
        inactive: allShiftTypes.filter((shift) => !shift.is_active).length,
        totalAssignedPorters: 0, // Would need to count actual assignments
        byRotationType: {} as Record<string, number>,
      }

      // Count by rotation type
      allShiftTypes.forEach((shift) => {
        const type = shift.rotation_type
        stats.byRotationType[type] = (stats.byRotationType[type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('❌ Error fetching shift type statistics from API:', error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        totalAssignedPorters: 0,
        byRotationType: {},
      }
    }
  }

  // Validate shift type configuration
  static validateShiftTypeData(data: ShiftTypeFormData): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Name validation
    if (!data.name || data.name.trim().length < 3) {
      errors.push('Shift type name must be at least 3 characters')
    }

    // Time validation
    if (!data.start_time || !data.end_time) {
      errors.push('Start time and end time are required')
    } else if (data.start_time === data.end_time) {
      errors.push('Start time and end time must be different')
    }

    // Rotation validation
    if (!data.rotation_type) {
      errors.push('Rotation type is required')
    }

    if (!data.rotation_days || data.rotation_days < 1) {
      errors.push('Rotation days must be at least 1')
    }

    if (data.offset_days < 0 || data.offset_days >= data.rotation_days) {
      errors.push('Offset days must be between 0 and rotation days - 1')
    }

    // Rotation type specific validation
    if (data.rotation_type === 'alternating' && data.rotation_days % 2 !== 0) {
      errors.push('Alternating shifts should have an even number of rotation days')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Generate shift schedule for a date range
  static async generateShiftSchedule(
    shiftTypeId: string,
    startDate: string,
    endDate: string,
  ): Promise<
    Array<{
      date: string
      is_working: boolean
      cycle_day: number
    }>
  > {
    try {
      const shiftType = await this.getShiftTypeById(shiftTypeId)
      if (!shiftType) {
        throw new Error(`Shift type ${shiftTypeId} not found`)
      }

      const schedule: Array<{
        date: string
        is_working: boolean
        cycle_day: number
      }> = []

      const start = new Date(startDate)
      const end = new Date(endDate)
      const current = new Date(start)

      let dayIndex = 0

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        const cycleDay = (dayIndex + shiftType.offset_days) % shiftType.rotation_days

        let isWorking = false

        switch (shiftType.rotation_type) {
          case 'fixed':
            isWorking = true // Fixed schedules work every scheduled day
            break
          case 'alternating':
            isWorking = cycleDay < shiftType.rotation_days / 2
            break
          case 'rotating':
            // Custom logic for rotating shifts
            isWorking = cycleDay % 2 === 0 // Example: work every other day
            break
        }

        schedule.push({
          date: dateStr,
          is_working: isWorking,
          cycle_day: cycleDay + 1,
        })

        current.setDate(current.getDate() + 1)
        dayIndex++
      }

      return schedule
    } catch (error) {
      console.error(`❌ Error generating shift schedule for ${shiftTypeId}:`, error)
      return []
    }
  }
}
