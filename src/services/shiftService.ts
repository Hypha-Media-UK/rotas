import { format, differenceInDays, parseISO, addDays } from 'date-fns'
import type {
  ShiftPattern,
  ShiftCalculation,
  ShiftType,
  Porter,
  DailyAssignment,
  DailyAssignmentWithDetails,
  Department,
} from '../types'
import { jsonStorage } from './jsonStorage'

// In-memory storage for demo purposes
let shiftPatterns: ShiftPattern[] = []
let dailyAssignments: DailyAssignment[] = []
let nextId = 1

export class ShiftService {
  // Reference date: Tuesday 27th May 2025 - Day Shift A starts their 4 days
  private static readonly REFERENCE_DATE = '2025-05-27'

  // Initialize shift patterns
  static initializeShiftPatterns(): void {
    if (shiftPatterns.length > 0) {
      console.log(`✅ Shift patterns already initialized: ${shiftPatterns.length} patterns`)
      return // Already initialized
    }

    console.log('🔧 Initializing shift patterns...')

    const patterns = [
      {
        shift_group: 'Day Shift A',
        is_working_on_reference: true,
        shift_type: 'day' as ShiftType,
      },
      {
        shift_group: 'Day Shift B',
        is_working_on_reference: false,
        shift_type: 'day' as ShiftType,
      },
      {
        shift_group: 'Night Shift A',
        is_working_on_reference: true,
        shift_type: 'night' as ShiftType,
      },
      {
        shift_group: 'Night Shift B',
        is_working_on_reference: false,
        shift_type: 'night' as ShiftType,
      },
    ]

    patterns.forEach((pattern) => {
      const newPattern: ShiftPattern = {
        id: nextId++,
        shift_group: pattern.shift_group,
        reference_date: this.REFERENCE_DATE,
        is_working_on_reference: pattern.is_working_on_reference,
        shift_type: pattern.shift_type,
        created_at: new Date().toISOString(),
      }
      shiftPatterns.push(newPattern)
      console.log(`  + ${pattern.shift_group} (${pattern.shift_type})`)
    })

    console.log(`✅ Shift patterns initialized: ${shiftPatterns.length} patterns`)
  }

  // Calculate if a shift group is working on a specific date
  static calculateShiftStatus(shiftGroup: string, date: string): ShiftCalculation {
    console.log(`🔄 Calculating shift status for ${shiftGroup} on ${date}`)
    console.log(`📊 Available patterns: ${shiftPatterns.map((p) => p.shift_group).join(', ')}`)

    const pattern = shiftPatterns.find((p) => p.shift_group === shiftGroup)

    if (!pattern) {
      console.error(`❌ Shift pattern not found for group: ${shiftGroup}`)
      throw new Error(`Shift pattern not found for group: ${shiftGroup}`)
    }

    const referenceDate = parseISO(this.REFERENCE_DATE)
    const targetDate = parseISO(date)
    const daysDifference = differenceInDays(targetDate, referenceDate)

    // 8-day cycle: 4 days on, 4 days off
    const cyclePosition = ((daysDifference % 8) + 8) % 8 // Handle negative numbers

    let isWorking: boolean
    if (pattern.is_working_on_reference) {
      // If working on reference date, work days 0-3, off days 4-7
      isWorking = cyclePosition < 4
    } else {
      // If off on reference date, off days 0-3, work days 4-7
      isWorking = cyclePosition >= 4
    }

    return {
      is_working: isWorking,
      shift_type: pattern.shift_type,
      cycle_day: cyclePosition + 1,
    }
  }

  // Calculate which shift group is working for a given date and shift type
  static calculateShiftForDate(
    date: string,
    shiftType: ShiftType,
  ): { working_shift_group: string; off_shift_group: string } {
    const referenceDate = parseISO(this.REFERENCE_DATE)
    const targetDate = parseISO(date)
    const daysDifference = differenceInDays(targetDate, referenceDate)

    // Calculate which 4-day cycle we're in (0-7, where 0-3 is first group, 4-7 is second group)
    const cyclePosition = ((daysDifference % 8) + 8) % 8

    // Determine which shift group is working
    const isFirstGroupWorking = cyclePosition < 4

    let workingShiftGroup: string
    let offShiftGroup: string

    if (shiftType === 'day') {
      workingShiftGroup = isFirstGroupWorking ? 'Day Shift A' : 'Day Shift B'
      offShiftGroup = isFirstGroupWorking ? 'Day Shift B' : 'Day Shift A'
    } else {
      workingShiftGroup = isFirstGroupWorking ? 'Night Shift A' : 'Night Shift B'
      offShiftGroup = isFirstGroupWorking ? 'Night Shift B' : 'Night Shift A'
    }

    return {
      working_shift_group: workingShiftGroup,
      off_shift_group: offShiftGroup,
    }
  }

  // Get all porters working on a specific date
  static getWorkingPorters(date: string, shiftType?: ShiftType): Porter[] {
    let query = `
      SELECT p.* FROM porters p
      WHERE p.is_active = 1 AND p.shift_group IS NOT NULL
    `

    if (shiftType) {
      query += ` AND p.shift_group LIKE '%${shiftType === 'day' ? 'Day' : 'Night'}%'`
    }

    query += ' ORDER BY p.name ASC'

    const stmt = db.prepare(query)
    const allPorters = stmt.all() as Porter[]

    // Filter porters based on their shift pattern
    return allPorters.filter((porter) => {
      if (!porter.shift_group) return false

      try {
        const shiftStatus = this.calculateShiftStatus(porter.shift_group, date)
        return shiftStatus.is_working && (!shiftType || shiftStatus.shift_type === shiftType)
      } catch {
        return false
      }
    })
  }

  // Get porters off duty on a specific date
  static getOffDutyPorters(date: string, shiftType?: ShiftType): Porter[] {
    let query = `
      SELECT p.* FROM porters p
      WHERE p.is_active = 1 AND p.shift_group IS NOT NULL
    `

    if (shiftType) {
      query += ` AND p.shift_group LIKE '%${shiftType === 'day' ? 'Day' : 'Night'}%'`
    }

    query += ' ORDER BY p.name ASC'

    const stmt = db.prepare(query)
    const allPorters = stmt.all() as Porter[]

    // Filter porters based on their shift pattern
    return allPorters.filter((porter) => {
      if (!porter.shift_group) return false

      try {
        const shiftStatus = this.calculateShiftStatus(porter.shift_group, date)
        return !shiftStatus.is_working && (!shiftType || shiftStatus.shift_type === shiftType)
      } catch {
        return false
      }
    })
  }

  // Create or update daily assignment
  static setDailyAssignment(
    date: string,
    departmentId: number,
    porterId?: number,
    coverPorterId?: number,
    shiftType: ShiftType = 'day',
  ): number {
    // Find existing assignment
    const existingIndex = dailyAssignments.findIndex(
      (a) => a.date === date && a.department_id === departmentId && a.shift_type === shiftType,
    )

    if (existingIndex >= 0) {
      // Update existing
      const assignment = dailyAssignments[existingIndex]
      assignment.porter_id = porterId
      assignment.cover_porter_id = coverPorterId
      assignment.updated_at = new Date().toISOString()
      return assignment.id
    } else {
      // Create new
      const newAssignment: DailyAssignment = {
        id: nextId++,
        date,
        department_id: departmentId,
        porter_id: porterId,
        cover_porter_id: coverPorterId,
        shift_type: shiftType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      dailyAssignments.push(newAssignment)
      return newAssignment.id
    }
  }

  // Get daily assignments for a specific date
  static getDailyAssignments(date: string, shiftType?: ShiftType): DailyAssignmentWithDetails[] {
    console.log(`🔍 Getting daily assignments for ${date}, shiftType: ${shiftType || 'any'}`)

    // Ensure shift patterns are initialized
    this.initializeShiftPatterns()

    // Get existing daily assignments for this date
    const existingAssignments = dailyAssignments.filter((a) => a.date === date)
    console.log(`📋 Found ${existingAssignments.length} existing assignments for ${date}`)

    // If no daily assignments exist, create them from permanent porter-department assignments
    if (existingAssignments.length === 0) {
      console.log(`🔧 Creating daily assignments from permanent assignments for ${date}`)
      this.createDailyAssignmentsFromPermanent(date)
      // Get the newly created assignments
      const newAssignments = dailyAssignments
        .filter((a) => a.date === date && (!shiftType || a.shift_type === shiftType))
        .map((assignment) => this.enrichAssignmentWithDetails(assignment))
      console.log(`✅ Created ${newAssignments.length} daily assignments for ${date}`)
      return newAssignments
    }

    // Return existing assignments with full details
    const filteredAssignments = existingAssignments
      .filter((a) => !shiftType || a.shift_type === shiftType)
      .map((assignment) => this.enrichAssignmentWithDetails(assignment))
    console.log(`📤 Returning ${filteredAssignments.length} existing assignments for ${date}`)
    return filteredAssignments
  }

  // Create daily assignments from permanent porter-department assignments
  private static createDailyAssignmentsFromPermanent(date: string): void {
    const assignments = jsonStorage.getAllAssignments()
    const departments = jsonStorage.getAllDepartments()
    const porters = jsonStorage.getAllPorters()

    console.log(`🔧 Creating assignments from ${assignments.length} permanent assignments`)
    console.log(`📊 Available: ${departments.length} departments, ${porters.length} porters`)

    let createdCount = 0

    assignments.forEach((assignment) => {
      const department = departments.find((d) => d.id === assignment.department_id)
      const porter = porters.find((p) => p.id === assignment.porter_id)

      if (!department) {
        console.warn(`❌ Department not found for assignment: ${assignment.department_id}`)
        return
      }
      if (!porter) {
        console.warn(`❌ Porter not found for assignment: ${assignment.porter_id}`)
        return
      }
      if (!porter.is_active) {
        console.log(`⏸️ Porter ${porter.name} is inactive, skipping`)
        return
      }

      // Determine shift type based on porter's shift group and department type
      let shiftType: ShiftType = 'day'
      if (porter.shift_group?.includes('Night')) {
        shiftType = 'night'
      }

      // Check if porter should be working on this date (for shift rotation departments)
      if (department.department_type === 'shift_rotation' && porter.shift_group) {
        try {
          const shiftStatus = this.calculateShiftStatus(porter.shift_group, date)
          if (!shiftStatus.is_working) {
            console.log(
              `⏸️ ${porter.name} (${porter.shift_group}) is off duty on ${date}, skipping`,
            )
            return // Porter is off duty, don't create assignment
          }
          console.log(`✅ ${porter.name} (${porter.shift_group}) is working on ${date}`)
        } catch (error) {
          console.warn(`Could not calculate shift status for ${porter.shift_group}:`, error)
        }
      }

      // Create daily assignment
      const dailyAssignment: DailyAssignment = {
        id: nextId++,
        date,
        department_id: department.id,
        porter_id: porter.id,
        cover_porter_id: undefined,
        shift_type: shiftType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      dailyAssignments.push(dailyAssignment)
      createdCount++
      console.log(`➕ Created assignment: ${porter.name} → ${department.name} (${shiftType})`)
    })

    console.log(`✅ Created ${createdCount} daily assignments for ${date}`)
  }

  // Enrich assignment with department and porter details
  private static enrichAssignmentWithDetails(
    assignment: DailyAssignment,
  ): DailyAssignmentWithDetails {
    const departments = jsonStorage.getAllDepartments()
    const porters = jsonStorage.getAllPorters()

    const department = departments.find((d) => d.id === assignment.department_id)
    const porter = assignment.porter_id
      ? porters.find((p) => p.id === assignment.porter_id)
      : undefined
    const coverPorter = assignment.cover_porter_id
      ? porters.find((p) => p.id === assignment.cover_porter_id)
      : undefined

    if (!department) {
      throw new Error(`Department not found for assignment ${assignment.id}`)
    }

    return {
      ...assignment,
      department,
      porter,
      cover_porter: coverPorter,
    }
  }

  // Remove daily assignment
  static removeDailyAssignment(id: number): boolean {
    const initialLength = dailyAssignments.length
    dailyAssignments = dailyAssignments.filter((a) => a.id !== id)
    return dailyAssignments.length < initialLength
  }

  // Get shift schedule for a date range
  static getShiftSchedule(startDate: string, endDate: string, shiftGroup?: string): any[] {
    const schedule = []
    let currentDate = parseISO(startDate)
    const end = parseISO(endDate)

    while (currentDate <= end) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')

      if (shiftGroup) {
        const shiftStatus = this.calculateShiftStatus(shiftGroup, dateStr)
        schedule.push({
          date: dateStr,
          shift_group: shiftGroup,
          is_working: shiftStatus.is_working,
          shift_type: shiftStatus.shift_type,
          cycle_day: shiftStatus.cycle_day,
        })
      } else {
        // Get status for all shift groups
        const allGroups = ['Day Shift A', 'Day Shift B', 'Night Shift A', 'Night Shift B']
        const daySchedule = {
          date: dateStr,
          shifts: allGroups.map((group) => {
            const shiftStatus = this.calculateShiftStatus(group, dateStr)
            return {
              shift_group: group,
              is_working: shiftStatus.is_working,
              shift_type: shiftStatus.shift_type,
              cycle_day: shiftStatus.cycle_day,
            }
          }),
        }
        schedule.push(daySchedule)
      }

      currentDate = addDays(currentDate, 1)
    }

    return schedule
  }
}
