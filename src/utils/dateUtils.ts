import { format, parseISO, startOfWeek, addDays, isToday, isSameDay } from 'date-fns'

export interface WeekDay {
  date: Date
  dateString: string
  dayShort: string
  dayNumber: string
  isToday: boolean
  isSelected: boolean
}

export function formatDate(dateString: string, formatStr: string = 'PPP'): string {
  try {
    return format(parseISO(dateString), formatStr)
  } catch {
    return 'Invalid date'
  }
}

export function formatDateTime(dateString: string, formatStr: string = 'PPP p'): string {
  try {
    return format(parseISO(dateString), formatStr)
  } catch {
    return 'Invalid date'
  }
}

export function getWeekDays(selectedDate: Date): WeekDay[] {
  const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
  
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfCurrentWeek, index)
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayShort: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: isToday(date),
      isSelected: isSameDay(date, selectedDate)
    }
  })
}

export function getCurrentWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = addDays(start, 6)
  return { start, end }
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end
}

export function getDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDate(dateString: string): Date {
  return parseISO(dateString)
}
