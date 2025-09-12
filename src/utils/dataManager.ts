import { jsonStorage } from '../services/jsonStorage'

export class DataManager {
  // Export all data as JSON string
  static exportData(): string {
    return jsonStorage.exportData()
  }

  // Import data from JSON string
  static importData(jsonData: string): boolean {
    return jsonStorage.importData(jsonData)
  }

  // Clear all data
  static clearAllData(): void {
    jsonStorage.clearAllData()
  }

  // Download data as JSON file
  static downloadData(): void {
    const data = this.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `staff-rotas-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  // Upload and import data from file
  static uploadData(): Promise<boolean> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(false)
          return
        }
        
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = e.target?.result as string
            const success = this.importData(jsonData)
            resolve(success)
          } catch (error) {
            console.error('Error reading file:', error)
            resolve(false)
          }
        }
        reader.readAsText(file)
      }
      
      input.click()
    })
  }

  // Get storage statistics
  static getStorageStats() {
    const data = JSON.parse(jsonStorage.exportData())
    return {
      porters: data.porters.length,
      departments: data.departments.length,
      assignments: data.assignments.length,
      absences: data.absences.length,
      storageSize: new Blob([jsonStorage.exportData()]).size,
    }
  }
}

// Add global access for debugging (only in development)
if (import.meta.env.DEV) {
  (window as any).DataManager = DataManager
}
