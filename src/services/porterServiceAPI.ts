import type { Porter, PorterFormData } from '@/types'
import { ApiClient } from './apiClient'
import { apiCache, cacheKeys, invalidateCache } from '../utils/cache'

export class PorterServiceAPI {
  // Get all porters
  static async getAllPorters(): Promise<Porter[]> {
    const cacheKey = cacheKeys.allPorters()

    // Try to get from cache first
    const cached = apiCache.get<Porter[]>(cacheKey)
    if (cached) {
      console.log(`🚀 Retrieved ${cached.length} porters from cache`)
      return cached
    }

    try {
      console.log('🔍 Fetching all porters from API...')
      const porters = await ApiClient.getPorters()
      console.log(`✅ Successfully fetched ${porters.length} porters from API`)

      // Cache the result for 5 minutes
      apiCache.set(cacheKey, porters, 5 * 60 * 1000)

      return porters
    } catch (error) {
      console.error('❌ Error fetching porters from API:', error)
      return []
    }
  }

  // Get porter by ID
  static async getPorterById(id: number): Promise<Porter | null> {
    const cacheKey = cacheKeys.porterById(id)

    // Try to get from cache first
    const cached = apiCache.get<Porter>(cacheKey)
    if (cached) {
      console.log(`🚀 Retrieved porter ${cached.name} from cache`)
      return cached
    }

    try {
      console.log(`🔍 Fetching porter ${id} from API...`)
      const porter = await ApiClient.getPorterById(id)
      if (porter) {
        console.log(`✅ Successfully fetched porter ${porter.name} from API`)
        // Cache the result for 5 minutes
        apiCache.set(cacheKey, porter, 5 * 60 * 1000)
      } else {
        console.log(`ℹ️ Porter ${id} not found in API`)
      }
      return porter
    } catch (error) {
      console.error(`❌ Error fetching porter ${id} from API:`, error)
      return null
    }
  }

  // Create new porter
  static async createPorter(data: PorterFormData): Promise<Porter> {
    try {
      console.log(`🆕 Creating new porter ${data.name} via API...`)

      const newPorter: Omit<Porter, 'id' | 'created_at' | 'updated_at'> = {
        name: data.name,
        type: data.type,
        contracted_hours: data.contracted_hours,
        break_duration_minutes: data.break_duration_minutes || 30,
        shift_group: data.shift_group,
        is_active: data.is_active ?? true,
        employee_id: data.employee_id,
        email: data.email,
        phone: data.phone,
        qualifications: data.qualifications || [],
      }

      const createdPorter = await ApiClient.createPorter(newPorter)
      console.log(
        `✅ Successfully created porter ${createdPorter.name} (ID: ${createdPorter.id}) via API`,
      )

      // Invalidate porter cache since we added a new porter
      invalidateCache.porters()

      return createdPorter
    } catch (error) {
      console.error(`❌ Error creating porter ${data.name} via API:`, error)
      throw error
    }
  }

  // Update porter
  static async updatePorter(id: number, data: Partial<PorterFormData>): Promise<void> {
    try {
      console.log(`📝 Updating porter ${id} via API...`)

      const updates: Partial<Porter> = {}

      if (data.name !== undefined) updates.name = data.name
      if (data.type !== undefined) updates.type = data.type
      if (data.contracted_hours !== undefined) updates.contracted_hours = data.contracted_hours
      if (data.break_duration_minutes !== undefined)
        updates.break_duration_minutes = data.break_duration_minutes
      if (data.shift_group !== undefined) updates.shift_group = data.shift_group
      if (data.is_active !== undefined) updates.is_active = data.is_active
      if (data.employee_id !== undefined) updates.employee_id = data.employee_id
      if (data.email !== undefined) updates.email = data.email
      if (data.phone !== undefined) updates.phone = data.phone
      if (data.qualifications !== undefined) updates.qualifications = data.qualifications

      await ApiClient.updatePorter(id, updates)
      console.log(`✅ Successfully updated porter ${id} via API`)

      // Invalidate cache for this specific porter and the list
      invalidateCache.porter(id)
    } catch (error) {
      console.error(`❌ Error updating porter ${id} via API:`, error)
      throw error
    }
  }

  // Delete porter (soft delete)
  static async deletePorter(id: number): Promise<void> {
    try {
      console.log(`🗑️ Deleting porter ${id} via API...`)
      await ApiClient.deletePorter(id)
      console.log(`✅ Successfully deleted porter ${id} via API`)
    } catch (error) {
      console.error(`❌ Error deleting porter ${id} via API:`, error)
      throw error
    }
  }

  // Get porters by type
  static async getPortersByType(type: string): Promise<Porter[]> {
    try {
      const allPorters = await this.getAllPorters()
      return allPorters.filter((porter) => porter.type === type)
    } catch (error) {
      console.error(`❌ Error fetching porters by type ${type} from API:`, error)
      return []
    }
  }

  // Get active porters
  static async getActivePorters(): Promise<Porter[]> {
    try {
      const allPorters = await this.getAllPorters()
      return allPorters.filter((porter) => porter.is_active)
    } catch (error) {
      console.error('❌ Error fetching active porters from API:', error)
      return []
    }
  }

  // Search porters by name
  static async searchPorters(query: string): Promise<Porter[]> {
    try {
      const allPorters = await this.getAllPorters()
      const lowercaseQuery = query.toLowerCase()
      return allPorters.filter(
        (porter) =>
          porter.name.toLowerCase().includes(lowercaseQuery) ||
          porter.employee_id?.toLowerCase().includes(lowercaseQuery) ||
          porter.email?.toLowerCase().includes(lowercaseQuery),
      )
    } catch (error) {
      console.error(`❌ Error searching porters with query "${query}" from API:`, error)
      return []
    }
  }

  // Get porter statistics
  static async getPorterStats(): Promise<{
    total: number
    active: number
    inactive: number
    byType: Record<string, number>
  }> {
    try {
      const allPorters = await this.getAllPorters()
      const active = allPorters.filter((p) => p.is_active)
      const inactive = allPorters.filter((p) => !p.is_active)

      const byType: Record<string, number> = {}
      allPorters.forEach((porter) => {
        byType[porter.type] = (byType[porter.type] || 0) + 1
      })

      return {
        total: allPorters.length,
        active: active.length,
        inactive: inactive.length,
        byType,
      }
    } catch (error) {
      console.error('❌ Error fetching porter statistics from API:', error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byType: {},
      }
    }
  }
}
