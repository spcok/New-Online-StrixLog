import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const FORTNIGHT_IN_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes fresh window before trying network refresh
      gcTime: FORTNIGHT_IN_MS,  // Keep in cache for 14 days if offline
      networkMode: 'offlineFirst',
      retry: 3,
    },
    mutations: {
      networkMode: 'offlineFirst',
    }
  },
})

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'KOA_MANAGER_OFFLINE_CACHE',
})

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: FORTNIGHT_IN_MS,
  bMaxAge: FORTNIGHT_IN_MS,
})