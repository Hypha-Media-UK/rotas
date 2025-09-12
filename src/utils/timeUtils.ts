/**
 * Calculate total working hours minus break time
 * @param contractedHours - Format: "0800-2000" or "20:00-08:00"
 * @param breakMinutes - Break duration in minutes
 * @returns Formatted total hours string
 */
export function calculateTotalHours(contractedHours: string, breakMinutes: number = 0): string {
  try {
    // Handle different time formats
    const timePattern = /(\d{1,2}):?(\d{2})-(\d{1,2}):?(\d{2})/
    const match = contractedHours.match(timePattern)
    
    if (!match) {
      return contractedHours // Return original if can't parse
    }

    const [, startHour, startMin, endHour, endMin] = match.map(Number)
    
    // Convert to minutes
    let startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    
    // Handle overnight shifts (e.g., 20:00-08:00)
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60 // Add 24 hours
    }
    
    // Calculate total minutes worked
    const totalMinutes = endMinutes - startMinutes - breakMinutes
    
    // Convert back to hours and minutes
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  } catch {
    return contractedHours // Return original if error
  }
}

/**
 * Parse time string to minutes since midnight
 * @param timeString - Format: "08:00" or "0800"
 * @returns Minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
  const cleaned = timeString.replace(':', '')
  const hours = parseInt(cleaned.substring(0, cleaned.length - 2), 10)
  const minutes = parseInt(cleaned.substring(cleaned.length - 2), 10)
  return hours * 60 + minutes
}

/**
 * Format minutes to time string
 * @param minutes - Minutes since midnight
 * @returns Formatted time string "HH:MM"
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Check if a time range represents a night shift
 * @param contractedHours - Format: "0800-2000"
 * @returns True if it's a night shift
 */
export function isNightShift(contractedHours: string): boolean {
  try {
    const timePattern = /(\d{1,2}):?(\d{2})-(\d{1,2}):?(\d{2})/
    const match = contractedHours.match(timePattern)
    
    if (!match) return false

    const [, startHour, , endHour] = match.map(Number)
    
    // Night shift if start time is after 18:00 or end time is before 10:00
    return startHour >= 18 || endHour <= 10
  } catch {
    return false
  }
}

/**
 * Get shift type from contracted hours
 * @param contractedHours - Format: "0800-2000"
 * @returns 'day' or 'night'
 */
export function getShiftType(contractedHours: string): 'day' | 'night' {
  return isNightShift(contractedHours) ? 'night' : 'day'
}
