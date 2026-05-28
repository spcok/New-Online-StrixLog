import { supabase } from './supabase'

/**
 * Universal execution context for offline-first failover routing.
 * Abstracts raw Supabase queries into an isolated execution pipeline.
 */
export const db = {
  /**
   * Executes a database pipeline operation securely.
   * Leverages the underlying client wrapper to enforce network-resilient querying.
   */
  async query<T>(executionBlock: (client: typeof supabase) => Promise<{ data: T | null; error: any }>): Promise<T> {
    try {
      const { data, error } = await executionBlock(supabase)
      
      if (error) {
        throw new Error(`Database transaction failed: ${error.message || JSON.stringify(error)}`)
      }
      
      if (data === null) {
        throw new Error('Database transaction returned null payload.')
      }
      
      return data
    } catch (err) {
      // Capture and escalate to our TanStack offline-failover boundary
      console.error('Data layer isolation trap caught exception:', err)
      throw err
    }
  }
}