// Simple in-memory cache for API responses
// This helps reduce redundant API calls and improves performance

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  // Get cached data if it exists and hasn't expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  // Set data in cache with optional TTL
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }
    
    this.cache.set(key, entry)
  }

  // Remove specific cache entry
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear()
  }

  // Clear expired entries
  clearExpired(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null
  }
}

// Create a singleton cache instance
export const apiCache = new SimpleCache()

// Cache key generators for consistent naming
export const cacheKeys = {
  allPorters: () => 'porters:all',
  porterById: (id: number) => `porter:${id}`,
  allDepartments: () => 'departments:all',
  departmentById: (id: number) => `department:${id}`,
  porterAssignments: (porterId: number) => `assignments:porter:${porterId}`,
  allAssignments: () => 'assignments:all',
  shiftPatterns: () => 'shift-patterns:all',
} as const

// Cache invalidation helpers
export const invalidateCache = {
  // Invalidate all porter-related cache
  porters: () => {
    apiCache.delete(cacheKeys.allPorters())
    // Also clear individual porter caches
    const stats = apiCache.getStats()
    stats.keys.forEach(key => {
      if (key.startsWith('porter:')) {
        apiCache.delete(key)
      }
    })
  },

  // Invalidate specific porter cache
  porter: (id: number) => {
    apiCache.delete(cacheKeys.porterById(id))
    apiCache.delete(cacheKeys.allPorters()) // Also invalidate list
  },

  // Invalidate all department-related cache
  departments: () => {
    apiCache.delete(cacheKeys.allDepartments())
    const stats = apiCache.getStats()
    stats.keys.forEach(key => {
      if (key.startsWith('department:')) {
        apiCache.delete(key)
      }
    })
  },

  // Invalidate specific department cache
  department: (id: number) => {
    apiCache.delete(cacheKeys.departmentById(id))
    apiCache.delete(cacheKeys.allDepartments()) // Also invalidate list
  },

  // Invalidate assignment-related cache
  assignments: () => {
    const stats = apiCache.getStats()
    stats.keys.forEach(key => {
      if (key.startsWith('assignments:')) {
        apiCache.delete(key)
      }
    })
  },

  // Clear all cache
  all: () => {
    apiCache.clear()
  },
}

// Auto-cleanup expired entries every 10 minutes
setInterval(() => {
  apiCache.clearExpired()
}, 10 * 60 * 1000)
