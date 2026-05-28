// ============================================================================
// File: src/lib/queries.ts (New Foundational File)
// ============================================================================
import { queryClient, db, TableName } from './db';

/**
 * Universal Offline-First Read Pipeline.
 * Queries data directly from the local TanStack DB vault. 
 * Because SyncEngine constantly hydrates these vaults in the background, 
 * this guarantees instant loads and perfect 14-day offline resilience.
 */
export const fetchLocalTable = async <T>(tableName: TableName): Promise<T[]> => {
  const vault = (db as any)[tableName];
  if (!vault) {
    console.error(`[ReadPipeline] Vault not found for table: ${tableName}`);
    return [];
  }
  
  // TanStack DB native method to extract all local snapshot records
  const records = await vault.findAll();
  
  // Filter out soft-deleted records globally at the foundation level
  return records.filter((record: any) => !record.is_deleted) as T[];
};

/**
 * Helper to generate standardized TanStack Query options
 */
export const getTableQueryOptions = <T>(tableName: TableName) => ({
  queryKey: [tableName],
  queryFn: () => fetchLocalTable<T>(tableName),
  // Data is driven by SyncEngine, so we reduce aggressive background refetching 
  // on the component level to save battery/CPU on rugged tablets.
  staleTime: 1000 * 60 * 15, // 15 minutes
});