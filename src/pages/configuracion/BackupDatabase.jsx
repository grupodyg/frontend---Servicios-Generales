import { useState, useEffect } from 'react'
import useBackupStore from '../../stores/backupStore'
import Swal from 'sweetalert2'

const BackupDatabase = () => {
  const { backups, loading, creating, fetchBackups, createBackup, downloadBackup, deleteBackup } = useBackupStore()
  const [downloadingFile, setDownloadingFile] = useState(null)

  useEffect(() => {
    fetchBackups().catch(() => {})
  }, [])

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleCreateBackup = async () => {
    const result = await Swal.fire({
      title: 'Crear Backup',
      text: 'Se generará una copia de seguridad completa de la base de datos. ¿Deseas continuar?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, crear backup',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      await createBackup()
      Swal.fire({
        title: 'Backup creado',
        text: 'La copia de seguridad se ha generado y almacenado correctamente.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message || 'No se pudo crear el backup.',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      })
    }
  }

  const handleDownload = async (filename) => {
    setDownloadingFile(filename)
    try {
      await downloadBackup(filename)
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message || 'No se pudo descargar el backup.',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      })
    } finally {
      setDownloadingFile(null)
    }
  }

  const handleDelete = async (filename) => {
    const result = await Swal.fire({
      title: '¿Eliminar backup?',
      text: `Se eliminará permanentemente: ${filename}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      await deleteBackup(filename)
      Swal.fire({
        title: 'Eliminado',
        text: 'El backup ha sido eliminado correctamente.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message || 'No se pudo eliminar el backup.',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de crear */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Copias de Seguridad</h2>
          <p className="text-sm text-gray-500">Gestiona los backups de la base de datos almacenados en la nube</p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generando backup...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Crear Backup
            </>
          )}
        </button>
      </div>

      {/* Tabla de backups */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Cargando backups...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">No hay backups disponibles</p>
            <p className="text-xs text-gray-400 mt-1">Crea tu primer backup con el botón de arriba</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-none">
                          {backup.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatFileSize(backup.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(backup.lastModified)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(backup.filename)}
                          disabled={downloadingFile === backup.filename}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          title="Descargar backup"
                        >
                          {downloadingFile === backup.filename ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          <span className="ml-1.5 hidden sm:inline">Descargar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(backup.filename)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          title="Eliminar backup"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="ml-1.5 hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-amber-800 font-medium">Información sobre los backups</p>
            <ul className="mt-1 text-xs text-amber-700 space-y-1">
              <li>Los backups se almacenan de forma segura en la nube (Wasabi S3).</li>
              <li>Cada backup contiene toda la estructura y datos de la base de datos.</li>
              <li>Para restaurar un backup, descárgalo y usa el comando: <code className="bg-amber-100 px-1 rounded">psql -U usuario -d base_de_datos &lt; archivo.sql</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BackupDatabase
