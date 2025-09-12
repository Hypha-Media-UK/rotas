import { jsonStorage } from '@/services/jsonStorage'
import { PorterServiceMySQL } from '@/services/porterServiceMySQL'
import { DepartmentServiceMySQL } from '@/services/departmentServiceMySQL'
import { MySQLDatabaseService } from '@/services/mysqlDatabase'
import type { Porter, Department, PorterDepartmentAssignment } from '@/types'

export class DataMigrationService {
  /**
   * Migrate all data from localStorage to MySQL
   */
  static async migrateAllData(): Promise<{
    success: boolean
    message: string
    details: {
      porters: { migrated: number; skipped: number; errors: number }
      departments: { migrated: number; skipped: number; errors: number }
      assignments: { migrated: number; skipped: number; errors: number }
    }
  }> {
    console.log('🚀 Starting data migration from localStorage to MySQL...')
    
    const results = {
      success: true,
      message: '',
      details: {
        porters: { migrated: 0, skipped: 0, errors: 0 },
        departments: { migrated: 0, skipped: 0, errors: 0 },
        assignments: { migrated: 0, skipped: 0, errors: 0 }
      }
    }

    try {
      // Check if localStorage has data
      if (!jsonStorage.hasData()) {
        return {
          success: true,
          message: 'No data found in localStorage to migrate',
          details: results.details
        }
      }

      // Connect to MySQL
      await MySQLDatabaseService.connect()

      // Migrate departments first (porters may reference them)
      console.log('📁 Migrating departments...')
      const departmentResult = await this.migrateDepartments()
      results.details.departments = departmentResult

      // Migrate porters
      console.log('👥 Migrating porters...')
      const porterResult = await this.migratePorters()
      results.details.porters = porterResult

      // Migrate assignments
      console.log('📋 Migrating assignments...')
      const assignmentResult = await this.migrateAssignments()
      results.details.assignments = assignmentResult

      const totalMigrated = 
        results.details.porters.migrated + 
        results.details.departments.migrated + 
        results.details.assignments.migrated

      const totalErrors = 
        results.details.porters.errors + 
        results.details.departments.errors + 
        results.details.assignments.errors

      if (totalErrors > 0) {
        results.success = false
        results.message = `Migration completed with ${totalErrors} errors. ${totalMigrated} items migrated successfully.`
      } else {
        results.message = `Migration completed successfully! ${totalMigrated} items migrated.`
      }

      console.log('✅ Data migration completed')
      return results

    } catch (error) {
      console.error('❌ Migration failed:', error)
      results.success = false
      results.message = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      return results
    }
  }

  /**
   * Migrate departments from localStorage to MySQL
   */
  private static async migrateDepartments(): Promise<{ migrated: number; skipped: number; errors: number }> {
    const result = { migrated: 0, skipped: 0, errors: 0 }
    
    try {
      const localDepartments = jsonStorage.getAllDepartments()
      const existingDepartments = await DepartmentServiceMySQL.getAllDepartments()
      
      for (const localDept of localDepartments) {
        try {
          // Check if department already exists (by name)
          const exists = existingDepartments.find(d => d.name === localDept.name)
          if (exists) {
            console.log(`  ⏭️  Department "${localDept.name}" already exists, skipping`)
            result.skipped++
            continue
          }

          // Create department in MySQL
          await DepartmentServiceMySQL.createDepartment({
            name: localDept.name,
            min_porters_required: localDept.min_porters_required,
            department_type: localDept.department_type,
            operating_schedule: localDept.operating_schedule
          })

          console.log(`  ✅ Migrated department: ${localDept.name}`)
          result.migrated++

        } catch (error) {
          console.error(`  ❌ Failed to migrate department "${localDept.name}":`, error)
          result.errors++
        }
      }

    } catch (error) {
      console.error('Failed to migrate departments:', error)
      result.errors++
    }

    return result
  }

  /**
   * Migrate porters from localStorage to MySQL
   */
  private static async migratePorters(): Promise<{ migrated: number; skipped: number; errors: number }> {
    const result = { migrated: 0, skipped: 0, errors: 0 }
    
    try {
      const localPorters = jsonStorage.getAllPorters()
      const existingPorters = await PorterServiceMySQL.getAllPorters()
      
      for (const localPorter of localPorters) {
        try {
          // Check if porter already exists (by name)
          const exists = existingPorters.find(p => p.name === localPorter.name)
          if (exists) {
            console.log(`  ⏭️  Porter "${localPorter.name}" already exists, skipping`)
            result.skipped++
            continue
          }

          // Create porter in MySQL
          await PorterServiceMySQL.createPorter({
            name: localPorter.name,
            type: localPorter.type,
            contracted_hours: localPorter.contracted_hours,
            break_duration_minutes: localPorter.break_duration_minutes,
            shift_group: localPorter.shift_group,
            department_assignments: [] // Will be handled separately
          })

          console.log(`  ✅ Migrated porter: ${localPorter.name}`)
          result.migrated++

        } catch (error) {
          console.error(`  ❌ Failed to migrate porter "${localPorter.name}":`, error)
          result.errors++
        }
      }

    } catch (error) {
      console.error('Failed to migrate porters:', error)
      result.errors++
    }

    return result
  }

  /**
   * Migrate assignments from localStorage to MySQL
   */
  private static async migrateAssignments(): Promise<{ migrated: number; skipped: number; errors: number }> {
    const result = { migrated: 0, skipped: 0, errors: 0 }
    
    try {
      const localAssignments = jsonStorage.getAllAssignments()
      const existingAssignments = await MySQLDatabaseService.getAssignments()
      
      // Get porter and department mappings
      const porters = await PorterServiceMySQL.getAllPorters()
      const departments = await DepartmentServiceMySQL.getAllDepartments()
      
      for (const localAssignment of localAssignments) {
        try {
          // Find corresponding porter and department in MySQL
          const porter = porters.find(p => p.name === this.findPorterNameById(localAssignment.porter_id))
          const department = departments.find(d => d.name === this.findDepartmentNameById(localAssignment.department_id))
          
          if (!porter || !department) {
            console.log(`  ⏭️  Assignment skipped - porter or department not found`)
            result.skipped++
            continue
          }

          // Check if assignment already exists
          const exists = existingAssignments.find(a => 
            a.porter_id === porter.id && a.department_id === department.id
          )
          if (exists) {
            console.log(`  ⏭️  Assignment already exists, skipping`)
            result.skipped++
            continue
          }

          // Create assignment in MySQL
          await MySQLDatabaseService.createAssignment({
            porter_id: porter.id,
            department_id: department.id,
            is_permanent: localAssignment.is_permanent,
            start_date: localAssignment.start_date,
            end_date: localAssignment.end_date
          })

          console.log(`  ✅ Migrated assignment: ${porter.name} -> ${department.name}`)
          result.migrated++

        } catch (error) {
          console.error(`  ❌ Failed to migrate assignment:`, error)
          result.errors++
        }
      }

    } catch (error) {
      console.error('Failed to migrate assignments:', error)
      result.errors++
    }

    return result
  }

  /**
   * Helper to find porter name by ID from localStorage
   */
  private static findPorterNameById(id: number): string | undefined {
    const porters = jsonStorage.getAllPorters()
    return porters.find(p => p.id === id)?.name
  }

  /**
   * Helper to find department name by ID from localStorage
   */
  private static findDepartmentNameById(id: number): string | undefined {
    const departments = jsonStorage.getAllDepartments()
    return departments.find(d => d.id === id)?.name
  }

  /**
   * Create a backup of localStorage data before migration
   */
  static createBackup(): string {
    const data = {
      porters: jsonStorage.getAllPorters(),
      departments: jsonStorage.getAllDepartments(),
      assignments: jsonStorage.getAllAssignments(),
      absences: jsonStorage.getAllAbsences(),
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    
    return JSON.stringify(data, null, 2)
  }

  /**
   * Download backup as a file
   */
  static downloadBackup(): void {
    const backup = this.createBackup()
    const blob = new Blob([backup], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `rota-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  /**
   * Check if migration is needed
   */
  static async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if localStorage has data
      if (!jsonStorage.hasData()) {
        return false
      }

      // Check if MySQL has data
      await MySQLDatabaseService.connect()
      const porters = await PorterServiceMySQL.getAllPorters()
      const departments = await DepartmentServiceMySQL.getAllDepartments()
      
      // If MySQL is empty but localStorage has data, migration is needed
      return porters.length === 0 && departments.length === 0
    } catch (error) {
      console.error('Error checking migration status:', error)
      return false
    }
  }
}
