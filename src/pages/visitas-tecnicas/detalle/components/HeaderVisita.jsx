import React, { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { isAdminOrSupervisor, isTecnico } from '../../../../utils/roleUtils'
import {
  VISITA_ESTADOS,
  getEstadoLabel,
  getEstadoColor
} from '../../../../constants/visitasTecnicasConstants'

const HeaderVisita = memo(({
  visitaActual,
  user,
  editMode,
  setEditMode,
  tecnicosAsignados,
  setTecnicosAsignados,
  tecnicos,
  puedeEditar,
  handleGuardarEdicionGeneral,
  handleCancelarEdicion,
  handleAceptarVisita,
  handleRechazarVisita,
  generateVisitaTecnicaReport,
  obtenerResumenFotos
}) => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      {/* Informacion principal */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <button
            onClick={() => navigate('/visitas-tecnicas')}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Visita Tecnica {visitaActual.id}
          </h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(visitaActual.estado)}`}>
            {getEstadoLabel(visitaActual.estado)}
          </span>
        </div>

        <p className="text-gray-600">
          {visitaActual.cliente}
          {visitaActual.fechaVisita && ` - ${format(new Date(visitaActual.fechaVisita), 'dd/MM/yyyy', { locale: es })}`}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {visitaActual.direccion} - {visitaActual.contacto}
        </p>

        {/* Tecnicos asignados */}
        {editMode && isAdminOrSupervisor(user) ? (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tecnicos asignados</label>
            <select
              multiple
              className="input-field h-24"
              value={tecnicosAsignados.map(t => t.id.toString())}
              onChange={(e) => {
                const selectedIds = Array.from(e.target.selectedOptions, option => option.value)
                const selectedTecnicos = tecnicos.filter(t => selectedIds.includes(t.id.toString()))
                  .map(t => ({
                    id: t.id,
                    nombre: t.nombre || t.name,
                    especialidad: t.especialidad || t.specialty
                  }))
                setTecnicosAsignados(selectedTecnicos)
              }}
            >
              {tecnicos.map(tecnico => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nombre || tecnico.name} - {tecnico.especialidad || tecnico.specialty}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Mantener Ctrl para seleccionar multiples</p>
          </div>
        ) : tecnicosAsignados.length > 0 && (
          <div className="mt-3">
            <span className="text-sm text-gray-500">Tecnicos: </span>
            <span className="text-sm text-gray-700">
              {tecnicosAsignados.map(t => t.nombre).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Botones de accion */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Boton de exportar PDF para admin/supervisor */}
        {isAdminOrSupervisor(user) && (
          <div>
            {generateVisitaTecnicaReport(visitaActual, obtenerResumenFotos())}
          </div>
        )}

        {/* Boton Editar */}
        {puedeEditar() && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className={isTecnico(user) ? "btn-primary" : "btn-secondary"}
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isTecnico(user) ? 'Llenar Formulario' : 'Editar'}
          </button>
        )}

        {/* Botones Guardar y Cancelar cuando esta en modo edicion */}
        {editMode && puedeEditar() && (
          <>
            <button
              onClick={handleGuardarEdicionGeneral}
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar
            </button>
            <button
              onClick={handleCancelarEdicion}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </>
        )}

        {/* Ver orden si existe */}
        {visitaActual.ordenGenerada && (
          <button
            onClick={() => navigate(`/ordenes-trabajo/${visitaActual.ordenGenerada}`)}
            className="btn-primary bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Ver Orden
          </button>
        )}

        {/* Botones de Aceptar/Rechazar para admin/supervisor */}
        {visitaActual.estado === VISITA_ESTADOS.COMPLETED &&
         !visitaActual.aprobacion &&
         isAdminOrSupervisor(user) && (
          <>
            <button
              onClick={handleAceptarVisita}
              className="btn-primary bg-green-600 hover:bg-green-700"
            >
              Aceptar
            </button>
            <button
              onClick={handleRechazarVisita}
              className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  )
})

HeaderVisita.displayName = 'HeaderVisita'

export default HeaderVisita
