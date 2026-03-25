import React from 'react'
import useVisitaDetalle from './hooks/useVisitaDetalle'

// Componentes de pestanas
import TabEstadoLugar from './tabs/TabEstadoLugar'
import TabMateriales from './tabs/TabMateriales'
import TabHerramientas from './tabs/TabHerramientas'
import TabPersonal from './tabs/TabPersonal'
import TabCompletado from './tabs/TabCompletado'
import TabResumen from './tabs/TabResumen'

// Componentes compartidos
import HeaderVisita from './components/HeaderVisita'
import ModalEditarMaterial from './components/ModalEditarMaterial'

const VisitaTecnicaDetalleRefactorizado = () => {
  // Hook centralizado con toda la logica
  const {
    // Datos principales
    user,
    visitaActual,
    isLoading,

    // UI
    activeTab,
    setActiveTab,
    editMode,
    setEditMode,

    // Tecnicos
    tecnicosAsignados,
    setTecnicosAsignados,
    tecnicos,

    // Estado del lugar
    estadoLugar,
    setEstadoLugar,
    handleGuardarEstadoLugar,

    // Materiales
    materiales,
    nuevoMaterial,
    setNuevoMaterial,
    inputMaterial,
    mostrarDropdown,
    materialDelInventario,
    materialEditando,
    setMaterialEditando,
    mostrarModalEditarMaterial,
    handleInputMaterialChange,
    handleSeleccionarMaterial,
    handleFocusInput,
    handleBlurInput,
    handleAgregarMaterial,
    handleEliminarMaterial,
    handleAbrirModalEditarMaterial,
    handleCerrarModalEditarMaterial,
    handleGuardarMaterialEditado,

    // Herramientas
    herramientas,
    herramientasInventario,
    nuevaHerramienta,
    setNuevaHerramienta,
    herramientaSeleccionadaInventario,
    inputHerramienta,
    mostrarDropdownHerramienta,
    handleInputHerramientaChange,
    handleSeleccionarHerramienta,
    handleFocusInputHerramienta,
    handleBlurInputHerramienta,
    handleAgregarHerramienta,
    handleEliminarHerramienta,
    handleGuardarHerramientas,

    // Personal
    listaPersonal,
    nuevaPersona,
    setNuevaPersona,
    especialidadPersonalizada,
    setEspecialidadPersonalizada,
    mostrarInputEspecialidad,
    requerimientosAdicionales,
    setRequerimientosAdicionales,
    totalDiasEstimados,
    setTotalDiasEstimados,
    handleEspecialidadChange,
    handleAgregarPersona,
    handleEliminarPersona,
    handleGuardarPersonal,
    handleCargarTarifasPersonal,
    handleActualizarPrecioPersona,
    handleGuardarPreciosPersonal,

    // Completar
    datosCompletado,
    setDatosCompletado,
    canvasRef,
    isDrawing,
    showSignaturePad,
    setShowSignaturePad,
    handleCompletarVisita,
    startDrawing,
    draw,
    stopDrawing,
    clearSignature,
    saveSignature,

    // Aprobacion
    handleAceptarVisita,
    handleRechazarVisita,

    // Cotizacion
    presupuestos,
    handleGenerarCotizacion,

    // PDF
    generateVisitaTecnicaReport,
    obtenerResumenFotos,

    // Permisos
    puedeEditar,
    puedeEditarFirma,

    // Edicion general
    handleGuardarEdicionGeneral,
    handleCancelarEdicion
  } = useVisitaDetalle()

  // Loading state
  if (!visitaActual) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Estado de aprobacion - Banner
  const AprobacionBanner = () => {
    if (!visitaActual.aprobacion) return null

    const esAceptada = visitaActual.aprobacion.tipo === 'aceptada'

    return (
      <div className={`p-3 sm:p-4 md:p-6 rounded-lg mb-6 border-l-4 shadow-md ${
        esAceptada
          ? 'bg-green-50 border-green-500 border border-green-200'
          : 'bg-red-50 border-red-500 border border-red-200'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${esAceptada ? 'text-green-800' : 'text-red-800'}`}>
              {esAceptada ? 'Visita Aceptada' : 'Visita Rechazada'}
            </h3>
            {esAceptada && visitaActual.aprobacion.ordenCompra && (
              <p className="text-sm text-green-700 mt-1">
                Orden de compra: <span className="font-medium">{visitaActual.aprobacion.ordenCompra}</span>
              </p>
            )}
            {!esAceptada && visitaActual.aprobacion.motivo && (
              <p className="text-sm text-red-700 mt-1">
                Motivo: {visitaActual.aprobacion.motivo}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Por: {visitaActual.aprobacion.aprobadoPor || visitaActual.aprobacion.rechazadoPor} -
              {new Date(visitaActual.aprobacion.fecha).toLocaleString('es-PE')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <HeaderVisita
          visitaActual={visitaActual}
          user={user}
          editMode={editMode}
          setEditMode={setEditMode}
          tecnicosAsignados={tecnicosAsignados}
          setTecnicosAsignados={setTecnicosAsignados}
          tecnicos={tecnicos}
          puedeEditar={puedeEditar}
          handleGuardarEdicionGeneral={handleGuardarEdicionGeneral}
          handleCancelarEdicion={handleCancelarEdicion}
          handleAceptarVisita={handleAceptarVisita}
          handleRechazarVisita={handleRechazarVisita}
          generateVisitaTecnicaReport={generateVisitaTecnicaReport}
          obtenerResumenFotos={obtenerResumenFotos}
        />
      </div>

      {/* Banner de aprobacion */}
      <AprobacionBanner />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto gap-1 sm:gap-2" aria-label="Tabs">
          {['estado', 'materiales', 'herramientas', 'personal', 'completar', 'resumen'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'estado' && 'Estado del Lugar'}
              {tab === 'materiales' && 'Materiales'}
              {tab === 'herramientas' && 'Herramientas'}
              {tab === 'personal' && 'Personal'}
              {tab === 'completar' && 'Completar'}
              {tab === 'resumen' && 'Resumen'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'estado' && (
          <TabEstadoLugar
            visitaActual={visitaActual}
            estadoLugar={estadoLugar}
            setEstadoLugar={setEstadoLugar}
            editMode={editMode}
            setEditMode={setEditMode}
            handleGuardarEstadoLugar={handleGuardarEstadoLugar}
          />
        )}

        {activeTab === 'materiales' && (
          <TabMateriales
            user={user}
            visitaActual={visitaActual}
            materiales={materiales}
            nuevoMaterial={nuevoMaterial}
            setNuevoMaterial={setNuevoMaterial}
            inputMaterial={inputMaterial}
            mostrarDropdown={mostrarDropdown}
            materialDelInventario={materialDelInventario}
            editMode={editMode}
            handleInputMaterialChange={handleInputMaterialChange}
            handleSeleccionarMaterial={handleSeleccionarMaterial}
            handleFocusInput={handleFocusInput}
            handleBlurInput={handleBlurInput}
            handleAgregarMaterial={handleAgregarMaterial}
            handleEliminarMaterial={handleEliminarMaterial}
            handleAbrirModalEditarMaterial={handleAbrirModalEditarMaterial}
          />
        )}

        {activeTab === 'herramientas' && (
          <TabHerramientas
            user={user}
            herramientas={herramientas}
            herramientasInventario={herramientasInventario}
            nuevaHerramienta={nuevaHerramienta}
            setNuevaHerramienta={setNuevaHerramienta}
            herramientaSeleccionadaInventario={herramientaSeleccionadaInventario}
            inputHerramienta={inputHerramienta}
            mostrarDropdownHerramienta={mostrarDropdownHerramienta}
            editMode={editMode}
            handleInputHerramientaChange={handleInputHerramientaChange}
            handleSeleccionarHerramienta={handleSeleccionarHerramienta}
            handleFocusInputHerramienta={handleFocusInputHerramienta}
            handleBlurInputHerramienta={handleBlurInputHerramienta}
            handleAgregarHerramienta={handleAgregarHerramienta}
            handleEliminarHerramienta={handleEliminarHerramienta}
            handleGuardarHerramientas={handleGuardarHerramientas}
          />
        )}

        {activeTab === 'personal' && (
          <TabPersonal
            listaPersonal={listaPersonal}
            nuevaPersona={nuevaPersona}
            setNuevaPersona={setNuevaPersona}
            especialidadPersonalizada={especialidadPersonalizada}
            setEspecialidadPersonalizada={setEspecialidadPersonalizada}
            mostrarInputEspecialidad={mostrarInputEspecialidad}
            requerimientosAdicionales={requerimientosAdicionales}
            setRequerimientosAdicionales={setRequerimientosAdicionales}
            totalDiasEstimados={totalDiasEstimados}
            setTotalDiasEstimados={setTotalDiasEstimados}
            editMode={editMode}
            handleEspecialidadChange={handleEspecialidadChange}
            handleAgregarPersona={handleAgregarPersona}
            handleEliminarPersona={handleEliminarPersona}
            handleGuardarPersonal={handleGuardarPersonal}
            user={user}
            visitaActual={visitaActual}
            handleCargarTarifasPersonal={handleCargarTarifasPersonal}
            handleActualizarPrecioPersona={handleActualizarPrecioPersona}
            handleGuardarPreciosPersonal={handleGuardarPreciosPersonal}
          />
        )}

        {activeTab === 'completar' && (
          <TabCompletado
            visitaActual={visitaActual}
            user={user}
            datosCompletado={datosCompletado}
            setDatosCompletado={setDatosCompletado}
            canvasRef={canvasRef}
            isDrawing={isDrawing}
            showSignaturePad={showSignaturePad}
            setShowSignaturePad={setShowSignaturePad}
            editMode={editMode}
            puedeEditarFirma={puedeEditarFirma}
            handleCompletarVisita={handleCompletarVisita}
            startDrawing={startDrawing}
            draw={draw}
            stopDrawing={stopDrawing}
            clearSignature={clearSignature}
            saveSignature={saveSignature}
          />
        )}

        {activeTab === 'resumen' && (
          <TabResumen
            visitaActual={visitaActual}
            user={user}
            listaPersonal={listaPersonal}
            herramientas={herramientas}
            presupuestos={presupuestos}
            requerimientosAdicionales={requerimientosAdicionales}
            handleGenerarCotizacion={handleGenerarCotizacion}
          />
        )}
      </div>

      {/* Modal editar material */}
      <ModalEditarMaterial
        materialEditando={materialEditando}
        setMaterialEditando={setMaterialEditando}
        mostrarModalEditarMaterial={mostrarModalEditarMaterial}
        handleCerrarModalEditarMaterial={handleCerrarModalEditarMaterial}
        handleGuardarMaterialEditado={handleGuardarMaterialEditado}
      />
    </div>
  )
}

export default VisitaTecnicaDetalleRefactorizado
