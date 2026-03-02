import { FC, useEffect, useMemo, useState } from 'react'
import { Accordion } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { Cliente, getClienteById } from '../../../../api/clientes'
import { ClienteProceso, getClienteProcesosByCliente, getClienteProcesosHabilitadosByCliente } from '../../../../api/clienteProcesos'
import { Proceso, getAllProcesos } from '../../../../api/procesos'
import { getClienteProcesoHitosByProceso, getClienteProcesoHitosHabilitadosByProceso, ClienteProcesoHito } from '../../../../api/clienteProcesoHitos'
import { Hito, getAllHitos } from '../../../../api/hitos'
import { getClienteProcesoHitoCumplimientosByHito, ClienteProcesoHitoCumplimiento } from '../../../../api/clienteProcesoHitoCumplimientos'
import { descargarDocumentosCumplimiento } from '../../../../api/documentosCumplimiento'
import CumplimentarHitoModal from './CumplimentarHitoModal'
import { atisaStyles, getSecondaryButtonStyles } from '../../../../styles/atisaStyles'
import { formatDateDisplay, formatDateTimeDisplay } from '../../../../utils/dateFormatter'

interface Props {
  clienteId: string
}

interface MonthButtonProps {
  periodo: string
  month: string
  isSelected: boolean
  onClick: (periodo: string) => void
  getMesName: (mes: number) => string
}

const MonthButton: FC<MonthButtonProps> = ({ periodo, month, isSelected, onClick, getMesName }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      className="btn btn-sm"
      style={{
        backgroundColor: isSelected ? atisaStyles.colors.secondary : (isHovered ? atisaStyles.colors.light : 'white'),
        color: isSelected ? 'white' : atisaStyles.colors.primary,
        border: `2px solid ${isSelected ? atisaStyles.colors.accent : (isHovered ? atisaStyles.colors.accent : atisaStyles.colors.light)}`,
        borderRadius: '8px',
        fontFamily: atisaStyles.fonts.secondary,
        fontWeight: '600',
        padding: '6px 16px',
        fontSize: '13px',
        transition: 'all 0.3s ease',
        boxShadow: isSelected ? '0 4px 12px rgba(156, 186, 57, 0.3)' : (isHovered ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'),
        whiteSpace: 'nowrap',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
      }}
      onClick={() => onClick(periodo)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {getMesName(parseInt(month))}
    </button>
  )
}

const CalendarioCliente: FC<Props> = ({ clienteId }) => {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [procesos, setProcesos] = useState<ClienteProceso[]>([])
  const [procesosList, setProcesosList] = useState<Proceso[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [hitosPorProceso, setHitosPorProceso] = useState<Record<number, ClienteProcesoHito[]>>({})
  const [loadingHitos, setLoadingHitos] = useState(false)
  const [hitosMaestro, setHitosMaestro] = useState<Hito[]>([])
  const [showCumplimentarHito, setShowCumplimentarHito] = useState(false)
  const [hitoSeleccionado, setHitoSeleccionado] = useState<ClienteProcesoHito | null>(null)
  const [showObservacionModal, setShowObservacionModal] = useState(false)
  const [observacionSeleccionada, setObservacionSeleccionada] = useState('')
  const [cumplimientosPorHito, setCumplimientosPorHito] = useState<Record<number, ClienteProcesoHitoCumplimiento[]>>({})
  const [showConfirmacionModal1, setShowConfirmacionModal1] = useState(false)
  const [busquedaNombre, setBusquedaNombre] = useState('')
  const [debouncedBusqueda, setDebouncedBusqueda] = useState('')
  const [filtrosActivos, setFiltrosActivos] = useState<Set<'vencido' | 'hoy' | 'mañana' | 'en_plazo' | 'cumplido_plazo' | 'cumplido_fuera'>>(new Set())
  const [claveFiltro, setClaveFiltro] = useState('')
  const [obligatorioFiltro, setObligatorioFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [sortField, setSortField] = useState<'hito' | 'estado' | 'fecha_actualizacion' | 'fecha_limite' | 'hora_limite' | 'responsable' | 'fecha_cumplimiento'>('fecha_limite')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [activeKeys, setActiveKeys] = useState<string[]>([])
  const [todosAbiertos, setTodosAbiertos] = useState(false)
  const [downloadingCumplimientoId, setDownloadingCumplimientoId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    getClienteById(clienteId).then(setCliente)
    getClienteProcesosHabilitadosByCliente(clienteId).then(res => setProcesos(res.clienteProcesos || []))
    getAllProcesos().then(res => setProcesosList(res.procesos || []))
    getAllHitos().then((res) => setHitosMaestro(res.hitos || []))
  }, [clienteId])

  // Obtener años y periodos disponibles
  const { availableYears, periodosDelAnio } = useMemo(() => {
    const years = new Set<number>()
    const periodsSet = new Set<string>()

    procesos.forEach(p => {
      if (p.anio) {
        years.add(p.anio)
        if (selectedYear && p.anio === selectedYear && p.mes) {
          periodsSet.add(`${p.anio}-${p.mes.toString().padStart(2, '0')}`)
        }
      }
    })

    // Si no hay años con datos, mostramos el año actual por defecto
    if (years.size === 0) {
      years.add(new Date().getFullYear())
    }

    // Convertir periodos a array y ordenar
    const periodsList = Array.from(periodsSet).sort((a, b) => {
      const [, monthA] = a.split('-').map(Number)
      const [, monthB] = b.split('-').map(Number)
      return monthA - monthB
    })

    return {
      availableYears: Array.from(years).sort((a, b) => b - a),
      periodosDelAnio: periodsList
    }
  }, [procesos, selectedYear])

  // Asegurar que el año seleccionado sea válido o inicializarlo
  useEffect(() => {
    const getClosestYear = (target: number, years: number[]) => {
      return years.reduce((prev, curr) =>
        Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
      )
    }

    const currentYear = new Date().getFullYear()

    if (availableYears.length > 0) {
      // Caso 1: No hay año seleccionado
      if (selectedYear === null) {
        if (availableYears.includes(currentYear)) {
          setSelectedYear(currentYear)
        } else {
          setSelectedYear(getClosestYear(currentYear, availableYears))
        }
      }
      // Caso 2: El año seleccionado ya no es válido (ej. cambio de datos)
      else if (!availableYears.includes(selectedYear)) {
        setSelectedYear(getClosestYear(currentYear, availableYears))
      }
    }
  }, [availableYears, selectedYear])

  // Seleccionar periodo por defecto al cambiar de año
  useEffect(() => {
    if (periodosDelAnio.length > 0) {
      if (!periodosDelAnio.includes(selectedPeriod)) {
        // Intentar seleccionar el mes actual si está disponible en el año seleccionado
        const now = new Date()
        const currentMonth = (now.getUTCMonth() + 1).toString().padStart(2, '0')
        const currentPeriod = `${selectedYear}-${currentMonth}`

        if (periodosDelAnio.includes(currentPeriod)) {
          setSelectedPeriod(currentPeriod)
        } else {
          setSelectedPeriod(periodosDelAnio[0])
        }
      }
    } else {
      setSelectedPeriod('')
    }
  }, [selectedYear, periodosDelAnio])
  // Debounce para búsqueda por nombre de hito
  useEffect(() => {
    const normalizeText = (text: string) =>
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    const id = setTimeout(() => setDebouncedBusqueda(normalizeText(busquedaNombre)), 300)
    return () => clearTimeout(id)
  }, [busquedaNombre])

  // Función para descargar documentos de un cumplimiento
  const handleDescargarDocumentos = async (cumplimientoId: number) => {
    try {
      setDownloadingCumplimientoId(cumplimientoId)
      const blob = await descargarDocumentosCumplimiento(cumplimientoId)

      // Crear URL del blob
      const url = window.URL.createObjectURL(blob)

      // Crear enlace temporal para descarga
      const link = document.createElement('a')
      link.href = url
      link.download = `documentos-cumplimiento-${cumplimientoId}.zip`
      link.style.display = 'none'

      // Agregar al DOM, hacer clic y limpiar
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Liberar la URL del blob
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar documentos:', error)
      alert('Error al descargar los documentos. Por favor, inténtalo de nuevo.')
    } finally {
      setDownloadingCumplimientoId(null)
    }
  }

  // Función para cargar todos los hitos de los procesos
  const cargarHitosDeProcesos = async (procesosACarga: ClienteProceso[]) => {
    if (procesosACarga.length === 0) {
      setHitosPorProceso({})
      setCumplimientosPorHito({})
      return
    }

    setLoadingHitos(true)
    const hitosMap: Record<number, ClienteProcesoHito[]> = {}

    try {
      // Cargar hitos habilitados para todos los procesos en paralelo
      const hitosPromises = procesosACarga.map(proceso =>
        getClienteProcesoHitosHabilitadosByProceso(proceso.id)
          .then(hitosData => ({ procesoId: proceso.id, hitos: hitosData }))
          .catch(() => ({ procesoId: proceso.id, hitos: [] }))
      )

      const resultadosHitos = await Promise.all(hitosPromises)

      // Organizar hitos por proceso y obtener lista plana de todos los hitos
      const todosLosHitos: ClienteProcesoHito[] = []

      resultadosHitos.forEach(({ procesoId, hitos }) => {
        hitosMap[procesoId] = hitos.sort((a, b) =>
          new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime()
        )
        todosLosHitos.push(...hitos)
      })

      // Cargar cumplimientos también antes de terminar la carga
      const cumplimientosMap: Record<number, ClienteProcesoHitoCumplimiento[]> = {}

      if (todosLosHitos.length > 0) {
        const cumplimientosPromises = todosLosHitos.map(hito =>
          getClienteProcesoHitoCumplimientosByHito(hito.id, 0, 1, 'id', 'desc')
            .then(cumplimientos => ({ hitoId: hito.id, cumplimientos: cumplimientos || [] }))
            .catch((error) => {
              console.warn(`Error cargando cumplimientos para hito ${hito.id}:`, error)
              return { hitoId: hito.id, cumplimientos: [] }
            })
        )

        const resultadosCumplimientos = await Promise.all(cumplimientosPromises)

        resultadosCumplimientos.forEach(({ hitoId, cumplimientos }) => {
          cumplimientosMap[hitoId] = cumplimientos || []
        })
      }

      // Actualizar estados "de golpe" solo cuando todo esté listo
      setHitosPorProceso(hitosMap)
      setCumplimientosPorHito(cumplimientosMap)

    } catch (error) {
      console.error('Error cargando hitos:', error)
      setHitosPorProceso({})
      setCumplimientosPorHito({})
    } finally {
      setLoadingHitos(false)
    }
  }

  // Navegación de períodos eliminada a petición

  // Función separada para cargar cumplimientos de forma asíncrona
  const cargarCumplimientosAsync = async (hitosMap: Record<number, ClienteProcesoHito[]>) => {
    try {
      const cumplimientosMap: Record<number, ClienteProcesoHitoCumplimiento[]> = {}
      const todosLosHitos = Object.values(hitosMap).flat()

      if (todosLosHitos.length > 0) {
        const cumplimientosPromises = todosLosHitos.map(hito =>
          getClienteProcesoHitoCumplimientosByHito(hito.id, 0, 1, 'id', 'desc')
            .then(cumplimientos => ({ hitoId: hito.id, cumplimientos: cumplimientos || [] }))
            .catch((error) => {
              console.warn(`Error cargando cumplimientos para hito ${hito.id}:`, error)
              return { hitoId: hito.id, cumplimientos: [] }
            })
        )

        const resultadosCumplimientos = await Promise.all(cumplimientosPromises)

        // Organizar cumplimientos por hito (ya vienen ordenados de la API)
        resultadosCumplimientos.forEach(({ hitoId, cumplimientos }) => {
          cumplimientosMap[hitoId] = cumplimientos || []
        })

        setCumplimientosPorHito(cumplimientosMap)
      } else {
        setCumplimientosPorHito({})
      }
    } catch (error) {
      console.warn('Error cargando cumplimientos (no bloqueante):', error)
      // No limpiar cumplimientos existentes en caso de error
    }
  }
  // Memoizar texto de última fecha/hora de cumplimiento por hito
  const ultimaFechaCumplimientoFmt = useMemo(() => {
    const result: Record<number, string> = {}
    Object.entries(cumplimientosPorHito).forEach(([hitoIdStr, cumplimientos]) => {
      const hitoId = parseInt(hitoIdStr, 10)
      if (!cumplimientos || cumplimientos.length === 0) {
        result[hitoId] = '-'
        return
      }
      try {
        const ultimo = cumplimientos[0]
        if (!ultimo.fecha || !ultimo.hora) {
          result[hitoId] = '-'
          return
        }
        let hhmm = ultimo.hora
        if (hhmm.includes(':')) {
          const p = hhmm.split(':')
          hhmm = `${p[0]}:${p[1]}`
        }
        const fecha = new Date(`${ultimo.fecha}T${hhmm}:00`)
        if (isNaN(fecha.getTime())) {
          result[hitoId] = '-'
          return
        }
        result[hitoId] = formatDateTimeDisplay(fecha)
      } catch {
        result[hitoId] = '-'
      }
    })
    return result
  }, [cumplimientosPorHito])

  // Agrupar procesos por tipo y subgrupar por período
  const groupedProcesos = useMemo(() => {
    const groups = procesos.reduce((acc, proceso) => {
      const procesoInfo = procesosList.find(p => p.id === proceso.proceso_id)
      const key = procesoInfo?.nombre || `Proceso ${proceso.proceso_id}`
      if (!acc[key]) {
        acc[key] = {
          items: [],
          periodos: {}
        }
      }
      acc[key].items.push(proceso)
      const mes = proceso.mes?.toString().padStart(2, '0')
      const periodoKey = `${proceso.anio}-${mes}`
      if (!acc[key].periodos[periodoKey]) {
        acc[key].periodos[periodoKey] = {
          anio: proceso.anio,
          mes: proceso.mes,
          items: []
        }
      }
      acc[key].periodos[periodoKey].items.push(proceso)
      return acc
    }, {} as Record<string, {
      items: ClienteProceso[],
      periodos: Record<string, {
        anio: number | null,
        mes: number | null,
        items: ClienteProceso[]
      }>
    }>)

    Object.keys(groups).forEach(key => {
      Object.values(groups[key].periodos).forEach(periodo => {
        periodo.items.sort((a, b) =>
          new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
        )
      })
      groups[key].periodos = Object.fromEntries(
        Object.entries(groups[key].periodos)
          .sort(([, a], [, b]) => {
            if (a.anio !== b.anio) return (b.anio || 0) - (a.anio || 0)
            return (a.mes || 0) - (b.mes || 0)
          })
      )
    })

    return groups
  }, [procesos, procesosList])

  // Cargar hitos cuando cambien los procesos filtrados por período
  useEffect(() => {
    if (selectedPeriod && Object.keys(groupedProcesos).length > 0) {
      const procesosVisibles: ClienteProceso[] = []
      Object.values(groupedProcesos).forEach(grupo => {
        const periodoData = grupo.periodos[selectedPeriod]
        if (periodoData) {
          procesosVisibles.push(...periodoData.items)
        }
      })
      cargarHitosDeProcesos(procesosVisibles)
      // Resetear el estado de acordeones cuando cambia el año
      setActiveKeys([])
      setTodosAbiertos(false)
    }
  }, [selectedPeriod, groupedProcesos])

  const getMesName = (mes: number) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || '-'
  }

  const getNombreHito = (hito_id: number) => {
    const hito = hitosMaestro.find(h => h.id === hito_id)
    return hito ? hito.nombre : `Hito ${hito_id}`
  }

  const formatDate = (date: string) => {
    return formatDateDisplay(date)
  }

  const formatDateWithTime = (date: string) => {
    return formatDateTimeDisplay(date)
  }

  const formatTime = (time: string | null) => {
    if (!time) return '-'

    // Si ya está en formato HH:MM, devolverlo tal como está
    if (time.match(/^\d{2}:\d{2}$/)) {
      return time
    }

    // Si viene en otro formato, intentar parsearlo
    try {
      const date = new Date(`1970-01-01T${time}`)
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return time // Si no se puede parsear, devolver el valor original
    }
  }

  const getUltimaFechaCumplimiento = (hitoId: number) => {
    const cumplimientos = cumplimientosPorHito[hitoId]
    if (!cumplimientos || cumplimientos.length === 0) {
      return '-'
    }

    try {
      const ultimoCumplimiento = cumplimientos[0] // Ya están ordenados por fecha descendente

      // Validar que tenemos fecha y hora
      if (!ultimoCumplimiento.fecha || !ultimoCumplimiento.hora) {
        return '-'
      }

      // Manejar formato de hora HH:MM:SS o HH:MM
      let horaFormateada = ultimoCumplimiento.hora
      if (horaFormateada.includes(':')) {
        const partes = horaFormateada.split(':')
        horaFormateada = `${partes[0]}:${partes[1]}` // Solo tomar HH:MM
      }

      // Crear fecha completa y formatearla
      const fechaCompleta = `${ultimoCumplimiento.fecha}T${horaFormateada}:00`
      const fecha = new Date(fechaCompleta)

      // Verificar que la fecha es válida
      if (isNaN(fecha.getTime())) {
        return '-'
      }

      return formatDateTimeDisplay(fecha)
    } catch (error) {
      console.warn('Error formateando fecha de cumplimiento:', error)
      return '-'
    }
  }

  // Determinar estado temporal del hito respecto a hoy (UTC)
  const getEstadoVencimiento = (fechaLimite?: string | null, estado?: string) => {
    if (!fechaLimite) return 'sin_fecha'
    if (estado === 'Finalizado') return 'finalizado'
    try {
      const hoy = new Date()
      const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
      const [y, m, d] = fechaLimite.split('-').map(Number)
      const fecha = new Date(Date.UTC(y, m - 1, d))
      if (fecha.getTime() < hoyUTC.getTime()) return 'vencido'
      if (fecha.getTime() === hoyUTC.getTime()) return 'hoy'
      return 'en_plazo'
    } catch {
      return 'en_plazo'
    }
  }

  // Determinar si un hito vence mañana
  const venceMañana = (fechaLimite?: string | null) => {
    if (!fechaLimite) return false
    try {
      const hoy = new Date()
      const mañanaUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 1))
      const [y, m, d] = fechaLimite.split('-').map(Number)
      const fecha = new Date(Date.UTC(y, m - 1, d))
      return fecha.getTime() === mañanaUTC.getTime()
    } catch {
      return false
    }
  }

  // ¿Vence hoy en <= N horas? Ignora horas vacías o "00:00"
  const esUrgenteEnHoras = (fechaLimite?: string | null, horaLimite?: string | null, horas: number = 2) => {
    if (!fechaLimite || !horaLimite || horaLimite.startsWith('00:00')) return false
    try {
      const ahora = new Date()
      const hoyUTC = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()))
      const [y, m, d] = fechaLimite.split('-').map(Number)
      const fechaUTC = new Date(Date.UTC(y, m - 1, d))
      // Debe ser hoy
      if (fechaUTC.getTime() !== hoyUTC.getTime()) return false

      // Construir Date de vencimiento hoy con hora límite en local (mostrar urgencia relativa al usuario)
      const [hh, mm] = (horaLimite.includes(':') ? horaLimite : `${horaLimite}:00`).split(':').map(Number)
      const vencimiento = new Date()
      vencimiento.setHours(hh || 0, mm || 0, 0, 0)
      const diffMs = vencimiento.getTime() - Date.now()
      const limiteMs = horas * 60 * 60 * 1000
      return diffMs >= 0 && diffMs <= limiteMs
    } catch {
      return false
    }
  }
  // Funciones para manejar filtros múltiples
  const toggleFiltroVencimiento = (filtro: 'vencido' | 'hoy' | 'mañana' | 'en_plazo' | 'cumplido_plazo' | 'cumplido_fuera') => {
    const nuevosFiltros = new Set(filtrosActivos)

    if (nuevosFiltros.has(filtro)) {
      // Si el filtro ya está activo, lo removemos
      nuevosFiltros.delete(filtro)
    } else {
      // Si el filtro no está activo, lo agregamos
      nuevosFiltros.add(filtro)
    }

    setFiltrosActivos(nuevosFiltros)
  }

  const activarTodos = () => {
    setFiltrosActivos(new Set())
    setClaveFiltro('')
    setObligatorioFiltro('')
  }

  // Función para limpiar filtros de fecha
  const limpiarFiltrosFecha = () => {
    setFechaDesde('')
    setFechaHasta('')
  }

  // Predicados de filtros rápidos
  const coincideVencimiento = (h: ClienteProcesoHito) => {
    // Si no hay filtros activos, mostrar todos
    if (filtrosActivos.size === 0) return true

    // Verificar si el hito coincide con alguno de los filtros activos
    return Array.from(filtrosActivos).some(filtro => {
      // Filtros de cumplimiento
      if (filtro === 'cumplido_plazo') {
        return h.estado === 'Finalizado' && !isFinalizadoFueraDePlazo(h)
      }
      if (filtro === 'cumplido_fuera') {
        return h.estado === 'Finalizado' && isFinalizadoFueraDePlazo(h)
      }

      // Filtros de pendientes
      if (h.estado === 'Finalizado') return false // Si está finalizado y no es uno de los filtros anteriores, no coincide

      if (filtro === 'mañana') {
        return h.estado === 'Nuevo' && venceMañana(h.fecha_limite)
      }
      const ev = getEstadoVencimiento(h.fecha_limite, h.estado)
      return ev === filtro
    })
  }

  // Función para filtrar por fechas límite
  const coincideFechaLimite = (h: ClienteProcesoHito) => {
    if (!fechaDesde && !fechaHasta) return true
    if (!h.fecha_limite) return false

    try {
      const fechaLimite = new Date(h.fecha_limite)
      if (isNaN(fechaLimite.getTime())) return false

      if (fechaDesde) {
        const desde = new Date(fechaDesde)
        if (fechaLimite < desde) return false
      }

      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        hasta.setHours(23, 59, 59, 999) // Incluir todo el día
        if (fechaLimite > hasta) return false
      }

      return true
    } catch {
      return false
    }
  }

  // Función para filtrar por criticidad
  const coincideCritico = (h: ClienteProcesoHito) => {
    if (claveFiltro === '') return true
    return String(!!h.critico) === claveFiltro
  }

  // Función para filtrar por obligatoriedad
  const coincideObligatorio = (h: ClienteProcesoHito) => {
    if (obligatorioFiltro === '') return true
    return String(!!h.obligatorio) === obligatorioFiltro
  }

  // Determinar si fue finalizado fuera de plazo (último cumplimiento > fecha límite + hora límite)
  const getUltimoCumplimientoDate = (hitoId: number): Date | null => {
    const lista = cumplimientosPorHito[hitoId]
    if (!lista || lista.length === 0) return null
    const c = lista[0]
    if (!c.fecha) return null
    const horaStr = c.hora ? (c.hora.includes(':') ? c.hora : `${c.hora}:00`) : '00:00'
    const dt = new Date(`${c.fecha}T${horaStr.length === 5 ? horaStr + ':00' : horaStr}`)
    return isNaN(dt.getTime()) ? null : dt
  }

  const getFechaLimiteDate = (fechaLimite?: string | null, horaLimite?: string | null): Date | null => {
    if (!fechaLimite) return null
    const horaStr = horaLimite && !horaLimite.startsWith('00:00')
      ? (horaLimite.includes(':') ? horaLimite : `${horaLimite}:00`)
      : '23:59:59'
    const dt = new Date(`${fechaLimite}T${horaStr.length === 5 ? horaStr + ':00' : horaStr}`)
    return isNaN(dt.getTime()) ? null : dt
  }

  const isFinalizadoFueraDePlazo = (h: ClienteProcesoHito): boolean => {
    if (h.estado !== 'Finalizado') return false
    const ult = getUltimoCumplimientoDate(h.id)
    const limite = getFechaLimiteDate(h.fecha_limite, h.hora_limite)
    if (!ult || !limite) return false
    return ult.getTime() > limite.getTime()
  }

  // Función para manejar el ordenamiento
  const handleSort = (field: 'hito' | 'estado' | 'fecha_actualizacion' | 'fecha_limite' | 'hora_limite' | 'responsable' | 'fecha_cumplimiento') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (field: 'hito' | 'estado' | 'fecha_actualizacion' | 'fecha_limite' | 'hora_limite' | 'responsable' | 'fecha_cumplimiento') => {
    if (sortField !== field) {
      return (
        <i
          className="bi bi-arrow-down-up"
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginLeft: '6px'
          }}
        />
      )
    }
    return (
      <i
        className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`}
        style={{
          fontSize: '12px',
          color: 'white',
          marginLeft: '6px',
          fontWeight: 'bold'
        }}
      />
    )
  }

  // Función para ordenar los hitos
  const sortHitos = (hitos: ClienteProcesoHito[]): ClienteProcesoHito[] => {
    const sorted = [...hitos].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'hito':
          const nombreA = getNombreHito(a.hito_id).toLowerCase()
          const nombreB = getNombreHito(b.hito_id).toLowerCase()
          comparison = nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' })
          break

        case 'estado':
          const estadoA = a.estado || ''
          const estadoB = b.estado || ''
          comparison = estadoA.localeCompare(estadoB, 'es', { sensitivity: 'base' })
          break

        case 'fecha_actualizacion':
          const fechaEstA = a.fecha_estado ? new Date(a.fecha_estado).getTime() : 0
          const fechaEstB = b.fecha_estado ? new Date(b.fecha_estado).getTime() : 0
          comparison = fechaEstA - fechaEstB
          break

        case 'fecha_limite':
          const fechaLimA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0
          const fechaLimB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0
          comparison = fechaLimA - fechaLimB
          // Si las fechas son iguales, ordenar por hora límite
          if (comparison === 0) {
            const horaA = a.hora_limite ? (a.hora_limite.includes(':') ? a.hora_limite : `${a.hora_limite}:00`) : '00:00:00'
            const horaB = b.hora_limite ? (b.hora_limite.includes(':') ? b.hora_limite : `${b.hora_limite}:00`) : '00:00:00'
            const [hA, mA] = horaA.split(':').map(Number)
            const [hB, mB] = horaB.split(':').map(Number)
            comparison = (hA * 60 + mA) - (hB * 60 + mB)
          }
          break

        case 'hora_limite':
          const horaA = a.hora_limite ? (a.hora_limite.includes(':') ? a.hora_limite : `${a.hora_limite}:00`) : '00:00:00'
          const horaB = b.hora_limite ? (b.hora_limite.includes(':') ? b.hora_limite : `${b.hora_limite}:00`) : '00:00:00'
          const [hA, mA] = horaA.split(':').map(Number)
          const [hB, mB] = horaB.split(':').map(Number)
          comparison = (hA * 60 + mA) - (hB * 60 + mB)
          // Si las horas son iguales, ordenar por fecha límite
          if (comparison === 0) {
            const fechaLimA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0
            const fechaLimB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0
            comparison = fechaLimA - fechaLimB
          }
          break

        case 'responsable':
          const tipoA = a.tipo || ''
          const tipoB = b.tipo || ''
          comparison = tipoA.localeCompare(tipoB, 'es', { sensitivity: 'base' })
          break

        case 'fecha_cumplimiento':
          const fechaCumplA = getUltimoCumplimientoDate(a.id)
          const fechaCumplB = getUltimoCumplimientoDate(b.id)
          const timeA = fechaCumplA ? fechaCumplA.getTime() : 0
          const timeB = fechaCumplB ? fechaCumplB.getTime() : 0
          comparison = timeA - timeB
          break

        default:
          return 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }

  // Recargar hitos después de subir documento
  const handleUploadSuccess = async () => {
    if (selectedPeriod && Object.keys(groupedProcesos).length > 0) {
      const procesosVisibles: ClienteProceso[] = []
      Object.values(groupedProcesos).forEach(grupo => {
        const periodoData = grupo.periodos[selectedPeriod]
        if (periodoData) {
          procesosVisibles.push(...periodoData.items)
        }
      })
      await cargarHitosDeProcesos(procesosVisibles)
    }
  }

  const handleMostrarObservacion = (observacion: string) => {
    setObservacionSeleccionada(observacion)
    setShowObservacionModal(true)
  }

  return (
    <div
      style={{
        fontFamily: atisaStyles.fonts.secondary,
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header del calendario */}
      <header
        style={{
          background: 'linear-gradient(135deg, #00505c 0%, #007b8a 100%)',
          color: 'white',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 80, 92, 0.15)',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: '100%'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem', width: '100%' }}>
          {/* Columna izquierda: Botón Volver */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              className="btn"
              onClick={() => navigate('/clientes-documental-calendario')}
              style={getSecondaryButtonStyles()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = atisaStyles.colors.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'white'
              }}
            >
              <i className="bi bi-arrow-left" style={{ color: 'inherit' }}></i>
              Volver a Gestor Documental / Clientes
            </button>
          </div>

          {/* Columna centro: Título */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2
              style={{
                fontFamily: atisaStyles.fonts.primary,
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
                fontSize: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <i className="bi bi-calendar3" style={{ color: 'white' }}></i>
              Calendario de Procesos
            </h2>
            <p
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                color: atisaStyles.colors.light,
                margin: '8px 0 0 0',
                fontSize: '1.2rem',
                fontWeight: '500'
              }}
            >
              {cliente?.razsoc || clienteId}
            </p>
          </div>

          {/* Columna derecha: Botones Ver Status y Ver Histórico */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
            {/* Badge de filtros activos */}
            {(filtrosActivos.size > 0 || fechaDesde || fechaHasta || busquedaNombre || claveFiltro || obligatorioFiltro) && (
              <span style={{
                backgroundColor: '#f1416c',
                color: 'white',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {[
                  filtrosActivos.size,
                  fechaDesde ? 1 : 0,
                  fechaHasta ? 1 : 0,
                  busquedaNombre ? 1 : 0,
                  claveFiltro ? 1 : 0,
                  obligatorioFiltro ? 1 : 0
                ].reduce((a, b) => a + b, 0)} filtros activos
              </span>
            )}
            <button
              className="btn"
              onClick={() => setShowFilters(true)}
              style={{
                backgroundColor: showFilters ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontFamily: atisaStyles.fonts.secondary,
                fontWeight: '600',
                padding: '12px 16px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="bi bi-funnel"></i>
              Filtros
            </button>
            <button
              className="btn"
              onClick={() => navigate(`/status-cliente/${clienteId}`)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontFamily: atisaStyles.fonts.secondary,
                fontWeight: '600',
                padding: '12px 20px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <i className="bi bi-info-circle" style={{ color: 'white' }}></i>
              Ver Status
            </button>
            <button
              className="btn"
              onClick={() => navigate(`/historico-cumplimientos/${clienteId}`)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontFamily: atisaStyles.fonts.secondary,
                fontWeight: '600',
                padding: '12px 20px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <i className="bi bi-clock-history" style={{ color: 'white' }}></i>
              Ver Histórico
            </button>
          </div>
        </div>

        {/* Selector de Año y Periodos Integrado */}
        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <label
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="bi bi-calendar-event me-2"></i>
                Año:
              </label>
              <select
                className="form-select w-auto"
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '6px 32px 6px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year} style={{ color: 'black' }}>{year}</option>
                ))}
              </select>
            </div>

            <div className="vr mx-2 bg-white" style={{ height: 24, opacity: 0.3, flexShrink: 0 }}></div>

            {/* Lista de meses horizontal */}
            <div className="d-flex overflow-auto align-items-center" style={{ scrollbarWidth: 'thin', gap: '8px', flexGrow: 1 }}>
              {periodosDelAnio.map((periodo) => {
                const [, month] = periodo.split('-')
                const isSelected = selectedPeriod === periodo
                return (
                  <button
                    key={periodo}
                    onClick={() => setSelectedPeriod(periodo)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: isSelected ? 'white' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? atisaStyles.colors.primary : 'white',
                      border: isSelected ? '1px solid white' : '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '20px',
                      padding: '6px 16px',
                      fontWeight: 600,
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                      }
                    }}
                  >
                    {getMesName(parseInt(month))}
                  </button>
                )
              })}
            </div>

            <div className="vr mx-2 bg-white" style={{ height: 24, opacity: 0.3, flexShrink: 0 }}></div>

            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="header-abrir-todos"
                checked={todosAbiertos}
                onChange={(e) => {
                  const abrir = e.target.checked
                  setTodosAbiertos(abrir)
                  if (abrir) {
                    const procesosVisibles = Object.entries(groupedProcesos)
                      .map(([, grupo], idx) => {
                        const procesosFiltrados = selectedPeriod
                          ? Object.entries(grupo.periodos).filter(([key]) => key === selectedPeriod)
                          : []
                        return procesosFiltrados.length > 0 ? idx.toString() : null
                      })
                      .filter((key): key is string => key !== null)
                    setActiveKeys(procesosVisibles)
                  } else {
                    setActiveKeys([])
                  }
                }}
                style={{
                  cursor: 'pointer',
                  width: '18px',
                  height: '18px',
                  margin: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)'
                }}
              />
              <label
                className="form-check-label"
                htmlFor="header-abrir-todos"
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '13px',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  margin: 0,
                  userSelect: 'none'
                }}
              >
                Abrir todos
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay transparente */}
      {showFilters && (
        <div
          onClick={() => setShowFilters(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'transparent',
            zIndex: 1040,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Panel lateral de filtros (Drawer) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: showFilters ? 0 : '-480px',
          width: '460px',
          height: '100vh',
          background: 'linear-gradient(160deg, #00505c 0%, #007b8a 100%)',
          boxShadow: showFilters ? '-8px 0 40px rgba(0,0,0,0.25)' : 'none',
          zIndex: 1050,
          transition: 'right 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        {/* Cabecera del drawer */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="bi bi-funnel-fill" style={{ color: 'white', fontSize: '18px' }}></i>
            <span style={{ color: 'white', fontFamily: atisaStyles.fonts.primary, fontWeight: '700', fontSize: '1.2rem' }}>Filtros</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-sm"
              onClick={() => {
                activarTodos()
                limpiarFiltrosFecha()
                setBusquedaNombre('')
                setClaveFiltro('')
                setObligatorioFiltro('')
                setTodosAbiertos(false)
                setActiveKeys([])
              }}
              title="Limpiar filtros"
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)', fontWeight: '600', padding: '6px 12px' }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <button
              onClick={() => setShowFilters(false)}
              title="Cerrar"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>

        {/* Contenido del drawer */}
        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Búsqueda */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Búsqueda</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)' }}></i>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre..."
                value={busquedaNombre}
                onChange={(e) => setBusquedaNombre(e.target.value)}
                style={{ paddingLeft: '36px', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Límite Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Límite Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Estado del Hito */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', display: 'block' }}>Estado del Hito</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <div
                onClick={activarTodos}
                style={{
                  cursor: 'pointer',
                  backgroundColor: filtrosActivos.size === 0 ? 'white' : 'rgba(255,255,255,0.1)',
                  color: filtrosActivos.size === 0 ? atisaStyles.colors.primary : 'white',
                  border: '1px solid white',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                Todos
              </div>
              {[
                { id: 'cumplido_plazo', label: 'Cumplido en Plazo', color: '#50cd89' },
                { id: 'cumplido_fuera', label: 'Cumplido Fuera de Plazo', color: '#ffc107' },
                { id: 'hoy', label: 'Vence Hoy', color: '#009ef7' },
                { id: 'mañana', label: 'Vence Mañana', color: '#8b5cf6' },
                { id: 'en_plazo', label: 'Pendiente en Plazo', color: '#7239ea' },
                { id: 'vencido', label: 'Pendiente Fuera de Plazo', color: '#f1416c' }
              ].map((estado) => {
                const isSelected = filtrosActivos.has(estado.id as any)
                return (
                  <div
                    key={estado.id}
                    onClick={() => toggleFiltroVencimiento(estado.id as any)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? estado.color : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: `1px solid ${estado.color}`,
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      opacity: isSelected ? 1 : 0.65,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {estado.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Crítico / Obligatorio */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'block' }}>Características del hito</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { value: '', label: 'Todos', icon: 'bi-list-ul' },
                { value: 'true', label: 'Crítico', icon: 'bi-exclamation-triangle-fill', color: atisaStyles.colors.error },
                { value: 'false', label: 'No crítico', icon: 'bi-check-circle', color: 'rgba(255,255,255,0.5)' },
              ].map(opt => (
                <div
                  key={`crit-${opt.value}`}
                  onClick={() => setClaveFiltro(opt.value)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: claveFiltro === opt.value ? (opt.color || 'white') : 'rgba(255,255,255,0.1)',
                    color: claveFiltro === opt.value ? (opt.color ? 'white' : atisaStyles.colors.primary) : 'white',
                    border: `1px solid ${opt.color || 'white'}`,
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    opacity: claveFiltro === opt.value ? 1 : 0.65,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <i className={`bi ${opt.icon}`} style={{ fontSize: '11px' }}></i>
                  {opt.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {[
                { value: '', label: 'Todos', icon: 'bi-list-ul' },
                { value: 'true', label: 'Obligatorio', icon: 'bi-asterisk', color: atisaStyles.colors.accent },
                { value: 'false', label: 'No obligatorio', icon: 'bi-x-circle', color: 'rgba(255,255,255,0.5)' },
              ].map(opt => (
                <div
                  key={`obl-${opt.value}`}
                  onClick={() => setObligatorioFiltro(opt.value)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: obligatorioFiltro === opt.value ? (opt.color || 'white') : 'rgba(255,255,255,0.1)',
                    color: obligatorioFiltro === opt.value ? (opt.color ? 'white' : atisaStyles.colors.primary) : 'white',
                    border: `1px solid ${opt.color || 'white'}`,
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    opacity: obligatorioFiltro === opt.value ? 1 : 0.65,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <i className={`bi ${opt.icon}`} style={{ fontSize: '11px' }}></i>
                  {opt.label}
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        <Accordion
          activeKey={activeKeys}
          onSelect={(selectedKeys) => {
            let nuevasClaves: string[] = []
            if (Array.isArray(selectedKeys)) {
              nuevasClaves = selectedKeys
            } else if (selectedKeys) {
              nuevasClaves = [selectedKeys]
            }
            setActiveKeys(nuevasClaves)
            // Contar cuántos procesos hay realmente (filtrando los que no tienen datos)
            const procesosVisibles = Object.entries(groupedProcesos).filter(([, grupo]) => {
              const procesosFiltrados = selectedPeriod
                ? Object.entries(grupo.periodos).filter(([key]) => key === selectedPeriod)
                : []
              return procesosFiltrados.length > 0
            })
            setTodosAbiertos(nuevasClaves.length === procesosVisibles.length && procesosVisibles.length > 0)
          }}
          className="accordion accordion-atisa"
        >
          {Object.entries(groupedProcesos).map(([nombreProceso, grupo], index) => {
            const procesosFiltrados = selectedPeriod
              ? Object.entries(grupo.periodos).filter(([key]) => key === selectedPeriod)
              : []

            if (procesosFiltrados.length === 0) return null

            // Calcular total de hitos para este grupo de procesos
            const totalHitos = procesosFiltrados.reduce((total, [, periodo]) => {
              return total + periodo.items.reduce((subtotal, proceso) => {
                const hitosDelProceso = hitosPorProceso[proceso.id] || []
                return subtotal + hitosDelProceso.length
              }, 0)
            }, 0)

            return (
              <Accordion.Item
                key={nombreProceso}
                eventKey={index.toString()}
              >
                <Accordion.Header>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                      <i className="bi bi-diagram-3" style={{ color: atisaStyles.colors.primary }}></i>
                      <span
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          color: atisaStyles.colors.primary,
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {nombreProceso}
                      </span>
                    </div>
                    <span className="accordion-atisa-badge">
                      {totalHitos} hitos
                    </span>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {procesosFiltrados.map(([periodoKey, periodo]) => (
                    <div key={periodoKey} className='mb-5'>
                      {/* Header del mes para separar si hay varios */}
                      <div className="mb-3 d-flex align-items-center">
                        <span className="badge me-2" style={{ backgroundColor: atisaStyles.colors.secondary, fontSize: '0.9rem', padding: '8px 12px' }}>
                          {getMesName(periodo.mes || 0)} {periodo.anio}
                        </span>
                        <div style={{ height: '1px', backgroundColor: atisaStyles.colors.light, flexGrow: 1 }}></div>
                      </div>
                      <div
                        className='table-responsive'
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 2px 10px rgba(0, 80, 92, 0.05)',
                          border: `1px solid ${atisaStyles.colors.light}`,
                          overflow: 'hidden'
                        }}
                      >
                        <table
                          className='table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4 mb-0'
                          style={{
                            fontFamily: atisaStyles.fonts.secondary,
                            margin: 0
                          }}
                        >
                          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                            <tr
                              style={{
                                backgroundColor: atisaStyles.colors.primary,
                                color: 'white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                              }}
                            >
                              <th
                                className="cursor-pointer user-select-none"
                                onClick={() => handleSort('hito')}
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  transition: 'background-color 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                }}
                              >
                                Hito {getSortIcon('hito')}
                              </th>
                              <th
                                className="cursor-pointer user-select-none"
                                onClick={() => handleSort('estado')}
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  transition: 'background-color 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                }}
                              >
                                Estado {getSortIcon('estado')}
                              </th>
                              <th
                                className="cursor-pointer user-select-none"
                                onClick={() => handleSort('fecha_actualizacion')}
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  transition: 'background-color 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                }}
                              >
                                Fecha Actualización {getSortIcon('fecha_actualizacion')}
                              </th>

                              <th
                                className="cursor-pointer user-select-none"
                                onClick={() => handleSort('fecha_limite')}
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  transition: 'background-color 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                }}
                              >
                                Fecha / Hora Límite {getSortIcon('fecha_limite')}
                              </th>
                              <th
                                className="cursor-pointer user-select-none"
                                onClick={() => handleSort('responsable')}
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  transition: 'background-color 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                }}
                              >
                                Responsable {getSortIcon('responsable')}
                              </th>
                              <th
                                className="cursor-pointer user-select-none"
                                onClick={() => handleSort('fecha_cumplimiento')}
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  transition: 'background-color 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                }}
                              >
                                Fecha / Hora Cumplimiento {getSortIcon('fecha_cumplimiento')}
                              </th>
                              <th
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white',
                                  backgroundColor: atisaStyles.colors.primary,
                                  textAlign: 'center'
                                }}
                              >
                                Documentos
                              </th>
                              <th
                                className='text-start'
                                style={{
                                  fontFamily: atisaStyles.fonts.primary,
                                  fontWeight: 'bold',
                                  fontSize: '14px',
                                  padding: '16px 12px',
                                  border: 'none',
                                  color: 'white'
                                }}
                              >
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingHitos ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="text-center py-4"
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    fontFamily: atisaStyles.fonts.secondary
                                  }}
                                >
                                  <div
                                    className="spinner-border"
                                    role="status"
                                    style={{
                                      color: atisaStyles.colors.primary,
                                      width: '2rem',
                                      height: '2rem'
                                    }}
                                  >
                                    <span className="visually-hidden">Cargando hitos...</span>
                                  </div>
                                  <span
                                    className="ms-2"
                                    style={{
                                      color: atisaStyles.colors.dark,
                                      fontFamily: atisaStyles.fonts.secondary,
                                      fontWeight: '500'
                                    }}
                                  >
                                    Cargando hitos...
                                  </span>
                                </td>
                              </tr>
                            ) : (
                              periodo.items.map((proceso) => {
                                const hitosFiltrados = (hitosPorProceso[proceso.id] || [])
                                  .filter((h) => coincideVencimiento(h) && coincideFechaLimite(h) && coincideCritico(h) && coincideObligatorio(h))
                                  .filter((h) => {
                                    if (!debouncedBusqueda) return true
                                    const nombre = getNombreHito(h.hito_id)
                                      .toLowerCase()
                                      .normalize('NFD')
                                      .replace(/[\u0300-\u036f]/g, '')
                                    return nombre.includes(debouncedBusqueda)
                                  })

                                const hitosDelProceso = sortHitos(hitosFiltrados)

                                if (hitosDelProceso.length === 0) {
                                  return (
                                    <tr
                                      key={proceso.id}
                                      style={{
                                        backgroundColor: '#f8f9fa'
                                      }}
                                    >
                                      <td
                                        colSpan={7}
                                        className="text-center py-3"
                                        style={{
                                          color: atisaStyles.colors.dark,
                                          fontFamily: atisaStyles.fonts.secondary,
                                          padding: '16px 12px'
                                        }}
                                      >
                                        <i className="bi bi-info-circle me-2" style={{ color: atisaStyles.colors.dark }}></i>
                                        No hay hitos para este proceso
                                      </td>
                                    </tr>
                                  )
                                }

                                return hitosDelProceso.map((hito, hitoIndex) => {
                                  const isFinalized = hito.estado === 'Finalizado'
                                  const isNuevo = hito.estado === 'Nuevo'
                                  const estadoVenc = getEstadoVencimiento(hito.fecha_limite, hito.estado)
                                  const finalizadoFuera = isFinalizadoFueraDePlazo(hito)
                                  const venceHoy = isNuevo && estadoVenc === 'hoy'
                                  const tieneCumplimientos = cumplimientosPorHito[hito.id] && cumplimientosPorHito[hito.id].length > 0

                                  // Color de fondo por vencimiento/finalización
                                  const bgRow = isFinalized
                                    ? (finalizadoFuera
                                      ? '#fff3e0' // Finalizado fuera de plazo (naranja muy claro)
                                      : '#e6f4ea' // Finalizado en plazo (verde muy claro)
                                    )
                                    : (estadoVenc === 'vencido'
                                      ? '#ffe0e0'
                                      : venceHoy
                                        ? '#fef2f2' // Nuevo que vence hoy (rojo muy claro)
                                        : estadoVenc === 'hoy'
                                          ? '#fff0c2'
                                          : (hitoIndex % 2 === 0 ? 'white' : '#f8f9fa'))

                                  // Estilos para el badge de fecha límite
                                  let badgeColors = { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' }

                                  if (isFinalized) {
                                    if (finalizadoFuera) {
                                      badgeColors = { bg: '#fff3e0', color: '#ef6c00', border: '#ffe0b2' } // Naranja (Finalizado fuera de plazo)
                                    } else {
                                      badgeColors = { bg: '#e8f5e8', color: '#2e7d32', border: '#c8e6c9' } // Verde (Finalizado en plazo)
                                    }
                                  } else {
                                    if (venceHoy) {
                                      badgeColors = { bg: '#fff8e1', color: '#f9a825', border: '#ffecb3' } // Amarillo (Vence hoy)
                                    } else if (estadoVenc === 'vencido') {
                                      badgeColors = { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' } // Rojo (Vencido)
                                    } else if (estadoVenc === 'sin_fecha') {
                                      badgeColors = { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' } // Gris (Sin fecha)
                                    } else {
                                      badgeColors = { bg: '#e0f2f1', color: '#00695c', border: '#b2dfdb' } // Teal (En plazo)
                                    }
                                  }
                                  // Sin barra lateral

                                  return (
                                    <tr
                                      key={`${proceso.id}-${hito.id}`}
                                      style={{
                                        backgroundColor: bgRow,
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        const hoverColor = isFinalized
                                          ? (finalizadoFuera ? '#ffe6c7' : '#d1f0de')
                                          : (estadoVenc === 'vencido' ? '#ffcfcf' : (venceHoy ? '#fecaca' : (estadoVenc === 'hoy' ? '#ffe49a' : atisaStyles.colors.light)))
                                        e.currentTarget.style.backgroundColor = hoverColor
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = bgRow
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                      }}
                                    >
                                      <td
                                        style={{
                                          fontFamily: atisaStyles.fonts.secondary,
                                          color: atisaStyles.colors.primary,
                                          fontWeight: '600',
                                          padding: '16px 12px'
                                        }}
                                      >
                                        <div
                                          className="d-flex align-items-center gap-3"
                                          style={{
                                            position: 'relative',
                                            paddingLeft: (Boolean(hito.critico) || Boolean(hito.obligatorio)) ? '12px' : '0'
                                          }}
                                        >
                                          {/* Barra lateral de estado */}
                                          {Boolean(hito.critico) && (
                                            <div style={{
                                              position: 'absolute',
                                              left: '-12px',
                                              top: '-16px',
                                              bottom: '-16px',
                                              width: '6px',
                                              backgroundColor: atisaStyles.colors.error,
                                              borderRadius: '0 4px 4px 0'
                                            }} />
                                          )}
                                          {!Boolean(hito.critico) && Boolean(hito.obligatorio) && (
                                            <div style={{
                                              position: 'absolute',
                                              left: '-12px',
                                              top: '-16px',
                                              bottom: '-16px',
                                              width: '6px',
                                              backgroundColor: atisaStyles.colors.accent,
                                              borderRadius: '0 4px 4px 0'
                                            }} />
                                          )}

                                          <span
                                            title={getNombreHito(hito.hito_id)}
                                            style={{
                                              fontWeight: Boolean(hito.critico) ? '800' : '600',
                                              fontSize: '14px'
                                            }}
                                          >
                                            {getNombreHito(hito.hito_id)}
                                          </span>

                                          <div className="d-flex gap-2 align-items-center">
                                            {Boolean(hito.obligatorio) && (
                                              <div
                                                className="d-flex align-items-center justify-content-center"
                                                style={{
                                                  backgroundColor: atisaStyles.colors.accent,
                                                  width: '24px',
                                                  height: '24px',
                                                  borderRadius: '4px',
                                                  boxShadow: '0 2px 4px rgba(0, 161, 222, 0.3)',
                                                  flexShrink: 0
                                                }}
                                                title="Obligatorio"
                                              >
                                                <i className="bi bi-asterisk" style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1 }}></i>
                                              </div>
                                            )}
                                            {Boolean(hito.critico) && (
                                              <div
                                                className="d-flex align-items-center justify-content-center"
                                                style={{
                                                  backgroundColor: atisaStyles.colors.error,
                                                  width: '24px',
                                                  height: '24px',
                                                  borderRadius: '4px',
                                                  boxShadow: '0 2px 6px rgba(217, 33, 78, 0.4)',
                                                  flexShrink: 0
                                                }}
                                                title="Crítico"
                                              >
                                                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1 }}></i>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ padding: '16px 12px' }}>
                                        {isFinalized ? (
                                          finalizadoFuera ? (
                                            <span style={{ backgroundColor: '#b45309', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, fontFamily: atisaStyles.fonts.secondary }}>
                                              Cumplido fuera de plazo
                                            </span>
                                          ) : (
                                            <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, fontFamily: atisaStyles.fonts.secondary }}>
                                              Cumplido en plazo
                                            </span>
                                          )
                                        ) : venceHoy ? (
                                          <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, fontFamily: atisaStyles.fonts.secondary }}>
                                            Vence hoy
                                          </span>
                                        ) : (
                                          estadoVenc === 'vencido' ? (
                                            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, fontFamily: atisaStyles.fonts.secondary }}>
                                              Pendiente fuera de plazo
                                            </span>
                                          ) : (
                                            <span style={{ backgroundColor: atisaStyles.colors.accent, color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, fontFamily: atisaStyles.fonts.secondary }}>
                                              Pendiente en plazo
                                            </span>
                                          )
                                        )}
                                      </td>
                                      <td
                                        style={{
                                          fontFamily: atisaStyles.fonts.secondary,
                                          color: atisaStyles.colors.dark,
                                          padding: '16px 12px'
                                        }}
                                      >
                                        {hito.fecha_estado ? formatDateWithTime(hito.fecha_estado) : '-'}
                                      </td>

                                      <td
                                        style={{
                                          fontFamily: atisaStyles.fonts.secondary,
                                          color: atisaStyles.colors.dark,
                                          padding: '16px 12px'
                                        }}
                                      >
                                        <span
                                          style={{
                                            backgroundColor: badgeColors.bg,
                                            color: badgeColors.color,
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            border: `1px solid ${badgeColors.border}`,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            display: 'inline-block'
                                          }}
                                          title={hito.fecha_limite ? `${formatDate(hito.fecha_limite)} ${hito.hora_limite ? formatTime(hito.hora_limite) : ''}` : ''}
                                        >
                                          {hito.fecha_limite ? formatDate(hito.fecha_limite) : 'No disponible'}
                                          {hito.hora_limite && `, ${formatTime(hito.hora_limite)}`}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          fontFamily: atisaStyles.fonts.secondary,
                                          color: atisaStyles.colors.dark,
                                          padding: '16px 12px'
                                        }}
                                      >
                                        {hito.tipo}
                                      </td>
                                      <td
                                        style={{
                                          fontFamily: atisaStyles.fonts.secondary,
                                          color: atisaStyles.colors.dark,
                                          padding: '16px 12px'
                                        }}
                                      >
                                        <span title={ultimaFechaCumplimientoFmt[hito.id] || '-'}>
                                          {ultimaFechaCumplimientoFmt[hito.id] || '-'}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          fontFamily: atisaStyles.fonts.secondary,
                                          padding: '16px 12px',
                                          textAlign: 'center',
                                          verticalAlign: 'middle'
                                        }}
                                      >
                                        {(() => {
                                          const ultimoCumplimiento = cumplimientosPorHito[hito.id]?.[0]
                                          if (ultimoCumplimiento?.id && ultimoCumplimiento.num_documentos && ultimoCumplimiento.num_documentos > 0) {
                                            return (
                                              <button
                                                className="btn btn-sm"
                                                onClick={() => handleDescargarDocumentos(ultimoCumplimiento.id!)}
                                                disabled={downloadingCumplimientoId === ultimoCumplimiento.id}
                                                style={{
                                                  backgroundColor: atisaStyles.colors.accent,
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '8px',
                                                  padding: '0',
                                                  transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  width: '38px',
                                                  height: '38px',
                                                  boxShadow: '0 2px 8px rgba(0, 161, 222, 0.25)',
                                                  cursor: downloadingCumplimientoId === ultimoCumplimiento.id ? 'not-allowed' : 'pointer',
                                                  lineHeight: '1',
                                                  verticalAlign: 'middle'
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (!e.currentTarget.disabled) {
                                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 80, 92, 0.35)'
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (!e.currentTarget.disabled) {
                                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 161, 222, 0.25)'
                                                  }
                                                }}
                                                title={`Descargar ${ultimoCumplimiento.num_documentos} documento(s) del último cumplimiento`}
                                              >
                                                {downloadingCumplimientoId === ultimoCumplimiento.id ? (
                                                  <span
                                                    className="spinner-border spinner-border-sm"
                                                    style={{
                                                      width: '20px',
                                                      height: '20px',
                                                      borderWidth: '3px',
                                                      borderColor: 'rgba(255, 255, 255, 0.3)',
                                                      borderTopColor: 'white'
                                                    }}
                                                  ></span>
                                                ) : (
                                                  <i className="bi bi-download" style={{ fontSize: '20px', lineHeight: '1', fontWeight: 'bold', color: 'white' }}></i>
                                                )}
                                              </button>
                                            )
                                          }
                                          return (
                                            <i
                                              className="bi bi-file-earmark-x"
                                              title="Sin documentos"
                                              style={{
                                                color: '#dee2e6',
                                                fontSize: '20px'
                                              }}
                                            ></i>
                                          )
                                        })()}
                                      </td>
                                      <td
                                        className='text-start'
                                        style={{ padding: '16px 12px' }}
                                      >
                                        <button
                                          className="btn btn-sm"
                                          style={{
                                            backgroundColor: tieneCumplimientos ? atisaStyles.colors.secondary : atisaStyles.colors.secondary,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontFamily: atisaStyles.fonts.secondary,
                                            fontWeight: '600',
                                            padding: '8px 16px',
                                            fontSize: '12px',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}
                                          onClick={() => {
                                            if (tieneCumplimientos) {
                                              // Si tiene cumplimientos, mostrar primero el modal de confirmación 1
                                              setHitoSeleccionado(hito)
                                              setShowConfirmacionModal1(true)
                                            } else {
                                              // Si no tiene cumplimientos, abrir directamente el modal de cumplimentación
                                              setHitoSeleccionado(hito)
                                              setShowCumplimentarHito(true)
                                            }
                                          }}
                                          title={tieneCumplimientos ? "El hito ya tiene cumplimientos. Se mostrarán confirmaciones antes de continuar." : "Insertar documento"}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                            e.currentTarget.style.transform = 'translateY(-2px)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                                            e.currentTarget.style.transform = 'translateY(0)'
                                          }}
                                        >
                                          <i className="bi bi-upload" style={{ color: 'white' }}></i>
                                          Cumplimentar
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            )
          })}
        </Accordion>

        {/* Modal para subir documento */}
        {hitoSeleccionado && (
          <CumplimentarHitoModal
            show={showCumplimentarHito}
            onHide={() => {
              setShowCumplimentarHito(false)
              setShowConfirmacionModal1(false)
              setHitoSeleccionado(null)
            }}
            idClienteProcesoHito={hitoSeleccionado.id}
            nombreDocumento={getNombreHito(hitoSeleccionado.hito_id)}
            estado={hitoSeleccionado.estado}
            onUploadSuccess={() => {
              setShowCumplimentarHito(false)
              setShowConfirmacionModal1(false)
              setHitoSeleccionado(null)
              handleUploadSuccess()
            }}
          />
        )}
        {/* Modal de confirmación 1 */}
        {showConfirmacionModal1 && (
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{
              background: 'rgba(0, 80, 92, 0.5)',
              zIndex: 10000,
              backdropFilter: 'blur(2px)'
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content"
                style={{
                  borderRadius: '16px',
                  border: `2px solid ${atisaStyles.colors.light}`,
                  boxShadow: '0 12px 40px rgba(0, 80, 92, 0.4)',
                  fontFamily: atisaStyles.fonts.secondary,
                  overflow: 'hidden'
                }}
              >
                <div
                  className="modal-header"
                  style={{
                    backgroundColor: atisaStyles.colors.primary,
                    color: 'white',
                    borderRadius: '14px 14px 0 0',
                    border: 'none',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <h5
                    className="modal-title"
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      fontWeight: 'bold',
                      margin: 0,
                      fontSize: '1.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <i className="bi bi-exclamation-triangle" style={{ color: '#ffc107', fontSize: '1.5rem' }}></i>
                    Confirmación
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowConfirmacionModal1(false)
                      setHitoSeleccionado(null)
                    }}
                    style={{
                      filter: 'invert(1)',
                      opacity: 0.8,
                      transition: 'opacity 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.8'
                    }}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{
                    padding: '28px 24px',
                    backgroundColor: 'white'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      marginBottom: '20px'
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#fff3cd',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <i className="bi bi-info-circle" style={{ color: '#856404', fontSize: '24px' }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          color: atisaStyles.colors.dark,
                          margin: 0,
                          lineHeight: '1.8',
                          fontSize: '15px'
                        }}
                      >
                        Estás apunto de realizar el cumplimiento de un hito ya cumplimentado.
                        <br />
                        <br />
                        <strong style={{ color: '#856404' }}>
                          <u>Ten en cuenta que la fecha de cumplimiento siempre sera la última complementada.</u>
                        </strong>
                        <br />
                        <br />
                        <strong style={{ color: atisaStyles.colors.primary }}>
                          ¿Estás seguro de querer continuar?
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className="modal-footer"
                  style={{
                    border: 'none',
                    padding: '20px 24px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0 0 14px 14px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setShowConfirmacionModal1(false)
                      setHitoSeleccionado(null)
                    }}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '10px 20px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(108, 117, 125, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#5a6268'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6c757d'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.2)'
                    }}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setShowConfirmacionModal1(false)
                      setShowCumplimentarHito(true)
                    }}
                    style={{
                      backgroundColor: atisaStyles.colors.secondary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '10px 20px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(156, 186, 57, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 186, 57, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(156, 186, 57, 0.3)'
                    }}
                  >
                    <i className="bi bi-arrow-right-circle me-2"></i>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para mostrar observación */}
        {showObservacionModal && (
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{
              background: 'rgba(0, 80, 92, 0.3)',
              zIndex: 9999
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content"
                style={{
                  borderRadius: '12px',
                  border: `2px solid ${atisaStyles.colors.light}`,
                  boxShadow: '0 8px 30px rgba(0, 80, 92, 0.3)',
                  fontFamily: atisaStyles.fonts.secondary
                }}
              >
                <div
                  className="modal-header"
                  style={{
                    backgroundColor: atisaStyles.colors.primary,
                    color: 'white',
                    borderRadius: '10px 10px 0 0',
                    border: 'none'
                  }}
                >
                  <h5
                    className="modal-title"
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      fontWeight: 'bold',
                      margin: 0
                    }}
                  >
                    <i className="bi bi-info-circle me-2" style={{ color: 'white' }}></i>
                    Observación
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowObservacionModal(false)}
                    style={{
                      filter: 'invert(1)'
                    }}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{
                    padding: '24px',
                    backgroundColor: 'white'
                  }}
                >
                  <p
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      color: atisaStyles.colors.dark,
                      margin: 0,
                      lineHeight: '1.6'
                    }}
                  >
                    {observacionSeleccionada}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  )
}

export default CalendarioCliente
