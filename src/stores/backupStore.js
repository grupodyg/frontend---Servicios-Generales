import { create } from 'zustand'
import { api, API_ENDPOINTS, getAuthToken, fetchConManejoErrores } from '../config/api'

const useBackupStore = create((set, get) => ({
  backups: [],
  loading: false,
  creating: false,
  error: null,

  fetchBackups: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api.get(API_ENDPOINTS.BACKUPS)
      set({ backups: data || [], loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  createBackup: async () => {
    set({ creating: true, error: null })
    try {
      const data = await api.post(API_ENDPOINTS.BACKUPS)
      set({ creating: false })

      // Refrescar la lista
      await get().fetchBackups()
      return data
    } catch (error) {
      set({ creating: false, error: error.message })
      throw error
    }
  },

  downloadBackup: async (filename) => {
    try {
      // Descarga binaria: se usa fetch directo, pero con el mismo manejo de errores que el resto
      const token = getAuthToken()
      const response = await fetchConManejoErrores(API_ENDPOINTS.BACKUP_DOWNLOAD(filename), {
        headers: { Authorization: `Bearer ${token}` }
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteBackup: async (filename) => {
    try {
      await api.delete(API_ENDPOINTS.BACKUP_DELETE(filename))

      // Refrescar la lista
      await get().fetchBackups()
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  }
}))

export default useBackupStore
