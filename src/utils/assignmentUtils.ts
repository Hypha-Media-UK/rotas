/**
 * Utility functions for handling porter assignments with consistent logic
 */

export interface Assignment {
  id: number
  porter_id: number
  department_id: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Get the most recent assignment for each porter from a list of assignments
 * @param assignments - Array of all assignments
 * @returns Map of porter_id -> most recent assignment
 */
export function getMostRecentAssignmentsByPorter(assignments: Assignment[]): Map<number, Assignment> {
  const porterAssignmentMap = new Map<number, Assignment>()

  assignments
    .filter(a => a.is_active)
    .forEach(assignment => {
      const porterId = assignment.porter_id
      const existingAssignment = porterAssignmentMap.get(porterId)
      
      if (!existingAssignment) {
        porterAssignmentMap.set(porterId, assignment)
      } else {
        // Compare dates to keep the most recent assignment
        const currentDate = new Date(assignment.created_at || '1970-01-01').getTime()
        const existingDate = new Date(existingAssignment.created_at || '1970-01-01').getTime()
        
        if (currentDate > existingDate) {
          porterAssignmentMap.set(porterId, assignment)
        }
      }
    })

  return porterAssignmentMap
}

/**
 * Get the most recent assignment for a specific porter
 * @param assignments - Array of assignments for the porter
 * @returns Most recent assignment or null if none found
 */
export function getMostRecentAssignmentForPorter(assignments: Assignment[]): Assignment | null {
  const activeAssignments = assignments.filter(a => a.is_active)
  
  if (activeAssignments.length === 0) {
    return null
  }
  
  if (activeAssignments.length === 1) {
    return activeAssignments[0]
  }
  
  // Sort by created_at descending and return the first (most recent)
  const sortedAssignments = [...activeAssignments].sort((a, b) => {
    const dateA = new Date(a.created_at || '1970-01-01').getTime()
    const dateB = new Date(b.created_at || '1970-01-01').getTime()
    return dateB - dateA // Most recent first
  })
  
  return sortedAssignments[0]
}

/**
 * Get porters assigned to a specific department based on their most recent assignment
 * @param assignments - Array of all assignments
 * @param departmentId - ID of the department to filter by
 * @returns Array of porter IDs who are currently assigned to the department
 */
export function getPortersAssignedToDepartment(assignments: Assignment[], departmentId: number): number[] {
  const mostRecentAssignments = getMostRecentAssignmentsByPorter(assignments)
  
  return Array.from(mostRecentAssignments.values())
    .filter(assignment => assignment.department_id === departmentId)
    .map(assignment => assignment.porter_id)
}

/**
 * Get the current department ID for a porter based on their most recent assignment
 * @param assignments - Array of assignments for the porter
 * @returns Department ID or null if no active assignment
 */
export function getCurrentDepartmentForPorter(assignments: Assignment[]): number | null {
  const mostRecentAssignment = getMostRecentAssignmentForPorter(assignments)
  return mostRecentAssignment ? mostRecentAssignment.department_id : null
}

/**
 * Check if a porter has an assignment to a specific department (based on most recent assignment)
 * @param assignments - Array of assignments for the porter
 * @param departmentId - ID of the department to check
 * @returns True if the porter's most recent assignment is to the specified department
 */
export function isPorterAssignedToDepartment(assignments: Assignment[], departmentId: number): boolean {
  const currentDepartmentId = getCurrentDepartmentForPorter(assignments)
  return currentDepartmentId === departmentId
}
