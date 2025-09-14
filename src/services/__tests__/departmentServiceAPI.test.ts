import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DepartmentServiceAPI } from '../departmentServiceAPI'
import { ApiClient } from '../apiClient'
import { apiCache } from '../../utils/cache'

// Mock the ApiClient
vi.mock('../apiClient', () => ({
  ApiClient: {
    getDepartments: vi.fn(),
    getDepartmentById: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
    assignPorterToDepartment: vi.fn(),
    getPorterAssignments: vi.fn(),
  },
}))

describe('DepartmentServiceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiCache.clear() // Clear cache between tests
  })

  describe('getAllDepartments', () => {
    it('should fetch all departments successfully', async () => {
      const mockDepartments = [
        {
          id: 1,
          name: 'A&E',
          code: 'AE',
          operating_hours: { monday: { start: '00:00', end: '23:59' } },
          required_staff: 2,
          is_active: true,
        },
        {
          id: 2,
          name: 'Theatres',
          code: 'TH',
          operating_hours: { monday: { start: '08:00', end: '18:00' } },
          required_staff: 3,
          is_active: true,
        },
      ]

      vi.mocked(ApiClient.getDepartments).mockResolvedValue(mockDepartments)

      const result = await DepartmentServiceAPI.getAllDepartments()

      expect(ApiClient.getDepartments).toHaveBeenCalledOnce()
      expect(result).toEqual(mockDepartments)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      vi.mocked(ApiClient.getDepartments).mockRejectedValue(new Error('API Error'))

      const result = await DepartmentServiceAPI.getAllDepartments()

      expect(result).toEqual([])
    })
  })

  describe('getDepartmentById', () => {
    it('should fetch department by id successfully', async () => {
      const mockDepartment = {
        id: 1,
        name: 'A&E',
        code: 'AE',
        operating_hours: { monday: { start: '00:00', end: '23:59' } },
        required_staff: 2,
        is_active: true,
      }

      vi.mocked(ApiClient.getDepartmentById).mockResolvedValue(mockDepartment)

      const result = await DepartmentServiceAPI.getDepartmentById(1)

      expect(ApiClient.getDepartmentById).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockDepartment)
    })

    it('should return null on error', async () => {
      vi.mocked(ApiClient.getDepartmentById).mockRejectedValue(new Error('API Error'))

      const result = await DepartmentServiceAPI.getDepartmentById(1)

      expect(result).toBeNull()
    })
  })

  describe('createDepartment', () => {
    it('should create department successfully', async () => {
      const departmentData = {
        name: 'New Department',
        code: 'ND',
        operating_hours: { monday: { start: '08:00', end: '17:00' } },
        required_staff: 1,
      }

      const mockCreatedDepartment = {
        id: 3,
        ...departmentData,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      vi.mocked(ApiClient.createDepartment).mockResolvedValue(mockCreatedDepartment)

      const result = await DepartmentServiceAPI.createDepartment(departmentData)

      expect(ApiClient.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: departmentData.name,
          operating_hours: departmentData.operating_hours,
        }),
      )
      expect(result).toEqual(mockCreatedDepartment)
    })
  })

  describe('getActiveDepartments', () => {
    it('should return all departments since API filters active ones', async () => {
      const mockDepartments = [
        { id: 1, name: 'A&E', is_active: true },
        { id: 2, name: 'Theatres', is_active: true },
      ]

      vi.mocked(ApiClient.getDepartments).mockResolvedValue(mockDepartments)

      const result = await DepartmentServiceAPI.getActiveDepartments()

      expect(result).toEqual(mockDepartments)
    })
  })

  describe('assignPorterToDepartment', () => {
    it('should assign porter to department successfully', async () => {
      vi.mocked(ApiClient.assignPorterToDepartment).mockResolvedValue(undefined)

      const result = await DepartmentServiceAPI.assignPorterToDepartment(1, 2)

      expect(ApiClient.assignPorterToDepartment).toHaveBeenCalledWith(1, 2)
      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      vi.mocked(ApiClient.assignPorterToDepartment).mockRejectedValue(new Error('API Error'))

      const result = await DepartmentServiceAPI.assignPorterToDepartment(1, 2)

      expect(result).toBe(false)
    })
  })

  describe('getPorterAssignments', () => {
    it('should fetch porter assignments successfully', async () => {
      const mockAssignments = [
        { id: 1, porter_id: 1, department_id: 2, is_active: true },
        { id: 2, porter_id: 1, department_id: 3, is_active: true },
      ]

      vi.mocked(ApiClient.getPorterAssignments).mockResolvedValue(mockAssignments)

      const result = await DepartmentServiceAPI.getPorterAssignments(1)

      expect(ApiClient.getPorterAssignments).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockAssignments)
    })

    it('should return empty array on error', async () => {
      vi.mocked(ApiClient.getPorterAssignments).mockRejectedValue(new Error('API Error'))

      const result = await DepartmentServiceAPI.getPorterAssignments(1)

      expect(result).toEqual([])
    })
  })
})
