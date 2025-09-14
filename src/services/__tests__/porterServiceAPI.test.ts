import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PorterServiceAPI } from '../porterServiceAPI'
import { ApiClient } from '../apiClient'
import { apiCache } from '../../utils/cache'

// Mock the ApiClient
vi.mock('../apiClient', () => ({
  ApiClient: {
    getPorters: vi.fn(),
    getPorterById: vi.fn(),
    createPorter: vi.fn(),
    updatePorter: vi.fn(),
    deletePorter: vi.fn(),
  },
}))

describe('PorterServiceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiCache.clear() // Clear cache between tests
  })

  describe('getAllPorters', () => {
    it('should fetch all porters successfully', async () => {
      const mockPorters = [
        {
          id: 1,
          name: 'John Doe',
          type: 'Regular',
          contracted_hours: { monday: { start: '08:00', end: '20:00' } },
          is_active: true,
        },
        {
          id: 2,
          name: 'Jane Smith',
          type: 'Relief',
          contracted_hours: { monday: { start: '20:00', end: '08:00' } },
          is_active: true,
        },
      ]

      vi.mocked(ApiClient.getPorters).mockResolvedValue(mockPorters)

      const result = await PorterServiceAPI.getAllPorters()

      expect(ApiClient.getPorters).toHaveBeenCalledOnce()
      expect(result).toEqual(mockPorters)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      vi.mocked(ApiClient.getPorters).mockRejectedValue(new Error('API Error'))

      const result = await PorterServiceAPI.getAllPorters()

      expect(result).toEqual([])
    })
  })

  describe('getPorterById', () => {
    it('should fetch porter by id successfully', async () => {
      const mockPorter = {
        id: 1,
        name: 'John Doe',
        type: 'Regular',
        contracted_hours: { monday: { start: '08:00', end: '20:00' } },
        is_active: true,
      }

      vi.mocked(ApiClient.getPorterById).mockResolvedValue(mockPorter)

      const result = await PorterServiceAPI.getPorterById(1)

      expect(ApiClient.getPorterById).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockPorter)
    })

    it('should return null on error', async () => {
      vi.mocked(ApiClient.getPorterById).mockRejectedValue(new Error('API Error'))

      const result = await PorterServiceAPI.getPorterById(1)

      expect(result).toBeNull()
    })
  })

  describe('createPorter', () => {
    it('should create porter successfully', async () => {
      const porterData = {
        name: 'New Porter',
        type: 'Regular' as const,
        contracted_hours: { monday: { start: '08:00', end: '20:00' } },
        break_duration_minutes: 30,
      }

      const mockCreatedPorter = {
        id: 3,
        ...porterData,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      vi.mocked(ApiClient.createPorter).mockResolvedValue(mockCreatedPorter)

      const result = await PorterServiceAPI.createPorter(porterData)

      expect(ApiClient.createPorter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: porterData.name,
          type: porterData.type,
          contracted_hours: porterData.contracted_hours,
          break_duration_minutes: 30,
          is_active: true,
        }),
      )
      expect(result).toEqual(mockCreatedPorter)
    })
  })

  describe('getPortersByType', () => {
    it('should filter porters by type', async () => {
      const mockPorters = [
        { id: 1, name: 'John', type: 'Regular', is_active: true },
        { id: 2, name: 'Jane', type: 'Relief', is_active: true },
        { id: 3, name: 'Bob', type: 'Regular', is_active: true },
      ]

      vi.mocked(ApiClient.getPorters).mockResolvedValue(mockPorters)

      const result = await PorterServiceAPI.getPortersByType('Regular')

      expect(result).toHaveLength(2)
      expect(result.every((p) => p.type === 'Regular')).toBe(true)
    })
  })

  describe('getActivePorters', () => {
    it('should filter active porters only', async () => {
      const mockPorters = [
        { id: 1, name: 'John', type: 'Regular', is_active: true },
        { id: 2, name: 'Jane', type: 'Relief', is_active: false },
        { id: 3, name: 'Bob', type: 'Regular', is_active: true },
      ]

      vi.mocked(ApiClient.getPorters).mockResolvedValue(mockPorters)

      const result = await PorterServiceAPI.getActivePorters()

      expect(result).toHaveLength(2)
      expect(result.every((p) => p.is_active === true)).toBe(true)
    })
  })
})
