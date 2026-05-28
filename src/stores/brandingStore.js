import { create } from 'zustand'
import { api, API_ENDPOINTS, getAuthToken, getFileUrl } from '../config/api'

const useBrandingStore = create((set, get) => ({
  companyName: '',
  companySubtitle: '',
  loginLogoUrl: '',
  isLoaded: false,
  isLoading: false,

  fetchPublic: async () => {
    if (get().isLoading) return
    set({ isLoading: true })
    try {
      const response = await fetch(API_ENDPOINTS.APP_SETTINGS_PUBLIC)
      if (!response.ok) throw new Error('No se pudo cargar el branding')
      const data = await response.json()
      set({
        companyName: data.company_name || '',
        companySubtitle: data.company_subtitle || '',
        loginLogoUrl: data.login_logo_url || '',
        isLoaded: true,
        isLoading: false
      })
    } catch (error) {
      console.error('Error cargando branding:', error)
      set({ isLoaded: true, isLoading: false })
    }
  },

  updateTexts: async ({ company_name, company_subtitle }) => {
    const response = await api.put(API_ENDPOINTS.APP_SETTINGS, {
      company_name,
      company_subtitle
    })
    const data = response.data || {}
    set({
      companyName: data.company_name || '',
      companySubtitle: data.company_subtitle || '',
      loginLogoUrl: data.login_logo_url || ''
    })
    return data
  },

  uploadLogo: async (file) => {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(API_ENDPOINTS.APP_SETTINGS_LOGO, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload.error || payload.mensaje || 'Error al subir logo')
    }

    const data = payload.data || {}
    set({
      companyName: data.company_name || '',
      companySubtitle: data.company_subtitle || '',
      loginLogoUrl: data.login_logo_url || ''
    })
    return data
  },

  resetLogo: async () => {
    const response = await api.delete(API_ENDPOINTS.APP_SETTINGS_LOGO)
    const data = response.data || {}
    set({
      companyName: data.company_name || '',
      companySubtitle: data.company_subtitle || '',
      loginLogoUrl: data.login_logo_url || ''
    })
    return data
  },

  getLogoFullUrl: () => {
    const { loginLogoUrl } = get()
    if (!loginLogoUrl) return ''
    return getFileUrl(loginLogoUrl)
  }
}))

export default useBrandingStore
