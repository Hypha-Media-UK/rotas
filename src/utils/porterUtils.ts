import type { Porter } from '@/types'

/**
 * Format contracted hours for display
 */
export function formatContractedHours(contractedHours: any): string {
  if (!contractedHours) {
    return 'Not set'
  }

  // Handle old string format
  if (typeof contractedHours === 'string') {
    if (contractedHours.includes('-')) {
      const [start, end] = contractedHours.split('-')
      if (start && end) {
        const startTime = `${start.slice(0, 2)}:${start.slice(2)}`
        const endTime = `${end.slice(0, 2)}:${end.slice(2)}`
        return `${startTime} - ${endTime}`
      }
    }
    return contractedHours
  }

  // Handle new object format
  if (typeof contractedHours === 'object') {
    const dayKeys = Object.keys(contractedHours)
    
    if (dayKeys.length === 0) {
      return 'Not set'
    }

    // Check if all days have the same hours
    if (dayKeys.length === 7) {
      const firstDay = contractedHours[dayKeys[0]]
      const allSame = dayKeys.every(
        (day) =>
          contractedHours[day] && 
          contractedHours[day].start === firstDay.start && 
          contractedHours[day].end === firstDay.end,
      )

      if (allSame) {
        if (firstDay.start === '08:00' && firstDay.end === '20:00') {
          return 'All Days (08:00 - 20:00)'
        } else if (firstDay.start === '20:00' && firstDay.end === '08:00') {
          return 'All Nights (20:00 - 08:00)'
        } else {
          return `All Days (${firstDay.start} - ${firstDay.end})`
        }
      }
    }

    // Custom hours - show summary
    const activeDays = dayKeys.filter(day => contractedHours[day])
    if (activeDays.length === 0) {
      return 'Not set'
    }

    if (activeDays.length === 1) {
      const day = activeDays[0]
      const schedule = contractedHours[day]
      return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${schedule.start} - ${schedule.end}`
    }

    return `Custom (${activeDays.length} days)`
  }

  return 'Not set'
}

/**
 * Calculate total hours per week for a porter
 */
export function calculateWeeklyHours(contractedHours: any, breakDurationMinutes: number = 30): number {
  if (!contractedHours) {
    return 0
  }

  // Handle old string format
  if (typeof contractedHours === 'string') {
    if (contractedHours.includes('-')) {
      const [start, end] = contractedHours.split('-')
      if (start && end) {
        const startHour = parseInt(start.slice(0, 2))
        const startMin = parseInt(start.slice(2))
        const endHour = parseInt(end.slice(0, 2))
        const endMin = parseInt(end.slice(2))
        
        const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
        const workingMinutes = totalMinutes - breakDurationMinutes
        return (workingMinutes / 60) * 7 // 7 days a week
      }
    }
    return 0
  }

  // Handle new object format
  if (typeof contractedHours === 'object') {
    let totalWeeklyMinutes = 0

    for (const [day, schedule] of Object.entries(contractedHours)) {
      if (schedule && typeof schedule === 'object' && 'start' in schedule && 'end' in schedule) {
        const [startHour, startMin] = schedule.start.split(':').map(Number)
        const [endHour, endMin] = schedule.end.split(':').map(Number)
        
        let totalMinutes
        if (endHour < startHour) {
          // Night shift crossing midnight
          totalMinutes = (24 * 60) - (startHour * 60 + startMin) + (endHour * 60 + endMin)
        } else {
          totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
        }
        
        const workingMinutes = totalMinutes - breakDurationMinutes
        totalWeeklyMinutes += Math.max(0, workingMinutes)
      }
    }

    return totalWeeklyMinutes / 60
  }

  return 0
}
