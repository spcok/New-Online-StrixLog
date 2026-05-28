// ============================================================================
// File: src/services/baseService.ts
// ============================================================================
import { queryClient, db, TableName } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useOutboxStore } from '../store/outboxStore';

export interface UpsertAction {
  table: TableName;
  payload: any;
  queryKey?: any[];
}

export const baseService = {
  async commitToLocalVault(tableName: TableName, payload: any): Promise<void> {
    const vault = db[tableName] as any;
    if (!vault) return;

    const idKey = payload.id;
    if (idKey && vault.has(idKey)) {
      await vault.update(idKey, (draft: any) => {
        Object.assign(draft, payload);
      });
    } else {
      await vault.insert(payload);
    }
  },

  async upsert(action: UpsertAction): Promise<void> {
    // Deterministic metadata injection
    const payload = {
      ...action.payload,
      id: action.payload.id || crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };

    // 1. Optimistic UI update
    if (action.queryKey) {
      queryClient.setQueryData(action.queryKey, (oldRecords: any[] = []) => {
        const idx = oldRecords.findIndex((item: any) => item.id === payload.id);
        if (idx > -1) {
          const nextSet = [...oldRecords];
          nextSet[idx] = payload;
          return nextSet;
        }
        return [payload, ...oldRecords];
      });
    }

    // 2. Server-First Write Pass
    try {
      const { error } = await supabase
        .from(action.table)
        .upsert(payload);

      if (error) throw error;
      await this.commitToLocalVault(action.table, payload);

    } catch (networkError) {
      console.warn(`[BaseService] Network write failed for '${action.table}'. Diverting to failover outbox.`, networkError);

      await this.commitToLocalVault(action.table, payload);

      useOutboxStore.getState().addMutation({
        id: crypto.randomUUID(),
        table: action.table,
        action: 'upsert',
        payload
      });
    }
  }
};