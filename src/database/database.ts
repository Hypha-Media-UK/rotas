// Browser-compatible database service using localStorage for now
// In a real application, you might want to use IndexedDB or a server-side database

interface DatabaseRow {
  [key: string]: any
}

interface QueryResult {
  lastInsertRowid?: number
  changes: number
}

export class DatabaseService {
  private static instance: DatabaseService
  private tables: Map<string, DatabaseRow[]> = new Map()

  private constructor() {
    this.initializeSchema()
    this.loadFromStorage()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private initializeSchema(): void {
    // Initialize empty tables
    const tableNames = [
      'departments',
      'porters',
      'porter_department_assignments',
      'absences',
      'daily_assignments',
      'department_requirements',
      'shift_patterns',
    ]

    tableNames.forEach((tableName) => {
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, [])
      }
    })

    console.log('Database schema initialized successfully')
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('rotas_database')
      if (stored) {
        const data = JSON.parse(stored)
        this.tables = new Map(Object.entries(data))
      }
    } catch (error) {
      console.warn('Could not load data from localStorage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.tables)
      localStorage.setItem('rotas_database', JSON.stringify(data))
    } catch (error) {
      console.warn('Could not save data to localStorage:', error)
    }
  }

  // Simple query execution for basic CRUD operations
  public query(sql: string, params: any[] = []): DatabaseRow[] {
    const trimmedSql = sql.trim().toLowerCase()

    if (trimmedSql.startsWith('select')) {
      return this.executeSelect(sql, params)
    } else if (trimmedSql.startsWith('insert')) {
      this.executeInsert(sql, params)
      this.saveToStorage()
      return []
    } else if (trimmedSql.startsWith('update')) {
      this.executeUpdate(sql, params)
      this.saveToStorage()
      return []
    } else if (trimmedSql.startsWith('delete')) {
      this.executeDelete(sql, params)
      this.saveToStorage()
      return []
    }

    return []
  }

  private executeSelect(sql: string, params: any[]): DatabaseRow[] {
    // Very basic SELECT parsing - in a real app you'd use a proper SQL parser
    const tableName = this.extractTableName(sql)
    const table = this.tables.get(tableName) || []

    // For now, return all rows (filtering would be implemented here)
    return table.filter((row) => row.is_active !== 0) // Basic active filter
  }

  private executeInsert(sql: string, params: any[]): QueryResult {
    const tableName = this.extractTableName(sql)
    const table = this.tables.get(tableName) || []

    // Extract column names from INSERT statement
    const columnsMatch = sql.match(/\(([^)]+)\)/)
    const columns = columnsMatch ? columnsMatch[1].split(',').map((c) => c.trim()) : []

    // Create new row
    const newRow: DatabaseRow = {
      id: table.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Map parameters to columns
    columns.forEach((col, index) => {
      if (params[index] !== undefined) {
        newRow[col] = params[index]
      }
    })

    table.push(newRow)
    this.tables.set(tableName, table)

    return { lastInsertRowid: newRow.id, changes: 1 }
  }

  private executeUpdate(sql: string, params: any[]): QueryResult {
    const tableName = this.extractTableName(sql)
    const table = this.tables.get(tableName) || []

    // Very basic update - would need proper WHERE clause parsing
    const idParam = params[params.length - 1] // Assume last param is ID
    const rowIndex = table.findIndex((row) => row.id === idParam)

    if (rowIndex >= 0) {
      table[rowIndex].updated_at = new Date().toISOString()
      // Update other fields based on SET clause (simplified)
      return { changes: 1 }
    }

    return { changes: 0 }
  }

  private executeDelete(sql: string, params: any[]): QueryResult {
    const tableName = this.extractTableName(sql)
    const table = this.tables.get(tableName) || []

    const idParam = params[0]
    const initialLength = table.length
    const filteredTable = table.filter((row) => row.id !== idParam)

    this.tables.set(tableName, filteredTable)

    return { changes: initialLength - filteredTable.length }
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/(?:from|into|update)\s+(\w+)/i)
    return match ? match[1] : ''
  }

  // Compatibility methods for the existing service classes
  public prepare(sql: string) {
    return {
      all: (...params: any[]) => this.query(sql, params),
      get: (...params: any[]) => this.query(sql, params)[0] || undefined,
      run: (...params: any[]) => {
        this.query(sql, params)
        return { lastInsertRowid: Date.now(), changes: 1 }
      },
    }
  }

  public transaction<T>(fn: () => T): () => T {
    return () => {
      try {
        const result = fn()
        this.saveToStorage()
        return result
      } catch (error) {
        // In a real implementation, you'd rollback here
        throw error
      }
    }
  }

  public exec(sql: string): any {
    return this.query(sql)
  }

  public close(): void {
    this.saveToStorage()
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance()
