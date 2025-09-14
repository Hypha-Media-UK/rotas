import { describe, it, expect } from 'vitest'
import { formatContractedHours } from '../porterUtils'

describe('porterUtils', () => {
  describe('formatContractedHours', () => {
    it('should format all days pattern correctly', () => {
      const hours = {
        monday: { start: '08:00', end: '20:00' },
        tuesday: { start: '08:00', end: '20:00' },
        wednesday: { start: '08:00', end: '20:00' },
        thursday: { start: '08:00', end: '20:00' },
        friday: { start: '08:00', end: '20:00' },
        saturday: { start: '08:00', end: '20:00' },
        sunday: { start: '08:00', end: '20:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('All Days (08:00 - 20:00)')
    })

    it('should format all nights pattern correctly', () => {
      const hours = {
        monday: { start: '20:00', end: '08:00' },
        tuesday: { start: '20:00', end: '08:00' },
        wednesday: { start: '20:00', end: '08:00' },
        thursday: { start: '20:00', end: '08:00' },
        friday: { start: '20:00', end: '08:00' },
        saturday: { start: '20:00', end: '08:00' },
        sunday: { start: '20:00', end: '08:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('All Nights (20:00 - 08:00)')
    })

    it('should format weekdays only pattern correctly', () => {
      const hours = {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('Custom (5 days)')
    })

    it('should format custom pattern correctly', () => {
      const hours = {
        monday: { start: '08:00', end: '16:00' },
        wednesday: { start: '10:00', end: '18:00' },
        friday: { start: '12:00', end: '20:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('Custom (3 days)')
    })

    it('should handle old string format', () => {
      const result = formatContractedHours('0800-1700')
      expect(result).toBe('08:00 - 17:00')
    })

    it('should handle undefined input', () => {
      const result = formatContractedHours(undefined)
      expect(result).toBe('Not set')
    })

    it('should handle null input', () => {
      const result = formatContractedHours(null)
      expect(result).toBe('Not set')
    })

    it('should handle empty object', () => {
      const result = formatContractedHours({})
      expect(result).toBe('Not set')
    })

    it('should detect partial weekdays pattern', () => {
      const hours = {
        monday: { start: '08:00', end: '17:00' },
        tuesday: { start: '08:00', end: '17:00' },
        thursday: { start: '08:00', end: '17:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('Custom (3 days)')
    })

    it('should handle mixed time patterns', () => {
      const hours = {
        monday: { start: '08:00', end: '16:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '08:00', end: '16:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('Custom (3 days)')
    })

    it('should handle weekend only pattern', () => {
      const hours = {
        saturday: { start: '10:00', end: '18:00' },
        sunday: { start: '10:00', end: '18:00' },
      }

      const result = formatContractedHours(hours)
      expect(result).toBe('Custom (2 days)')
    })
  })
})
