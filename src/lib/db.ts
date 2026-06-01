// ============================================================================
// File: src/lib/db.ts
// ============================================================================
import { createCollection } from '@tanstack/react-db';
import { QueryClient } from '@tanstack/react-query';
import equal from 'fast-deep-equal';
import { supabase } from './supabase';
import type * as Schema from '../types/schema';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    },
  },
});

const getKey = (row: unknown): string => {
  if (row && typeof row === 'object' && 'id' in row) {
    return String((row as { id: unknown }).id);
  }
  return crypto.randomUUID();
};

const createLocalVault = <T extends Record<string, any>>(tableName: string) =>
  createCollection<T>({
    id: tableName,
    getKey,
    // INJECTED: Network Isolation to prevent library boot crashes
    sync: {
      push: async () => {},
      pull: async () => ({ rows: [] }),
    },
    // INJECTED: Mutation Handlers to prevent crashes during manual baseService inserts
    onInsert: (item) => item,
    onUpdate: (item) => item,
    onDelete: (item) => item,
  } as any);

// Unified Structural Data Registries (Strongly Typed to schema.ts)
export const db = {
  animals: createLocalVault<Schema.Animal>('animals'),
  daily_logs: createLocalVault<Schema.DailyLog>('daily_logs'),
  daily_rounds: createLocalVault<Schema.DailyRound>('daily_rounds'),
  feeding_schedules: createLocalVault<Schema.FeedingSchedule>('feeding_schedules'),
  operational_lists: createLocalVault<Schema.OperationalList>('operational_lists'),
  internal_movements: createLocalVault<Schema.InternalMovement>('internal_movements'),
  external_transfers: createLocalVault<Schema.ExternalTransfer>('external_transfers'),
  clinical_records: createLocalVault<Schema.ClinicalRecord>('clinical_records'),
  clinical_attachments: createLocalVault<Schema.ClinicalAttachment>('clinical_attachments'),
  clinical_schedule: createLocalVault<Schema.ClinicalSchedule>('clinical_schedule'),
  medication_logs: createLocalVault<Schema.MedicationLog>('medication_logs'),
  isolation_logs: createLocalVault<Schema.IsolationLog>('isolation_logs'),
  incidents: createLocalVault<Schema.Incident>('incidents'),
  first_aid_logs: createLocalVault<Schema.FirstAidLog>('first_aid_logs'),
  safety_drills: createLocalVault<Schema.SafetyDrill>('safety_drills'),
  maintenance_tickets: createLocalVault<Schema.MaintenanceTicket>('maintenance_tickets'),
  users: createLocalVault<Schema.User>('users'),
  shifts: createLocalVault<Schema.Shift>('shifts'),
  shift_patterns: createLocalVault<Schema.ShiftPattern>('shift_patterns'),
  leave_requests: createLocalVault<Schema.LeaveRequest>('leave_requests'),
  tasks: createLocalVault<Schema.Task>('tasks'),
  timesheets: createLocalVault<Schema.Timesheet>('timesheets'),
  zla_documents: createLocalVault<Schema.ZLADocument>('zla_documents'),
  organisations: createLocalVault<Schema.Organisation>('organisations'),
  role_permissions: createLocalVault<Schema.RolePermission>('role_permissions'),
} as const;

export type TableName = keyof typeof db;

export const syncAll = async (): Promise<{ table: TableName; success: boolean; count?: number }[]> => {
  const tables = Object.keys(db) as TableName[];
  console.log('[SyncEngine] Initializing optimized data hydration sequence...');

  return Promise.all(
    tables.map(async (tableName) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); 

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) throw error;

        if (data && Array.isArray(data)) {
          const targetVault = db[tableName] as any;
          let updatedCount = 0;
          
          for (const row of data) {
            const rowKey = getKey(row);
            
            if (targetVault.has(rowKey)) {
              const currentSnapshot = targetVault.get(rowKey);
              if (!equal(currentSnapshot, row)) {
                await targetVault.update(rowKey, (draft: any) => {
                  Object.assign(draft, row);
                });
                updatedCount++;
              }
            } else {
              await targetVault.insert(row);
              updatedCount++;
            }
          }

          // INJECTED: If data changed in the vault, force the UI to immediately re-render
          if (updatedCount > 0) {
            queryClient.invalidateQueries({ queryKey: [tableName] });
          }

          return { table: tableName, success: true, count: data.length };
        }
        return { table: tableName, success: true, count: 0 };
      } catch (err) {
        console.warn(`[SyncEngine] Server disconnect or timeout on [${tableName}]. Retaining local failover context.`);
        return { table: tableName, success: false };
      }
    })
  );
};