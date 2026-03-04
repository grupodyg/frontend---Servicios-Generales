import { useState, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

const DateRangePicker = ({
  startDate,
  endDate,
  onRangeChange,
  minDate,
  maxDate,
  placeholder = 'Seleccionar rango de fechas'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(endDate || new Date())
  const [selecting, setSelecting] = useState('start') // 'start' o 'end'
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)
  const containerRef = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sincronizar con props
  useEffect(() => {
    setTempStart(startDate)
    setTempEnd(endDate)
  }, [startDate, endDate])

  const handleDayClick = (day) => {
    if (selecting === 'start') {
      setTempStart(day)
      setTempEnd(null)
      setSelecting('end')
    } else {
      // Si el día seleccionado es anterior al inicio, intercambiar
      if (tempStart && isBefore(day, tempStart)) {
        setTempEnd(tempStart)
        setTempStart(day)
      } else {
        setTempEnd(day)
      }
      setSelecting('start')
    }
  }

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onRangeChange({ startDate: tempStart, endDate: tempEnd })
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    setTempStart(null)
    setTempEnd(null)
    onRangeChange({ startDate: null, endDate: null })
    setSelecting('start')
  }

  const handlePreset = (preset) => {
    const today = new Date()
    let start, end

    switch (preset) {
      case 'today':
        start = today
        end = today
        break
      case 'week':
        start = subMonths(today, 0)
        start = new Date(today)
        start.setDate(today.getDate() - 7)
        end = today
        break
      case 'month':
        start = new Date(today)
        start.setDate(today.getDate() - 30)
        end = today
        break
      case 'quarter':
        start = new Date(today)
        start.setDate(today.getDate() - 90)
        end = today
        break
      case 'year':
        start = new Date(today)
        start.setFullYear(today.getFullYear() - 1)
        end = today
        break
      default:
        return
    }

    setTempStart(start)
    setTempEnd(end)
    onRangeChange({ startDate: start, endDate: end })
    setIsOpen(false)
  }

  // Generar días del mes
  const generateCalendarDays = (month) => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const days = generateCalendarDays(currentMonth)
  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

  const isInRange = (day) => {
    if (!tempStart || !tempEnd) return false
    return isWithinInterval(day, {
      start: isBefore(tempStart, tempEnd) ? tempStart : tempEnd,
      end: isAfter(tempEnd, tempStart) ? tempEnd : tempStart
    })
  }

  const isRangeStart = (day) => tempStart && isSameDay(day, tempStart)
  const isRangeEnd = (day) => tempEnd && isSameDay(day, tempEnd)

  const displayText = startDate && endDate
    ? `${format(startDate, 'dd/MM/yyyy', { locale: es })} - ${format(endDate, 'dd/MM/yyyy', { locale: es })}`
    : placeholder

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-field flex items-center justify-between min-w-0 sm:min-w-64 cursor-pointer hover:border-corporate-blue transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={startDate && endDate ? 'text-gray-900' : 'text-gray-500'}>
            {displayText}
          </span>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Calendar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-3 sm:p-4 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[340px] max-w-[340px]"
          >
            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100">
              <button onClick={() => handlePreset('today')} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 hover:bg-corporate-blue hover:text-white transition-colors">
                Hoy
              </button>
              <button onClick={() => handlePreset('week')} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 hover:bg-corporate-blue hover:text-white transition-colors">
                Última semana
              </button>
              <button onClick={() => handlePreset('month')} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 hover:bg-corporate-blue hover:text-white transition-colors">
                Último mes
              </button>
              <button onClick={() => handlePreset('quarter')} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 hover:bg-corporate-blue hover:text-white transition-colors">
                Último trimestre
              </button>
              <button onClick={() => handlePreset('year')} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 hover:bg-corporate-blue hover:text-white transition-colors">
                Último año
              </button>
            </div>

            {/* Selection indicator */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg ${selecting === 'start' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                <span className="text-[10px] sm:text-xs font-medium">Inicio:</span>
                <span className="text-xs sm:text-sm font-semibold">
                  {tempStart ? format(tempStart, 'dd/MM/yy', { locale: es }) : '--/--/--'}
                </span>
              </div>
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg ${selecting === 'end' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                <span className="text-[10px] sm:text-xs font-medium">Fin:</span>
                <span className="text-xs sm:text-sm font-semibold">
                  {tempEnd ? format(tempEnd, 'dd/MM/yy', { locale: es }) : '--/--/--'}
                </span>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h3>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isStart = isRangeStart(day)
                const isEnd = isRangeEnd(day)
                const inRange = isInRange(day) && !isStart && !isEnd
                const isToday = isSameDay(day, new Date())

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    disabled={!isCurrentMonth}
                    className={`
                      relative h-9 text-sm font-medium rounded-lg transition-all
                      ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                      ${isStart || isEnd ? 'bg-corporate-blue text-white hover:bg-corporate-blue' : ''}
                      ${inRange ? 'bg-blue-100 text-blue-700' : ''}
                      ${isToday && !isStart && !isEnd ? 'ring-2 ring-corporate-blue ring-inset' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={handleApply}
                disabled={!tempStart || !tempEnd}
                className="px-6 py-2 text-sm font-medium bg-corporate-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DateRangePicker
