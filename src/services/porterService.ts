import type {
  Porter,
  PorterFormData,
  PorterWithAssignments,
  PorterDepartmentAssignment,
  Absence,
  PorterType,
} from '../types'
import { jsonStorage } from './jsonStorage'

export class PorterService {
  // Get all porters
  static getAllPorters(): Porter[] {
    const porters = jsonStorage.getAllPorters()
    return porters.filter((p) => p.is_active).sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get porter by ID
  static getPorterById(id: number): Porter | null {
    const porters = jsonStorage.getAllPorters()
    return porters.find((p) => p.id === id && p.is_active) || null
  }

  // Get porters by type
  static getPortersByType(type: PorterType): Porter[] {
    const porters = jsonStorage.getAllPorters()
    return porters
      .filter((p) => p.type === type && p.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // Create new porter
  static createPorter(data: PorterFormData): number {
    const porters = jsonStorage.getAllPorters()
    const newPorter: Porter = {
      id: jsonStorage.incrementPorterId(),
      name: data.name,
      type: data.type,
      contracted_hours: data.contracted_hours,
      break_duration_minutes: data.break_duration_minutes,
      shift_group: data.shift_group,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    porters.push(newPorter)
    jsonStorage.savePorters(porters)
    return newPorter.id
  }

  // Update porter
  static updatePorter(id: number, data: Partial<PorterFormData>): boolean {
    const porters = jsonStorage.getAllPorters()
    const porterIndex = porters.findIndex((p) => p.id === id)
    if (porterIndex === -1) return false

    const porter = porters[porterIndex]

    // Update porter fields
    if (data.name !== undefined) porter.name = data.name
    if (data.type !== undefined) porter.type = data.type
    if (data.contracted_hours !== undefined) porter.contracted_hours = data.contracted_hours
    if (data.break_duration_minutes !== undefined)
      porter.break_duration_minutes = data.break_duration_minutes
    if (data.shift_group !== undefined) porter.shift_group = data.shift_group

    porter.updated_at = new Date().toISOString()
    jsonStorage.savePorters(porters)
    return true
  }

  // Delete porter (soft delete)
  static deletePorter(id: number): boolean {
    const porters = jsonStorage.getAllPorters()
    const porter = porters.find((p) => p.id === id)
    if (!porter) return false

    porter.is_active = false
    porter.updated_at = new Date().toISOString()
    jsonStorage.savePorters(porters)
    return true
  }

  // Get porters available for a specific date (not absent)
  static getAvailablePorters(date: string, type?: PorterType): Porter[] {
    const porters = jsonStorage.getAllPorters()
    const absences = jsonStorage.getAllAbsences()

    return porters
      .filter((porter) => {
        if (!porter.is_active) return false
        if (type && porter.type !== type) return false

        // Check if porter is absent on this date
        const isAbsent = absences.some(
          (absence) =>
            absence.porter_id === porter.id &&
            date >= absence.start_date &&
            date <= absence.end_date,
        )

        return !isAbsent
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get porter's absences for a date range
  static getPorterAbsences(porterId: number, startDate: string, endDate: string): Absence[] {
    const absences = jsonStorage.getAllAbsences()
    return absences
      .filter(
        (absence) =>
          absence.porter_id === porterId &&
          ((absence.start_date >= startDate && absence.start_date <= endDate) ||
            (absence.end_date >= startDate && absence.end_date <= endDate) ||
            (absence.start_date <= startDate && absence.end_date >= endDate)),
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
  }

  // Check if porter is assigned to a department
  static isPorterAssignedToDepartment(porterId: number, departmentId: number): boolean {
    const assignments = jsonStorage.getAllAssignments()
    return assignments.some(
      (assignment) =>
        assignment.porter_id === porterId && assignment.department_id === departmentId,
    )
  }

  // Assign porter to department
  static assignPorterToDepartment(porterId: number, departmentId: number): boolean {
    // Check if already assigned
    if (this.isPorterAssignedToDepartment(porterId, departmentId)) {
      return false
    }

    const assignments = jsonStorage.getAllAssignments()
    const newAssignment: PorterDepartmentAssignment = {
      id: jsonStorage.incrementAssignmentId(),
      porter_id: porterId,
      department_id: departmentId,
      is_permanent: true,
      start_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    assignments.push(newAssignment)
    jsonStorage.saveAssignments(assignments)
    return true
  }

  // Remove porter from department
  static removePorterFromDepartment(porterId: number, departmentId: number): boolean {
    const assignments = jsonStorage.getAllAssignments()
    const index = assignments.findIndex(
      (assignment) =>
        assignment.porter_id === porterId && assignment.department_id === departmentId,
    )

    if (index === -1) return false

    assignments.splice(index, 1)
    jsonStorage.saveAssignments(assignments)
    return true
  }

  // Get porters assigned to a department
  static getPortersAssignedToDepartment(departmentId: number): Porter[] {
    const assignments = jsonStorage.getAllAssignments()
    const porters = jsonStorage.getAllPorters()

    const assignedPorterIds = assignments
      .filter((assignment) => assignment.department_id === departmentId)
      .map((assignment) => assignment.porter_id)

    return porters.filter((porter) => assignedPorterIds.includes(porter.id) && porter.is_active)
  }

  // Initialize with seed data
  static initializeWithSeedData(): void {
    if (jsonStorage.hasPorters()) {
      const porters = jsonStorage.getAllPorters()
      console.log(`Porters already initialized: ${porters.length} porters found`)
      return // Already initialized
    }

    console.log('Initializing porters with seed data...')

    // Define shift configurations
    const shiftConfigs = [
      {
        names: [
          'Stephen Cooper',
          'Darren Milhench',
          'Darren Mycroft',
          'Kevin Gaskell',
          'Merv Permalloo',
          'Regan Stringer',
          'Matthew Cope',
          'AJ',
          'Michael Shaw',
          'Steven Richardson',
          'Chris Roach',
          'Simon Collins',
          'James Bennett',
        ],
        config: {
          type: 'Regular' as const,
          contracted_hours: '0800-2000',
          break_duration_minutes: 60,
          shift_group: 'Day Shift One',
        },
      },
      {
        names: [
          'Rob Mcpartland',
          'John Evans',
          'Charlotte Rimmer',
          'Carla Barton',
          'Andrew Trudgeon',
          'Stepen Bowater',
          'Matthew Bennett',
          'Stephen Scarsbrook',
          'Jordon Fish',
          'Stephen Haughton',
          'Stephen Maher',
          'Marcus Huntington',
          'Mark Walton',
          'Allen Butler',
          'Craig Butler',
        ],
        config: {
          type: 'Regular' as const,
          contracted_hours: '0800-2000',
          break_duration_minutes: 60,
          shift_group: 'Day Shift Two',
        },
      },
      {
        names: [
          'Martin Hobson',
          'Martin Kenyon',
          'Scott Cartledge',
          'Tony Batters',
          'Lewis Yearsley',
          'Tomas Konkol',
          'David Sykes',
        ],
        config: {
          type: 'Regular' as const,
          contracted_hours: '2000-0800',
          break_duration_minutes: 60,
          shift_group: 'Night Shift One',
        },
      },
      {
        names: [
          'Darren Flowers',
          'Brian Cassidy',
          'Karen Blackett',
          'James Mitchell',
          'Alan Kelly',
          'Tomas Konkol',
          'David Sykes',
        ],
        config: {
          type: 'Regular' as const,
          contracted_hours: '2000-0800',
          break_duration_minutes: 60,
          shift_group: 'Night Shift Two',
        },
      },
      {
        names: [
          'Mark Lloyd',
          'Stepen Burke',
          'Julie Greenough',
          'Edward Collier',
          'Phil Hollinshead',
          'Kevin Tomlinson',
          'Soloman Offei',
          'Stuart Ford',
          'Lee Stafford',
          'Dean Pickering',
          'Nicola Benger',
          'Jeff Robinson',
          'Colin Bromley',
          'Gary Booth',
          'Lynne Warner',
          'Roy Harris',
          'Ian Moss',
          'Alan Clark',
          'Paul Fisher',
          'Kyle Sanderson',
          'Peter Moss',
          'Chris Wardle',
          'Eloisa Andrew',
          'Gary Bromley',
          'Mike Brennan',
          'Lucy Redfearn',
          'Mark Dickinson',
          'Ian Speakes',
          'Paul Berry',
          'Robert Frost',
          'Andrew Gibson',
          'Nigel Beesley',
          'Andy Clayton',
          'Matthew Rushton',
          'Paul Flowers',
          'Graham Brown',
          'Chris Huckaby',
          'Jason Newton',
          'Stuart Lomas',
        ],
        config: {
          type: 'Relief' as const,
          contracted_hours: '0800-1700',
          break_duration_minutes: 30,
          shift_group: undefined,
        },
      },
    ]

    // Create porters using DRY approach
    shiftConfigs.forEach(({ names, config }) => {
      names.forEach((name) => {
        this.createPorter({
          name,
          ...config,
          department_assignments: [],
        })
      })
    })

    const porters = jsonStorage.getAllPorters()
    console.log(`Initialized ${porters.length} porters`)
  }
}
