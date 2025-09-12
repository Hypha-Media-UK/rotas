import { db } from '../database/database'
import { PorterService } from './porterService'
import { DepartmentService } from './departmentService'
import type { PorterFormData, DepartmentFormData } from '../types'

export class SeedService {
  static async seedDatabase(): Promise<void> {
    try {
      console.log('Starting database seeding...')
      
      // Check if data already exists
      const existingPorters = PorterService.getAllPorters()
      const existingDepartments = DepartmentService.getAllDepartments()
      
      if (existingPorters.length > 0 || existingDepartments.length > 0) {
        console.log('Database already contains data, skipping seed')
        return
      }

      // Seed departments first
      await this.seedDepartments()
      
      // Seed porters
      await this.seedPorters()
      
      console.log('Database seeding completed successfully')
    } catch (error) {
      console.error('Error seeding database:', error)
      throw error
    }
  }

  private static async seedDepartments(): Promise<void> {
    const departments: DepartmentFormData[] = [
      {
        name: 'Shift',
        min_porters_required: 2,
        requirements: [
          { day_of_week: 1, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 2, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 3, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 4, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 5, start_time: '08:00', end_time: '20:00', required_porters: 2 },
        ]
      },
      {
        name: 'Relief',
        min_porters_required: 1,
        requirements: [
          { day_of_week: 1, start_time: '08:00', end_time: '20:00', required_porters: 1 },
          { day_of_week: 2, start_time: '08:00', end_time: '20:00', required_porters: 1 },
          { day_of_week: 3, start_time: '08:00', end_time: '20:00', required_porters: 1 },
          { day_of_week: 4, start_time: '08:00', end_time: '20:00', required_porters: 1 },
          { day_of_week: 5, start_time: '08:00', end_time: '20:00', required_porters: 1 },
        ]
      },
      {
        name: 'Patient Transport',
        min_porters_required: 3,
        requirements: [
          { day_of_week: 1, start_time: '08:00', end_time: '20:00', required_porters: 3 },
          { day_of_week: 2, start_time: '08:00', end_time: '20:00', required_porters: 3 },
          { day_of_week: 3, start_time: '08:00', end_time: '20:00', required_porters: 3 },
          { day_of_week: 4, start_time: '08:00', end_time: '20:00', required_porters: 3 },
          { day_of_week: 5, start_time: '08:00', end_time: '20:00', required_porters: 3 },
        ]
      },
      {
        name: 'Accident & Emergency',
        min_porters_required: 2,
        requirements: [
          { day_of_week: 1, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 2, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 3, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 4, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 5, start_time: '08:00', end_time: '20:00', required_porters: 2 },
          { day_of_week: 6, start_time: '08:00', end_time: '20:00', required_porters: 1 },
          { day_of_week: 0, start_time: '08:00', end_time: '20:00', required_porters: 1 },
        ]
      },
      {
        name: 'Radiology',
        min_porters_required: 1,
        requirements: [
          { day_of_week: 1, start_time: '08:00', end_time: '17:00', required_porters: 1 },
          { day_of_week: 2, start_time: '08:00', end_time: '17:00', required_porters: 1 },
          { day_of_week: 3, start_time: '08:00', end_time: '17:00', required_porters: 1 },
          { day_of_week: 4, start_time: '08:00', end_time: '17:00', required_porters: 1 },
          { day_of_week: 5, start_time: '08:00', end_time: '17:00', required_porters: 1 },
        ]
      },
      { name: 'External Waste', min_porters_required: 1, requirements: [] },
      { name: 'Laundry', min_porters_required: 1, requirements: [] },
      { name: 'Pharmacy', min_porters_required: 1, requirements: [] },
      { name: 'Ad-Hoc', min_porters_required: 1, requirements: [] },
      { name: 'Medical Records', min_porters_required: 1, requirements: [] },
      { name: 'Post', min_porters_required: 1, requirements: [] },
      { name: 'Sharps', min_porters_required: 1, requirements: [] },
      { name: 'Blood Drivers', min_porters_required: 1, requirements: [] },
      { name: 'District Drivers', min_porters_required: 1, requirements: [] },
      { name: 'Help Desk', min_porters_required: 1, requirements: [] },
      { name: 'Training', min_porters_required: 1, requirements: [] },
    ]

    for (const dept of departments) {
      DepartmentService.createDepartment(dept)
    }

    console.log(`Seeded ${departments.length} departments`)
  }

  private static async seedPorters(): Promise<void> {
    // Day Shift One porters
    const dayShiftOnePorters = [
      'Stephen Cooper', 'Darren Milhench', 'Darren Mycroft', 'Kevin Gaskell',
      'Merv Permalloo', 'Regan Stringer', 'Matthew Cope', 'AJ',
      'Michael Shaw', 'Steven Richardson', 'Chris Roach', 'Simon Collins', 'James Bennett'
    ]

    // Day Shift Two porters
    const dayShiftTwoPorters = [
      'Rob Mcpartland', 'John Evans', 'Charlotte Rimmer', 'Carla Barton',
      'Andrew Trudgeon', 'Stepen Bowater', 'Matthew Bennett', 'Stephen Scarsbrook',
      'Jordon Fish', 'Stephen Haughton', 'Stephen Maher', 'Marcus Huntington',
      'Chris Roach', 'Mark Walton', 'Allen Butler', 'Craig Butler'
    ]

    // Night Shift One porters
    const nightShiftOnePorters = [
      'Martin Hobson', 'Martin Kenyon', 'Scott Cartledge', 'Tony Batters',
      'Lewis Yearsley', 'Tomas Konkol', 'David Sykes'
    ]

    // Night Shift Two porters
    const nightShiftTwoPorters = [
      'Darren Flowers', 'Brian Cassidy', 'Karen Blackett', 'James Mitchell',
      'Alan Kelly', 'Tomas Konkol', 'David Sykes'
    ]

    // Monday-Friday porters
    const mondayFridayPorters = [
      'Mark Lloyd', 'Stepen Burke', 'Julie Greenough', 'Edward Collier',
      'Phil Hollinshead', 'Kevin Tomlinson', 'Soloman Offei', 'Stuart Ford',
      'Lee Stafford', 'Dean Pickering', 'Nicola Benger', 'Jeff Robinson',
      'Colin Bromley', 'Gary Booth', 'Lynne Warner', 'Roy Harris',
      'Ian Moss', 'Alan Clark', 'Paul Fisher', 'Kyle Sanderson',
      'Peter Moss', 'Chris Wardle', 'Eloisa Andrew', 'Gary Bromley',
      'Mike Brennan', 'Lucy Redfearn', 'Mark Dickinson', 'Ian Speakes',
      'Paul Berry', 'Robert Frost', 'Andrew Gibson', 'Nigel Beesley',
      'Andy Clayton', 'Matthew Rushton', 'Paul Flowers', 'Graham Brown',
      'Chris Huckaby', 'Jason Newton', 'Stuart Lomas'
    ]

    // Create Day Shift One porters
    for (const name of dayShiftOnePorters) {
      const porterData: PorterFormData = {
        name,
        type: 'Regular',
        contracted_hours: '0800-2000',
        break_duration_minutes: 60,
        shift_group: 'Day Shift One',
        department_assignments: []
      }
      PorterService.createPorter(porterData)
    }

    // Create Day Shift Two porters
    for (const name of dayShiftTwoPorters) {
      const porterData: PorterFormData = {
        name,
        type: 'Regular',
        contracted_hours: '0800-2000',
        break_duration_minutes: 60,
        shift_group: 'Day Shift Two',
        department_assignments: []
      }
      PorterService.createPorter(porterData)
    }

    // Create Night Shift One porters
    for (const name of nightShiftOnePorters) {
      const porterData: PorterFormData = {
        name,
        type: 'Regular',
        contracted_hours: '2000-0800',
        break_duration_minutes: 60,
        shift_group: 'Night Shift One',
        department_assignments: []
      }
      PorterService.createPorter(porterData)
    }

    // Create Night Shift Two porters
    for (const name of nightShiftTwoPorters) {
      const porterData: PorterFormData = {
        name,
        type: 'Regular',
        contracted_hours: '2000-0800',
        break_duration_minutes: 60,
        shift_group: 'Night Shift Two',
        department_assignments: []
      }
      PorterService.createPorter(porterData)
    }

    // Create Monday-Friday porters as Relief type
    for (const name of mondayFridayPorters) {
      const porterData: PorterFormData = {
        name,
        type: 'Relief',
        contracted_hours: '0800-1700',
        break_duration_minutes: 30,
        department_assignments: []
      }
      PorterService.createPorter(porterData)
    }

    const totalPorters = dayShiftOnePorters.length + dayShiftTwoPorters.length + 
                        nightShiftOnePorters.length + nightShiftTwoPorters.length + 
                        mondayFridayPorters.length

    console.log(`Seeded ${totalPorters} porters`)
  }
}
