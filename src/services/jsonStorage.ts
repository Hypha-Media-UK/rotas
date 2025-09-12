import type { Porter, Department, PorterDepartmentAssignment, Absence } from '../types'

interface StorageData {
  porters: Porter[]
  departments: Department[]
  assignments: PorterDepartmentAssignment[]
  absences: Absence[]
  nextPorterId: number
  nextDepartmentId: number
  nextAssignmentId: number
  nextAbsenceId: number
}

class JsonStorageService {
  private storageKey = 'staff-rotas-data'

  // Get all data from localStorage
  private getData(): StorageData {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error)
    }

    // Return default empty data structure
    return {
      porters: [],
      departments: [],
      assignments: [],
      absences: [],
      nextPorterId: 1,
      nextDepartmentId: 1,
      nextAssignmentId: 1,
      nextAbsenceId: 1,
    }
  }

  // Save all data to localStorage
  private saveData(data: StorageData): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  // Porter operations
  getAllPorters(): Porter[] {
    return this.getData().porters
  }

  savePorters(porters: Porter[]): void {
    const data = this.getData()
    data.porters = porters
    this.saveData(data)
  }

  getNextPorterId(): number {
    const data = this.getData()
    return data.nextPorterId
  }

  incrementPorterId(): number {
    const data = this.getData()
    const id = data.nextPorterId
    data.nextPorterId++
    this.saveData(data)
    return id
  }

  // Department operations
  getAllDepartments(): Department[] {
    return this.getData().departments
  }

  saveDepartments(departments: Department[]): void {
    const data = this.getData()
    data.departments = departments
    this.saveData(data)
  }

  getNextDepartmentId(): number {
    const data = this.getData()
    return data.nextDepartmentId
  }

  incrementDepartmentId(): number {
    const data = this.getData()
    const id = data.nextDepartmentId
    data.nextDepartmentId++
    this.saveData(data)
    return id
  }

  // Assignment operations
  getAllAssignments(): PorterDepartmentAssignment[] {
    return this.getData().assignments
  }

  saveAssignments(assignments: PorterDepartmentAssignment[]): void {
    const data = this.getData()
    data.assignments = assignments
    this.saveData(data)
  }

  getNextAssignmentId(): number {
    const data = this.getData()
    return data.nextAssignmentId
  }

  incrementAssignmentId(): number {
    const data = this.getData()
    const id = data.nextAssignmentId
    data.nextAssignmentId++
    this.saveData(data)
    return id
  }

  // Absence operations
  getAllAbsences(): Absence[] {
    return this.getData().absences
  }

  saveAbsences(absences: Absence[]): void {
    const data = this.getData()
    data.absences = absences
    this.saveData(data)
  }

  // Utility operations
  clearAllData(): void {
    localStorage.removeItem(this.storageKey)
    console.log('All data cleared from storage')
  }

  exportData(): string {
    return JSON.stringify(this.getData(), null, 2)
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      this.saveData(data)
      console.log('Data imported successfully')
      return true
    } catch (error) {
      console.error('Error importing data:', error)
      return false
    }
  }

  // Check if data exists (for initialization)
  hasData(): boolean {
    const data = this.getData()
    return data.porters.length > 0 || data.departments.length > 0
  }

  // Check if porters exist
  hasPorters(): boolean {
    const data = this.getData()
    return data.porters.length > 0
  }

  // Check if departments exist
  hasDepartments(): boolean {
    const data = this.getData()
    return data.departments.length > 0
  }
}

export const jsonStorage = new JsonStorageService()
