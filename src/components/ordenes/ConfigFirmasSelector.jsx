import { TIPOS_FIRMA, ETIQUETAS_FIRMA, normalizarConfigFirmas } from '../../utils/firmasUtils'

/**
 * Interruptor Obligatoria / Opcional para una firma concreta.
 * `obligatoria` true = la firma es requerida en el flujo del informe final.
 */
export const ToggleFirmaObligatoria = ({ obligatoria, onChange, disabled = false, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={obligatoria}
    aria-label={label}
    disabled={disabled}
    onClick={() => !disabled && onChange(!obligatoria)}
    className={`inline-flex items-center gap-2 text-xs font-medium ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
  >
    <span className={obligatoria ? 'text-corporate-blue' : 'text-gray-500'}>
      {obligatoria ? 'Obligatoria' : 'Opcional'}
    </span>
    <span
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        obligatoria ? 'bg-corporate-blue' : 'bg-gray-300'
      }`}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
        style={{ transform: obligatoria ? 'translateX(18px)' : 'translateX(4px)' }}
      />
    </span>
  </button>
)

/**
 * Selector de firmas obligatorias/opcionales del informe final de una orden.
 * Siempre muestra las tres firmas (técnico, supervisor, administrador); cada una
 * puede marcarse como opcional para este trabajo concreto.
 *
 * @param {Object}   value    Configuración actual ({ tecnico, supervisor, administrador })
 * @param {Function} onChange Recibe la configuración completa actualizada
 * @param {boolean}  disabled Bloquea los interruptores
 */
const ConfigFirmasSelector = ({ value, onChange, disabled = false }) => {
  const config = normalizarConfigFirmas(value)

  const handleToggle = (tipo, obligatoria) => {
    onChange({ ...config, [tipo]: obligatoria })
  }

  return (
    <div className="space-y-2">
      {TIPOS_FIRMA.map(tipo => (
        <div
          key={tipo}
          className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <span className="text-sm text-gray-800">Firma del {ETIQUETAS_FIRMA[tipo]}</span>
          <ToggleFirmaObligatoria
            obligatoria={config[tipo]}
            onChange={(obligatoria) => handleToggle(tipo, obligatoria)}
            disabled={disabled}
            label={`Firma del ${ETIQUETAS_FIRMA[tipo]} obligatoria`}
          />
        </div>
      ))}
      <p className="text-xs text-gray-500">
        Las firmas opcionales se omiten en el flujo del informe final. El orden se mantiene: técnico → supervisor → administrador.
      </p>
    </div>
  )
}

export default ConfigFirmasSelector
