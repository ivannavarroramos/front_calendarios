import { FC, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Accordion, Modal } from 'react-bootstrap'
import CustomToast from '../../../components/ui/CustomToast'
import { Cliente, getClienteById } from '../../../api/clientes'
import { ClienteProceso, getClienteProcesosByCliente, createClienteProceso, generarCalendarioClienteProceso, GenerarCalendarioParams } from '../../../api/clienteProcesos'
import { Proceso, getAllProcesos } from '../../../api/procesos'
import { getClienteProcesoHitosByProceso, getClienteProcesoHitosHabilitadosByProceso, ClienteProcesoHito, updateClienteProcesoHito, deshabilitarHitosPorHitoDesde } from '../../../api/clienteProcesoHitos'
import { Hito, getAllHitos } from '../../../api/hitos'
import { createAuditoriaCalendario, AuditoriaCalendarioCreate, MOTIVOS_AUDITORIA, MotivoAuditoria } from '../../../api/auditoriaCalendarios'
import { atisaStyles, getSecondaryButtonStyles } from '../../../styles/atisaStyles'
import { formatDateDisplay } from '../../../utils/dateFormatter'
import PageHeader from '../../../components/ui/PageHeader'
import { useAuth } from '../../../modules/auth/core/Auth'

interface Props {
  clienteId: string
}

interface HitoEditado {
  id: number
  fecha_limite: string | null
  hora_limite: string | null
  observaciones?: string
}

interface EditForm {
  fecha_limite: string | null
  hora_limite: string | null
  observaciones: string
  motivo: MotivoAuditoria
}



const EditarCalendarioCliente: FC<Props> = ({ clienteId }) => {
  const { currentUser, auth } = useAuth()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [procesos, setProcesos] = useState<ClienteProceso[]>([])
  const [procesosList, setProcesosList] = useState<Proceso[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(0)
  const [selectedMonth, setSelectedMonth] = useState<number>(0)
  const [hitosPorProceso, setHitosPorProceso] = useState<Record<number, ClienteProcesoHito[]>>({})
  const [loadingHitos, setLoadingHitos] = useState(false)
  const [hitosMaestro, setHitosMaestro] = useState<Hito[]>([])
  const [hitosEditados, setHitosEditados] = useState<Record<number, HitoEditado>>({})
  const [cambiosRealizados, setCambiosRealizados] = useState<Array<{
    hitoId: number
    campo: string
    valorAnterior: string
    valorNuevo: string
    observaciones?: string
  }>>([])
  const [saving, setSaving] = useState(false)
  const [observacionesGlobales, setObservacionesGlobales] = useState('')
  const [motivoGlobal, setMotivoGlobal] = useState<MotivoAuditoria | 0>(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedHito, setSelectedHito] = useState<ClienteProcesoHito | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    fecha_limite: null,
    hora_limite: null,
    observaciones: '',
    motivo: 1
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  // Estado eliminado: ya no se filtra por estado
  const [filtroProceso, setFiltroProceso] = useState('')
  const [busquedaNombre, setBusquedaNombre] = useState('')
  const [debouncedBusquedaNombre, setDebouncedBusquedaNombre] = useState('')
  const [searchingNombre, setSearchingNombre] = useState(false)
  const [vistaCalendario, setVistaCalendario] = useState(false)
  const [selectedHitosMaestro, setSelectedHitosMaestro] = useState<Set<number>>(new Set())
  const [selectedProcesos, setSelectedProcesos] = useState<Set<number>>(new Set())
  const [showDeshabilitarDesdeModal, setShowDeshabilitarDesdeModal] = useState(false)
  const [fechaDesdeDeshabilitar, setFechaDesdeDeshabilitar] = useState(new Date().toISOString().split('T')[0])
  const [busquedaHitosModal, setBusquedaHitosModal] = useState('')
  const [busquedaProcesosModal, setBusquedaProcesosModal] = useState('')
  const [modoDeshabilitar, setModoDeshabilitar] = useState<'hitos' | 'procesos'>('hitos')
  const [showConfirmarHabilitarModal, setShowConfirmarHabilitarModal] = useState(false)
  const [hitoAConfirmar, setHitoAConfirmar] = useState<ClienteProcesoHito | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showCargarProcesosModal, setShowCargarProcesosModal] = useState(false)
  const [procesosDisponibles, setProcesosDisponibles] = useState<Proceso[]>([])
  const [procesosSeleccionados, setProcesosSeleccionados] = useState<Set<number>>(new Set())
  const [busquedaProcesos, setBusquedaProcesos] = useState('')
  const [fechaInicioProcesos, setFechaInicioProcesos] = useState('')
  const [filtroTemporalidad, setFiltroTemporalidad] = useState('')
  const [sortField, setSortField] = useState<'hito' | 'proceso' | 'fecha_limite' | 'hora_limite'>('fecha_limite')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Función auxiliar para verificar si un hito está habilitado
  const isHitoHabilitado = (hito: ClienteProcesoHito) => {
    return hito.habilitado === true || hito.habilitado === 1 || String(hito.habilitado) === '1'
  }

  // Función auxiliar para mostrar toasts
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }

  // Función para mostrar el modal de confirmación
  const toggleHabilitarHito = (hito: ClienteProcesoHito) => {
    setHitoAConfirmar(hito)
    setShowConfirmarHabilitarModal(true)
  }

  // Función para confirmar y ejecutar el cambio de estado
  const confirmarCambioEstado = async () => {
    if (!hitoAConfirmar) return

    try {
      const nuevoEstado = !isHitoHabilitado(hitoAConfirmar)

      // Crear objeto de actualización con solo los campos necesarios
      const hitoUpdate = {
        estado: hitoAConfirmar.estado,
        fecha_estado: hitoAConfirmar.fecha_estado,
        habilitado: nuevoEstado ? 1 : 0  // Enviar como número (1 o 0) en lugar de boolean
      }

      await updateClienteProcesoHito(hitoAConfirmar.id, hitoUpdate)

      // Actualizar el estado local
      setHitosPorProceso(prev => {
        const nuevo = { ...prev }
        Object.keys(nuevo).forEach(procesoId => {
          nuevo[parseInt(procesoId)] = nuevo[parseInt(procesoId)].map(h =>
            h.id === hitoAConfirmar.id ? { ...h, habilitado: nuevoEstado ? 1 : 0 } : h
          )
        })
        return nuevo
      })

      // Cerrar modal y limpiar estado
      setShowConfirmarHabilitarModal(false)
      setHitoAConfirmar(null)

      // Mostrar mensaje de confirmación
      const mensaje = nuevoEstado ? 'Hito habilitado correctamente' : 'Hito deshabilitado correctamente'
      showToastMessage(mensaje, 'success')

    } catch (error) {
      console.error('Error al actualizar el estado del hito:', error)

      // Mostrar información detallada del error
      let errorMessage = 'Error al actualizar el estado del hito'
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response
        if (response?.data?.detail) {
          errorMessage = `Error: ${response.data.detail}`
        } else if (response?.status) {
          errorMessage = `Error ${response.status}: ${response.statusText || 'Error del servidor'}`
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${(error as any).message}`
      }

      showToastMessage(errorMessage, 'error')
    }
  }

  // Función para cancelar el cambio
  const cancelarCambioEstado = () => {
    setShowConfirmarHabilitarModal(false)
    setHitoAConfirmar(null)
  }

  // Funciones para el modal de cargar procesos
  const abrirModalCargarProcesos = () => {
    setShowCargarProcesosModal(true)
    setProcesosSeleccionados(new Set())
    setBusquedaProcesos('')
    setFechaInicioProcesos(new Date().toISOString().split('T')[0])
    setFiltroTemporalidad('')
  }

  const cerrarModalCargarProcesos = () => {
    setShowCargarProcesosModal(false)
    setProcesosSeleccionados(new Set())
    setBusquedaProcesos('')
    setFechaInicioProcesos('')
    setFiltroTemporalidad('')
  }

  const toggleSeleccionProceso = (procesoId: number) => {
    setProcesosSeleccionados(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(procesoId)) {
        nuevo.delete(procesoId)
      } else {
        nuevo.add(procesoId)
      }
      return nuevo
    })
  }

  const cargarProcesosSeleccionados = async () => {
    if (procesosSeleccionados.size === 0) {
      showToastMessage('Seleccione al menos un proceso para cargar', 'warning')
      return
    }

    if (!fechaInicioProcesos) {
      showToastMessage('Seleccione una fecha de inicio', 'warning')
      return
    }

    try {
      // Obtener los procesos seleccionados
      const procesosACargar = procesosDisponibles.filter(p => procesosSeleccionados.has(p.id))

      // Usar generarCalendarioClienteProceso para cada proceso seleccionado (igual que en ClientesList.tsx)
      const calendarios: GenerarCalendarioParams[] = procesosACargar.map(proceso => ({
        cliente_id: clienteId,
        proceso_id: proceso.id,
        fecha_inicio: fechaInicioProcesos
      }))

      // Ejecutar todas las generaciones en paralelo (igual que en ClientesList.tsx)
      await Promise.all(calendarios.map(calendario => generarCalendarioClienteProceso(calendario)))

      showToastMessage(`${procesosSeleccionados.size} procesos generados correctamente`, 'success')
      cerrarModalCargarProcesos()

      // Recargar los procesos del cliente
      const res = await getClienteProcesosByCliente(clienteId)
      setProcesos(res.clienteProcesos || [])

    } catch (error) {
      console.error('Error al generar calendarios:', error)
      showToastMessage('Error al generar los calendarios', 'error')
    }
  }

  const toggleSeleccionMaestro = (hito: ClienteProcesoHito, checked: boolean) => {
    const maestroId = hito.hito_id
    setSelectedHitosMaestro(prev => {
      const next = new Set(prev)
      if (checked) next.add(maestroId); else next.delete(maestroId)
      return next
    })
  }

  const abrirModalDeshabilitarDesde = () => {
    setFechaDesdeDeshabilitar(new Date().toISOString().split('T')[0])
    setSelectedHitosMaestro(new Set())
    setSelectedProcesos(new Set())
    setBusquedaHitosModal('')
    setBusquedaProcesosModal('')
    setModoDeshabilitar('hitos')
    setShowDeshabilitarDesdeModal(true)
  }

  const confirmarDeshabilitarDesde = async () => {
    if (!fechaDesdeDeshabilitar) {
      showToastMessage('Seleccione una fecha desde', 'warning')
      return
    }
    try {
      if (modoDeshabilitar === 'hitos') {
        const ids = Array.from(selectedHitosMaestro)
        if (ids.length === 0) {
          setShowDeshabilitarDesdeModal(false)
          return
        }
        await Promise.all(ids.map(id => deshabilitarHitosPorHitoDesde(id, fechaDesdeDeshabilitar, clienteId)))
      } else {
        const procesoIds = Array.from(selectedProcesos)
        if (procesoIds.length === 0) {
          setShowDeshabilitarDesdeModal(false)
          return
        }

        // Obtener todos los hitos asociados a los procesos seleccionados
        const hitosPromises = procesoIds.map(procesoId =>
          getClienteProcesoHitosByProceso(procesoId)
        )

        const hitosArrays = await Promise.all(hitosPromises)
        const todosLosHitos = hitosArrays.flat()

        // Filtrar solo los hitos habilitados
        const hitosHabilitados = todosLosHitos.filter(hito => isHitoHabilitado(hito))

        // Extraer los IDs de los hitos maestros para deshabilitar
        const hitoIds = hitosHabilitados.map(hito => hito.hito_id)

        if (hitoIds.length === 0) {
          showToastMessage('No se encontraron hitos habilitados para los procesos seleccionados', 'warning')
          setShowDeshabilitarDesdeModal(false)
          return
        }

        // Usar deshabilitarHitosPorHitoDesde para cada hito individual
        await Promise.all(hitoIds.map(hitoId => deshabilitarHitosPorHitoDesde(hitoId, fechaDesdeDeshabilitar, clienteId)))
      }
      setShowDeshabilitarDesdeModal(false)
      setSelectedHitosMaestro(new Set())
      setSelectedProcesos(new Set())
      // Recargar datos visibles
      const procesosVisibles: ClienteProceso[] = []
      Object.values(groupedProcesos).forEach(grupo => {
        const periodoData = grupo.periodos[selectedPeriod]
        if (periodoData) procesosVisibles.push(...periodoData.items)
      })
      await cargarHitosDeProcesos(procesosVisibles)
    } catch (e) {
      showToastMessage('Ocurrió un error al deshabilitar', 'error')
    }
  }

  // Debounce para el término de búsqueda principal
  useEffect(() => {
    if (busquedaNombre) {
      setSearchingNombre(true)
    }

    const timer = setTimeout(() => {
      setDebouncedBusquedaNombre(busquedaNombre)
      setSearchingNombre(false)
    }, 300) // 300ms de delay

    return () => {
      clearTimeout(timer)
      setSearchingNombre(false)
    }
  }, [busquedaNombre])

  useEffect(() => {
    getClienteById(clienteId).then(setCliente)
    getClienteProcesosByCliente(clienteId).then(res => setProcesos(res.clienteProcesos || []))
    getAllProcesos().then(res => setProcesosList(res.procesos || []))
    getAllHitos().then((res) => setHitosMaestro(res.hitos || []))
  }, [clienteId])

  // Cargar procesos disponibles cuando se abre el modal
  useEffect(() => {
    if (showCargarProcesosModal) {
      // Filtrar solo los procesos que NO están ya asignados al cliente
      const procesosAsignadosIds = new Set(procesos.map(p => p.proceso_id))
      const procesosDisponibles = procesosList.filter(proceso => !procesosAsignadosIds.has(proceso.id))
      setProcesosDisponibles(procesosDisponibles)
    }
  }, [showCargarProcesosModal, procesosList, procesos])

  // Obtener períodos únicos (solo los que tienen datos)
  const periodos = useMemo(() => {
    const uniquePeriods = new Set<string>()
    procesos.forEach(proceso => {
      if (proceso.anio && proceso.mes) {
        uniquePeriods.add(`${proceso.anio}-${proceso.mes.toString().padStart(2, '0')}`)
      }
    })
    return Array.from(uniquePeriods)
      .sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number)
        const [yearB, monthB] = b.split('-').map(Number)
        if (yearA !== yearB) return yearB - yearA
        return monthA - monthB
      })
  }, [procesos])

  // Obtener años disponibles (solo los que tienen datos)
  const anosDisponibles = useMemo(() => {
    const anosSet = new Set<number>()
    periodos.forEach(periodo => {
      const [year] = periodo.split('-').map(Number)
      anosSet.add(year)
    })
    return Array.from(anosSet).sort((a, b) => b - a) // Orden descendente
  }, [periodos])

  // Obtener meses disponibles para el año seleccionado (solo los que tienen datos)
  const mesesDisponibles = useMemo(() => {
    if (selectedYear === 0) return []
    const mesesSet = new Set<number>()
    periodos.forEach(periodo => {
      const [year, month] = periodo.split('-').map(Number)
      if (year === selectedYear) {
        mesesSet.add(month)
      }
    })
    return Array.from(mesesSet).sort((a, b) => a - b) // Orden ascendente (enero a diciembre)
  }, [periodos, selectedYear])

  // Inicializar año y mes seleccionados
  useEffect(() => {
    if (anosDisponibles.length > 0 && selectedYear === 0) {
      const ahora = new Date()
      const anoActual = ahora.getUTCFullYear()
      const mesActual = ahora.getUTCMonth() + 1

      // Seleccionar año actual si está disponible, sino el primero de la lista
      const anoAseleccionar = anosDisponibles.includes(anoActual) ? anoActual : anosDisponibles[0]
      setSelectedYear(anoAseleccionar)

      // Verificar si el mes actual está disponible para el año seleccionado
      const periodoActual = `${anoAseleccionar}-${mesActual.toString().padStart(2, '0')}`
      const mesDisponible = periodos.includes(periodoActual) ? mesActual : mesesDisponibles[0] || 1
      setSelectedMonth(mesDisponible)
    }
  }, [anosDisponibles, periodos, mesesDisponibles, selectedYear])

  // Cuando cambia el año, ajustar el mes si no está disponible
  useEffect(() => {
    if (selectedYear > 0 && mesesDisponibles.length > 0) {
      if (!mesesDisponibles.includes(selectedMonth)) {
        // Si el mes actual no está disponible, seleccionar el primer mes disponible
        setSelectedMonth(mesesDisponibles[0])
      }
    }
  }, [selectedYear, mesesDisponibles, selectedMonth])

  // Actualizar selectedPeriod cuando cambian año o mes
  useEffect(() => {
    if (selectedYear > 0 && selectedMonth > 0) {
      const nuevoPeriodo = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`
      setSelectedPeriod(nuevoPeriodo)
    }
  }, [selectedYear, selectedMonth])

  // Función para cargar todos los hitos de los procesos
  const cargarHitosDeProcesos = async (procesosACarga: ClienteProceso[]) => {
    if (procesosACarga.length === 0) {
      setHitosPorProceso({})
      return
    }

    setLoadingHitos(true)
    const hitosMap: Record<number, ClienteProcesoHito[]> = {}

    try {
      // Cargar todos los hitos (habilitados y deshabilitados) para la vista de tabla
      // En la vista de calendario se filtrarán solo los habilitados
      const hitosPromises = procesosACarga.map(proceso =>
        getClienteProcesoHitosByProceso(proceso.id)
          .then(hitosData => ({ procesoId: proceso.id, hitos: hitosData }))
          .catch(() => ({ procesoId: proceso.id, hitos: [] }))
      )

      const resultados = await Promise.all(hitosPromises)

      // Organizar hitos por proceso y ordenar por fecha límite
      resultados.forEach(({ procesoId, hitos }) => {
        hitosMap[procesoId] = hitos.sort((a, b) =>
          new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime()
        )
      })

      setHitosPorProceso(hitosMap)

    } catch (error) {
      console.error('Error cargando hitos:', error)
      setHitosPorProceso({})
    }

    setLoadingHitos(false)
  }

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
        // Mantener el orden de procesos; el orden por fecha se aplica a nivel de hitos
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

  // Obtener solo los procesos que forman parte del calendario del cliente
  const procesosDelCalendario = useMemo(() => {
    const procesosAsignadosIds = new Set(procesos.map(p => p.proceso_id))
    return procesosList.filter(proceso => procesosAsignadosIds.has(proceso.id))
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

  const getNombreProceso = (cliente_proceso_id: number) => {
    const clienteProceso = procesos.find(p => p.id === cliente_proceso_id)
    if (clienteProceso) {
      const proceso = procesosList.find(proc => proc.id === clienteProceso.proceso_id)
      return proceso ? proceso.nombre : `Proceso ${clienteProceso.proceso_id}`
    }
    return 'Proceso no encontrado'
  }

  const formatDate = (date: string) => {
    return formatDateDisplay(date)
  }

  const formatDateForInput = (date: string) => {
    if (!date || date === '' || date === 'null' || date === 'undefined') {
      return ''
    }

    try {
      const d = new Date(date)
      // Verificar si la fecha es válida
      if (isNaN(d.getTime())) {
        return ''
      }
      return d.toISOString().split('T')[0]
    } catch (error) {
      console.warn('Error formateando fecha:', error)
      return ''
    }
  }

  const formatTimeForInput = (time: string | null) => {
    if (!time || time === 'null' || time === 'undefined' || time === '') {
      return ''
    }

    // Si ya está en formato HH:MM, devolverlo tal como está
    if (time.match(/^\d{2}:\d{2}$/)) {
      return time
    }

    // Si viene en otro formato, intentar parsearlo
    try {
      const date = new Date(`1970-01-01T${time}`)
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return ''
      }
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return ''
    }
  }

  const validarFechas = (fechaInicio: string | null, fechaFin: string | null) => {
    if (!fechaInicio) return true

    const inicio = new Date(fechaInicio)
    if (fechaFin) {
      const fin = new Date(fechaFin)
      return inicio <= fin
    }
    return true
  }

  // Devuelve los límites (inicio y fin) del mes seleccionado en los filtros (selectedPeriod: YYYY-MM)
  const getSelectedMonthBounds = () => {
    if (!selectedPeriod) return null
    const [yearStr, monthStr] = selectedPeriod.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    if (Number.isNaN(year) || Number.isNaN(month)) return null
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)
    return { start, end }
  }

  const formatDateInputFromDate = (date: Date) => date.toISOString().slice(0, 10)

  // Valida que una fecha (YYYY-MM-DD) esté dentro del mes seleccionado
  const isWithinSelectedMonth = (dateStr: string) => {
    const bounds = getSelectedMonthBounds()
    if (!bounds) return true
    const d = new Date(dateStr)
    return d >= bounds.start && d <= bounds.end
  }

  const handleFechaChange = (hitoId: number, campo: 'fecha_limite', valor: string) => {
    const hitoOriginal = Object.values(hitosPorProceso)
      .flat()
      .find(h => h.id === hitoId)

    if (!hitoOriginal) return

    const valorAnterior = hitoOriginal.fecha_limite || ''
    // No se permite borrar fecha_limite
    if (valor === '') {
      showToastMessage('La fecha límite es obligatoria y no se puede dejar vacía', 'warning')
      const lastValue = (hitosEditados[hitoId]?.fecha_limite || hitoOriginal.fecha_limite || '')
      const inputElement = document.querySelector(`input[data-hito-id="${hitoId}"][data-campo="${campo}"]`) as HTMLInputElement
      if (inputElement) {
        inputElement.value = formatDateForInput(lastValue)
      }
      return
    }
    const valorFinal = valor

    setHitosEditados(prev => ({
      ...prev,
      [hitoId]: {
        ...prev[hitoId],
        id: hitoId,
        fecha_limite: valorFinal,
        hora_limite: prev[hitoId]?.hora_limite || hitoOriginal.hora_limite
      }
    }))

    // Registrar el cambio
    if (valorFinal !== valorAnterior) {
      const cambioExistente = cambiosRealizados.findIndex(c => c.hitoId === hitoId && c.campo === campo)
      const nuevoCambio = {
        hitoId,
        campo,
        valorAnterior,
        valorNuevo: valorFinal || ''
      }

      if (cambioExistente >= 0) {
        setCambiosRealizados(prev =>
          prev.map((c, index) => index === cambioExistente ? nuevoCambio : c)
        )
      } else {
        setCambiosRealizados(prev => [...prev, nuevoCambio])
      }
    }
  }


  // Quitar función de limpiar: fecha_limite no se puede borrar

  const handleHoraChange = (hitoId: number, valor: string) => {
    const hitoOriginal = Object.values(hitosPorProceso)
      .flat()
      .find(h => h.id === hitoId)

    if (!hitoOriginal) return

    const valorAnterior = hitoOriginal.hora_limite || ''
    // Normalizar formato de hora para comparación (quitar segundos)
    const valorAnteriorNormalizado = valorAnterior ? valorAnterior.substring(0, 5) : ''
    const valorNormalizado = valor ? valor.substring(0, 5) : ''

    setHitosEditados(prev => ({
      ...prev,
      [hitoId]: {
        ...prev[hitoId],
        id: hitoId,
        fecha_limite: prev[hitoId]?.fecha_limite || hitoOriginal.fecha_limite,
        hora_limite: valor
      }
    }))

    // Registrar el cambio solo si realmente cambió (comparando formatos normalizados)
    if (valorNormalizado !== valorAnteriorNormalizado) {
      const cambioExistente = cambiosRealizados.findIndex(c => c.hitoId === hitoId && c.campo === 'hora_limite')
      const nuevoCambio = {
        hitoId,
        campo: 'hora_limite',
        valorAnterior,
        valorNuevo: valor
      }

      if (cambioExistente >= 0) {
        setCambiosRealizados(prev =>
          prev.map((c, index) => index === cambioExistente ? nuevoCambio : c)
        )
      } else {
        setCambiosRealizados(prev => [...prev, nuevoCambio])
      }
    }
  }


  const validarTodosLosCambios = () => true

  // Funciones helper para obtener datos del usuario logueado desde el JWT
  // (igual que en CumplimentarHitoModal y CumplimentarHitosMasivoModal)
  const getCurrentUsername = (): string => {
    if (auth?.api_token) {
      try {
        const payload = JSON.parse(atob(auth.api_token.split('.')[1]))
        if (payload.numeross) return payload.numeross
        if (payload.username) return payload.username
        if (payload.sub) return payload.sub
      } catch (error) {
        console.warn('Error decodificando token JWT:', error)
      }
    }
    if (currentUser?.username) return currentUser.username
    return 'usuario'
  }

  const getCurrentCodSubDepar = (): string | undefined => {
    if (auth?.api_token) {
      try {
        const payload = JSON.parse(atob(auth.api_token.split('.')[1]))
        return payload.codSubDepar
      } catch (error) {
        console.warn('Error decodificando token JWT para codSubDepar:', error)
      }
    }
    return undefined
  }

  const registrarAuditoria = async (
    hitoId: number,
    campo: string,
    valorAnterior: string,
    valorNuevo: string,
    observaciones?: string,
    motivo: MotivoAuditoria = 1
  ) => {
    try {
      const auditoriaData: AuditoriaCalendarioCreate = {
        cliente_id: clienteId,
        hito_id: hitoId,
        campo_modificado: campo,
        valor_anterior: valorAnterior || null,
        valor_nuevo: valorNuevo || null,
        usuario_modificacion: getCurrentUsername(),
        usuario: getCurrentUsername(),
        observaciones: observaciones || null,
        motivo,
        codSubDepar: getCurrentCodSubDepar() || null
      }

      await createAuditoriaCalendario(auditoriaData)
    } catch (error) {
      console.warn('Error registrando auditoría:', error)
      // No fallar el guardado por error de auditoría
    }
  }

  const guardarCambios = async () => {
    if (Object.keys(hitosEditados).length === 0) {
      showToastMessage('No hay cambios para guardar', 'info')
      return
    }

    if (motivoGlobal === 0) {
      showToastMessage('Debes seleccionar un motivo antes de guardar los cambios', 'warning')
      return
    }

    // Validar todos los cambios antes de guardar
    if (!validarTodosLosCambios()) {
      return
    }

    const confirmacion = window.confirm(
      `¿Está seguro de que desea guardar los cambios en ${Object.keys(hitosEditados).length} hitos?\n\n` +
      'Esta acción registrará los cambios en el historial de auditoría.'
    )

    if (!confirmacion) return

    setSaving(true)
    try {
      // Guardar cambios en los hitos
      for (const [hitoId, hitoEditado] of Object.entries(hitosEditados)) {
        // Obtener el hito original para mantener su estado actual
        const hitoOriginal = Object.values(hitosPorProceso)
          .flat()
          .find(h => h.id === parseInt(hitoId))

        await updateClienteProcesoHito(parseInt(hitoId), {
          estado: hitoOriginal?.estado || 'Pendiente',
          fecha_estado: new Date().toISOString(),
          fecha_limite: hitoEditado.fecha_limite || undefined,
          hora_limite: hitoEditado.hora_limite
        })
      }

      // Registrar auditoría para cada cambio
      for (const cambio of cambiosRealizados) {
        await registrarAuditoria(
          cambio.hitoId,
          cambio.campo,
          cambio.valorAnterior,
          cambio.valorNuevo,
          observacionesGlobales,
          motivoGlobal as MotivoAuditoria
        )
      }

      showToastMessage(`Cambios guardados correctamente en ${Object.keys(hitosEditados).length} hitos. Se han registrado ${cambiosRealizados.length} cambios en el historial de auditoría.`, 'success')

      // Recargar los hitos
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

      // Limpiar cambios
      setHitosEditados({})
      setCambiosRealizados([])
      setObservacionesGlobales('')
      setMotivoGlobal(0)
    } catch (error) {
      console.error('Error guardando cambios:', error)
      showToastMessage('Error al guardar los cambios. Por favor, inténtelo de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const cancelarCambios = () => {
    const confirmacion = window.confirm('¿Está seguro de que desea cancelar todos los cambios? Se perderán las modificaciones no guardadas.')
    if (confirmacion) {
      setHitosEditados({})
      setCambiosRealizados([])
      setObservacionesGlobales('')
      setMotivoGlobal(0)
    }
  }

  const mostrarResumenCambios = () => {
    if (cambiosRealizados.length === 0) return

    const resumen = cambiosRealizados.map(cambio => {
      const hito = Object.values(hitosPorProceso).flat().find(h => h.id === cambio.hitoId)
      const nombreHito = hito ? getNombreHito(hito.hito_id) : `Hito ${cambio.hitoId}`

      return `• ${nombreHito}: ${cambio.campo} (${cambio.valorAnterior} → ${cambio.valorNuevo})`
    }).join('\n')

    const observacionesTexto = observacionesGlobales ? `\n\nObservaciones:\n${observacionesGlobales}` : ''

    showToastMessage(`Resumen de cambios: ${resumen}${observacionesTexto}`, 'info')
  }

  const getValorHito = (hito: ClienteProcesoHito, campo: 'fecha_limite' | 'hora_limite') => {
    const hitoEditado = hitosEditados[hito.id]
    if (hitoEditado && hitoEditado[campo] !== undefined) {
      return hitoEditado[campo] || ''
    }

    const valorOriginal = campo === 'fecha_limite' ? hito.fecha_limite : hito.hora_limite

    // Manejar valores nulos, undefined o vacíos
    if (!valorOriginal || valorOriginal === 'null' || valorOriginal === 'undefined') {
      return ''
    }

    return valorOriginal
  }

  // Funciones para el modal de edición
  const editarHito = (hito: ClienteProcesoHito) => {
    // Permitir edición siempre (se elimina restricción por estado)

    setSelectedHito(hito)
    setEditForm({
      fecha_limite: formatDateForInput(hito.fecha_limite || ''),
      hora_limite: formatTimeForInput(hito.hora_limite),
      observaciones: '',
      motivo: 1
    })
    setShowEditModal(true)
  }

  const guardarHito = async () => {
    if (!selectedHito) return

    try {
      // Obtener valores originales para comparar
      const hitoOriginal = hitosPorProceso[selectedHito.cliente_proceso_id]?.find(h => h.id === selectedHito.id)
      if (!hitoOriginal) return

      await updateClienteProcesoHito(selectedHito.id, {
        estado: selectedHito.estado,
        fecha_estado: new Date().toISOString(),
        fecha_limite: editForm.fecha_limite || undefined,
        hora_limite: editForm.hora_limite || null
      })

      // Registrar auditoría para cada campo que cambió
      const cambios: Array<{ campo: string, anterior: string, nuevo: string }> = []

      // Verificar cambios en fecha_limite
      if ((hitoOriginal.fecha_limite || '') !== (editForm.fecha_limite || '')) {
        cambios.push({
          campo: 'fecha_limite',
          anterior: hitoOriginal.fecha_limite || '',
          nuevo: editForm.fecha_limite || ''
        })
      }

      // Verificar cambios en hora_limite (normalizar formato para comparación)
      const horaOriginalNormalizada = hitoOriginal.hora_limite ? hitoOriginal.hora_limite.substring(0, 5) : ''
      const horaNuevaNormalizada = editForm.hora_limite ? editForm.hora_limite.substring(0, 5) : ''

      if (horaOriginalNormalizada !== horaNuevaNormalizada) {
        cambios.push({
          campo: 'hora_limite',
          anterior: horaOriginalNormalizada,
          nuevo: horaNuevaNormalizada
        })
      }

      // Registrar auditoría para cada cambio
      // codSubDepar viene del usuario logueado (misma lógica que cumplimientos)
      for (const cambio of cambios) {
        await registrarAuditoria(
          selectedHito.id,
          cambio.campo,
          cambio.anterior,
          cambio.nuevo,
          editForm.observaciones,
          editForm.motivo
        )
      }

      // Si no hubo cambios específicos pero se guardó, registrar como edición general
      if (cambios.length === 0) {
        await registrarAuditoria(
          selectedHito.id,
          'hito_completo',
          'Sin cambios específicos',
          'Hito editado desde modal',
          editForm.observaciones,
          editForm.motivo
        )
      }

      setShowEditModal(false)
      setShowSuccess(true)

      // Recargar hitos para mostrar cambios (el hito podría haberse movido a otro mes)
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

      // Mostrar mensaje informativo si el hito se movió a otro mes
      if (editForm.fecha_limite) {
        const fechaSeleccionada = new Date(editForm.fecha_limite)
        const [year, month] = selectedPeriod.split('-').map(Number)
        const esMesDiferente = fechaSeleccionada.getFullYear() !== year || fechaSeleccionada.getMonth() !== (month - 1)

        if (esMesDiferente) {
          const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          const nuevoMes = meses[fechaSeleccionada.getMonth()]
          const nuevoAno = fechaSeleccionada.getFullYear()
          showToastMessage(`El hito se ha movido al mes de ${nuevoMes} ${nuevoAno}. Para verlo, cambie al período correspondiente en el filtro de meses.`, 'info')
        }
      }
    } catch (error) {
      console.error('Error guardando hito:', error)
      setErrorMessage('Error al guardar el hito')
      setShowError(true)
    }
  }

  const verHistorial = (hitoId: number) => {
    navigate(`/historial-auditoria/${clienteId}`)
  }

  // Función para manejar el ordenamiento
  const handleSort = (field: 'hito' | 'proceso' | 'fecha_limite' | 'hora_limite') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (field: 'hito' | 'proceso' | 'fecha_limite' | 'hora_limite') => {
    if (sortField !== field) {
      return <i className="bi bi-arrow-down-up" style={{ fontSize: '12px', opacity: 0.5, marginLeft: '6px' }}></i>
    }
    return sortDirection === 'asc'
      ? <i className="bi bi-arrow-up" style={{ fontSize: '12px', marginLeft: '6px' }}></i>
      : <i className="bi bi-arrow-down" style={{ fontSize: '12px', marginLeft: '6px' }}></i>
  }

  // Función para obtener hitos filtrados
  const getHitosFiltrados = () => {
    let hitosFiltrados = Object.values(hitosPorProceso).flat()

    // En vista de calendario, solo mostrar hitos habilitados
    if (vistaCalendario) {
      hitosFiltrados = hitosFiltrados.filter(hito => isHitoHabilitado(hito))
    }

    if (filtroProceso) {
      hitosFiltrados = hitosFiltrados.filter(hito => {
        const proceso = procesos.find(p => p.id === hito.cliente_proceso_id)
        return proceso?.proceso_id === parseInt(filtroProceso)
      })
    }

    // Filtro por nombre de hito (ignora mayúsculas y tildes)
    if (debouncedBusquedaNombre.trim() !== '') {
      const normalizeText = (text: string) =>
        text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      const termino = normalizeText(debouncedBusquedaNombre)
      hitosFiltrados = hitosFiltrados.filter(hito => {
        const nombre = normalizeText(getNombreHito(hito.hito_id))
        return nombre.includes(termino)
      })
    }

    // Aplicar ordenamiento
    const sortedHitos = [...hitosFiltrados].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'hito':
          const nombreA = getNombreHito(a.hito_id).toLowerCase()
          const nombreB = getNombreHito(b.hito_id).toLowerCase()
          comparison = nombreA.localeCompare(nombreB)
          break
        case 'proceso':
          const procesoA = getNombreProceso(a.cliente_proceso_id).toLowerCase()
          const procesoB = getNombreProceso(b.cliente_proceso_id).toLowerCase()
          comparison = procesoA.localeCompare(procesoB)
          break
        case 'fecha_limite':
          // Ordenar por fecha límite, y si son iguales, por hora límite
          const fechaA = new Date(a.fecha_limite).getTime()
          const fechaB = new Date(b.fecha_limite).getTime()
          if (fechaA !== fechaB) {
            comparison = fechaA - fechaB
          } else {
            // Si las fechas son iguales, ordenar por hora límite
            const horaA = a.hora_limite || ''
            const horaB = b.hora_limite || ''
            comparison = horaA.localeCompare(horaB)
          }
          break
        case 'hora_limite':
          const horaA2 = a.hora_limite || ''
          const horaB2 = b.hora_limite || ''
          if (horaA2 !== horaB2) {
            comparison = horaA2.localeCompare(horaB2)
          } else {
            // Si las horas son iguales, ordenar por fecha límite
            const fechaA2 = new Date(a.fecha_limite).getTime()
            const fechaB2 = new Date(b.fecha_limite).getTime()
            comparison = fechaA2 - fechaB2
          }
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sortedHitos
  }

  // Función para obtener procesos filtrados
  const getProcesosFiltrados = () => {
    return procesos.filter(p =>
      Object.values(groupedProcesos).some(grupo =>
        grupo.periodos[selectedPeriod]?.items.some(item => item.id === p.id)
      )
    )
  }

  // Función para sincronizar la selección de procesos basada en hitos seleccionados
  const sincronizarProcesosDesdeHitos = () => {
    const hitosSeleccionados = Array.from(selectedHitosMaestro)
    const procesosConHitosSeleccionados = new Set<number>()

    hitosSeleccionados.forEach(hitoId => {
      const hito = getHitosFiltrados().find(h => h.hito_id === hitoId)
      if (hito) {
        procesosConHitosSeleccionados.add(hito.cliente_proceso_id)
      }
    })

    // Verificar si todos los hitos de cada proceso están seleccionados
    const procesosCompletamenteSeleccionados = new Set<number>()
    procesosConHitosSeleccionados.forEach(procesoId => {
      const hitosDelProceso = getHitosFiltrados().filter(h => h.cliente_proceso_id === procesoId)
      const hitosDelProcesoSeleccionados = hitosDelProceso.filter(h => selectedHitosMaestro.has(h.hito_id))
      if (hitosDelProceso.length === hitosDelProcesoSeleccionados.length) {
        procesosCompletamenteSeleccionados.add(procesoId)
      }
    })

    setSelectedProcesos(procesosCompletamenteSeleccionados)
  }

  // Función para obtener días del mes actual
  // Construye 6x7 celdas con días del mes anterior y siguiente
  const getCeldasCalendario = () => {
    if (!selectedPeriod) return [] as Array<{ date: Date, actual: boolean }>
    const [year, month] = selectedPeriod.split('-').map(Number)

    // Usar UTC para evitar problemas de zona horaria
    const primeroMes = new Date(Date.UTC(year, month - 1, 1))
    // Lunes=0 ... Domingo=6 (ajustamos desde getDay() que es 0=Dom)
    const weekday = (primeroMes.getDay() + 6) % 7

    // Calcular el primer día del grid (puede ser del mes anterior)
    const inicioGrid = new Date(Date.UTC(year, month - 1, 1 - weekday))

    const celdas: Array<{ date: Date, actual: boolean }> = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(Date.UTC(inicioGrid.getUTCFullYear(), inicioGrid.getUTCMonth(), inicioGrid.getUTCDate() + i))
      const esActual = d.getUTCMonth() === (month - 1)
      celdas.push({ date: d, actual: esActual })
    }
    return celdas
  }

  // Función para obtener hitos de una fecha completa (YYYY-MM-DD)
  const getHitosDeFecha = (fecha: Date) => {
    const fechaStr = fecha.toISOString().split('T')[0]
    return getHitosFiltrados().filter(hito => hito.fecha_limite === fechaStr)
  }

  return (
    <>
      <style>{`
        .calendar-day .day-hitos::-webkit-scrollbar {
          width: 6px;
        }

        .calendar-day .day-hitos::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .calendar-day .day-hitos::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .calendar-day .day-hitos::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        .calendar-day .day-hitos {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }

        .hito-card {
          position: relative;
          flex-shrink: 0;
        }

        .hito-card:hover {
          z-index: 10;
        }

        /* Estilos para los selectores de año y mes */
        .period-selector select option {
          background-color: #00505c !important;
          color: white !important;
        }

        .period-selector select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
        }
      `}</style>
      <div
        className="container-fluid"
        style={{
          fontFamily: atisaStyles.fonts.secondary,
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <PageHeader
          title="Editar Calendario"
          subtitle={cliente?.razsoc || clienteId}
          icon="pencil-square"
          backButton={
            <button
              className="btn d-flex align-items-center"
              onClick={() => navigate('/clientes')}
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
              <i className="bi bi-arrow-left me-2"></i>
              Volver
            </button>
          }
          actions={
            <button
              className="btn"
              onClick={() => setVistaCalendario(!vistaCalendario)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontFamily: atisaStyles.fonts.secondary,
                fontWeight: '600',
                padding: '8px 16px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className={`bi ${vistaCalendario ? 'bi-table' : 'bi-calendar3'}`}></i>
              {vistaCalendario ? 'Vista Tabla' : 'Vista Calendario'}
            </button>
          }
        />

        {/* Sección de filtros */}
        <div
          className="card border-0 mb-4"
          style={{
            backgroundColor: 'rgba(0, 80, 92, 0.05)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <div
            className="card-body p-4"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '2rem',
                flexWrap: 'wrap',
                maxWidth: '100%',
                margin: '0 auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Selector de período */}
                <div className="period-selector" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
                  <label
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className="bi bi-calendar3 me-2"></i>
                    Período:
                  </label>

                  {/* Selector de Mes (primero) */}
                  <select
                    className="form-select form-select-sm"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    disabled={mesesDisponibles.length === 0}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      backgroundColor: mesesDisponibles.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      padding: '6px 12px',
                      minWidth: '150px',
                      cursor: mesesDisponibles.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: mesesDisponibles.length === 0 ? 0.6 : 1
                    }}
                    onFocus={(e) => {
                      if (mesesDisponibles.length > 0) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                      }
                    }}
                    onBlur={(e) => {
                      if (mesesDisponibles.length > 0) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                      }
                    }}
                  >
                    {mesesDisponibles.length === 0 ? (
                      <option value="0" style={{ backgroundColor: atisaStyles.colors.primary, color: 'white' }}>
                        Seleccione año
                      </option>
                    ) : (
                      mesesDisponibles.map(mes => (
                        <option key={mes} value={mes} style={{ backgroundColor: atisaStyles.colors.primary, color: 'white' }}>
                          {getMesName(mes)}
                        </option>
                      ))
                    )}
                  </select>

                  {/* Selector de Año (segundo) */}
                  <select
                    className="form-select form-select-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      padding: '6px 12px',
                      minWidth: '120px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    {anosDisponibles.map(ano => (
                      <option key={ano} value={ano} style={{ backgroundColor: atisaStyles.colors.primary, color: 'white' }}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de proceso */}
                <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className="bi bi-funnel me-2"></i>
                    Proceso:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={filtroProceso}
                    onChange={(e) => setFiltroProceso(e.target.value)}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: atisaStyles.colors.primary,
                      padding: '6px 12px',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">Todos los procesos</option>
                    {procesosDelCalendario.map(proceso => (
                      <option key={proceso.id} value={proceso.id.toString()}>
                        {proceso.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botones de acción movidos a la sección de filtros */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={abrirModalCargarProcesos}
                  style={{
                    backgroundColor: atisaStyles.colors.secondary,
                    color: 'white',
                    border: `2px solid ${atisaStyles.colors.secondary}`,
                    borderRadius: '8px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    padding: '8px 16px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                    e.currentTarget.style.borderColor = atisaStyles.colors.accent
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                    e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                  }}
                >
                  <i className="bi bi-plus-circle" style={{ color: 'white' }}></i>
                  Cargar procesos
                </button>
                {procesos.length > 0 && (
                  <button
                    className="btn"
                    onClick={abrirModalDeshabilitarDesde}
                    style={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '8px 16px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fb8c00'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ff9800'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <i className="bi bi-slash-circle" style={{ color: 'white' }}></i>
                    Deshabilitado múltiple
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => navigate(`/historial-auditoria/${clienteId}`)}
                  style={{
                    backgroundColor: atisaStyles.colors.primary,
                    color: 'white',
                    border: `2px solid ${atisaStyles.colors.primary}`,
                    borderRadius: '8px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    padding: '8px 16px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                    e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                    e.currentTarget.style.borderColor = atisaStyles.colors.primary
                  }}
                >
                  <i className="bi bi-clock-history" style={{ color: 'white' }}></i>
                  Ver Historial
                </button>
              </div>

              {/* Botones de acción - Solo visibles cuando hay cambios */}
              {Object.keys(hitosEditados).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm"
                    onClick={mostrarResumenCambios}
                    style={{
                      backgroundColor: atisaStyles.colors.primary,
                      color: 'white',
                      border: `2px solid ${atisaStyles.colors.primary}`,
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '8px 16px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                      e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                      e.currentTarget.style.borderColor = atisaStyles.colors.primary
                    }}
                  >
                    <i className="bi bi-list-ul" style={{ color: 'white' }}></i>
                    Ver Resumen
                  </button>

                  <button
                    className="btn btn-sm"
                    onClick={cancelarCambios}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: '2px solid #dc3545',
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '8px 16px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#c82333'
                      e.currentTarget.style.borderColor = '#c82333'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc3545'
                      e.currentTarget.style.borderColor = '#dc3545'
                    }}
                  >
                    <i className="bi bi-x-circle" style={{ color: 'white' }}></i>
                    Cancelar
                  </button>

                  {/* Selector de Motivo (obligatorio) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-flag" style={{ color: motivoGlobal === 0 ? '#ffc107' : 'rgba(255,255,255,0.7)', fontSize: '14px' }}></i>
                    <select
                      value={motivoGlobal}
                      onChange={(e) => setMotivoGlobal(Number(e.target.value) as MotivoAuditoria | 0)}
                      style={{
                        backgroundColor: motivoGlobal === 0 ? 'rgba(255,193,7,0.2)' : 'rgba(255,255,255,0.15)',
                        color: 'white',
                        border: `2px solid ${motivoGlobal === 0 ? '#ffc107' : 'rgba(255,255,255,0.4)'}`,
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: atisaStyles.fonts.secondary,
                        minWidth: '200px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <option value={0} style={{ backgroundColor: '#003a45', color: '#ffc107' }}>⚠ Seleccionar motivo...</option>
                      {MOTIVOS_AUDITORIA.map((m) => (
                        <option key={m.id} value={m.id} style={{ backgroundColor: '#003a45', color: 'white' }}>
                          {m.id}. {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn btn-sm"
                    onClick={guardarCambios}
                    disabled={saving || motivoGlobal === 0}
                    title={motivoGlobal === 0 ? 'Selecciona un motivo antes de guardar' : ''}
                    style={{
                      backgroundColor: motivoGlobal === 0 ? '#6c757d' : atisaStyles.colors.secondary,
                      color: 'white',
                      border: `2px solid ${motivoGlobal === 0 ? '#6c757d' : atisaStyles.colors.secondary}`,
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '8px 16px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      opacity: saving ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      cursor: motivoGlobal === 0 ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving && motivoGlobal !== 0) {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                        e.currentTarget.style.borderColor = atisaStyles.colors.accent
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving && motivoGlobal !== 0) {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                        e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                      }
                    }}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" style={{ color: 'white' }}></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle" style={{ color: 'white' }}></i>
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Layout principal */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body p-4">

            {/* Vista de calendario o tabla */}
            {vistaCalendario ? (
              /* Vista de calendario */
              <div className="calendar-view">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  {/* Cabeceras de días de la semana */}
                  <div
                    className="calendar-weekdays"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '14px',
                      width: '100%',
                      maxWidth: '100%',
                      marginBottom: '12px'
                    }}
                  >
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, idx) => (
                      <div
                        key={d}
                        style={{
                          textAlign: 'center',
                          fontWeight: '700',
                          color: atisaStyles.colors.primary,
                          backgroundColor: atisaStyles.colors.light,
                          border: `2px solid ${atisaStyles.colors.light}`,
                          borderRadius: '10px',
                          padding: '12px 8px',
                          fontSize: '14px',
                          fontFamily: atisaStyles.fonts.primary,
                          boxShadow: '0 2px 4px rgba(0, 80, 92, 0.1)'
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div
                    className="calendar-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gridTemplateRows: 'repeat(6, 1fr)',
                      gap: '14px',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                    {getCeldasCalendario().map(({ date, actual }, idx) => {
                      const hitosDelDia = getHitosDeFecha(date)
                      return (
                        <div
                          key={idx}
                          className="calendar-day"
                          style={{
                            backgroundColor: actual
                              ? (hitosDelDia.length > 0 ? '#ffffff' : '#f8fafc')
                              : '#f1f5f9',
                            border: actual
                              ? (hitosDelDia.length > 0
                                ? `2px solid ${atisaStyles.colors.accent}`
                                : '2px solid #e2e8f0')
                              : '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '10px',
                            minHeight: '180px',
                            height: '180px',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: actual && hitosDelDia.length > 0
                              ? '0 4px 14px rgba(0, 161, 222, 0.15)'
                              : actual
                                ? '0 2px 6px rgba(0, 0, 0, 0.06)'
                                : 'none',
                            cursor: 'default'
                          }}
                          onMouseEnter={(e) => {
                            if (actual) {
                              e.currentTarget.style.boxShadow = hitosDelDia.length > 0
                                ? '0 8px 24px rgba(0, 161, 222, 0.25)'
                                : '0 4px 12px rgba(0, 0, 0, 0.1)'
                              e.currentTarget.style.transform = 'translateY(-4px)'
                              e.currentTarget.style.borderColor = hitosDelDia.length > 0
                                ? atisaStyles.colors.primary
                                : atisaStyles.colors.light
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (actual) {
                              e.currentTarget.style.boxShadow = hitosDelDia.length > 0
                                ? '0 4px 14px rgba(0, 161, 222, 0.15)'
                                : '0 2px 6px rgba(0, 0, 0, 0.06)'
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.borderColor = hitosDelDia.length > 0
                                ? atisaStyles.colors.accent
                                : '#e2e8f0'
                            }
                          }}
                        >
                          {/* Header del día mejorado - versión compacta */}
                          <div
                            className="day-header"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '8px',
                              flexShrink: 0,
                              paddingBottom: '8px',
                              borderBottom: hitosDelDia.length > 0
                                ? `1px solid ${atisaStyles.colors.light}`
                                : '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* Número del día con contador integrado */}
                              <div style={{ position: 'relative' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: actual
                                      ? (hitosDelDia.length > 0 ? atisaStyles.colors.primary : atisaStyles.colors.light)
                                      : '#e2e8f0',
                                    color: actual
                                      ? (hitosDelDia.length > 0 ? 'white' : atisaStyles.colors.primary)
                                      : '#94a3b8',
                                    fontWeight: '800',
                                    fontSize: '18px',
                                    fontFamily: atisaStyles.fonts.primary,
                                    boxShadow: actual && hitosDelDia.length > 0
                                      ? '0 2px 8px rgba(0, 80, 92, 0.25)'
                                      : 'none',
                                    position: 'relative'
                                  }}
                                >
                                  {date.getDate()}
                                  {/* Contador pequeño en esquina superior derecha */}
                                  {hitosDelDia.length > 0 && (
                                    <span
                                      style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        backgroundColor: atisaStyles.colors.secondary,
                                        color: 'white',
                                        borderRadius: '10px',
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        boxShadow: '0 2px 4px rgba(156, 186, 57, 0.4)',
                                        border: '2px solid white',
                                        fontFamily: atisaStyles.fonts.secondary
                                      }}
                                      title={`${hitosDelDia.length} hito${hitosDelDia.length > 1 ? 's' : ''}`}
                                    >
                                      {hitosDelDia.length}
                                    </span>
                                  )}
                                </div>
                                {/* Indicador "Hoy" como punto rojo */}
                                {(() => {
                                  const hoy = new Date()
                                  const esHoy = date.getDate() === hoy.getDate() &&
                                    date.getMonth() === hoy.getMonth() &&
                                    date.getFullYear() === hoy.getFullYear()
                                  return esHoy && actual ? (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: '-2px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: '#dc3545',
                                        boxShadow: '0 0 0 2px white, 0 2px 4px rgba(220, 53, 69, 0.4)'
                                      }}
                                      title="Hoy"
                                    />
                                  ) : null
                                })()}
                              </div>
                            </div>
                          </div>
                          <div
                            className="day-hitos"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              flex: 1,
                              overflowY: 'auto',
                              overflowX: 'hidden',
                              paddingRight: '4px',
                              paddingTop: '4px',
                              paddingBottom: '4px',
                              maxHeight: '150px'
                            }}
                          >
                            {hitosDelDia.length === 0 ? (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '100%',
                                  color: '#9ca3af',
                                  fontSize: '11px',
                                  fontStyle: 'italic',
                                  textAlign: 'center',
                                  opacity: 0.6,
                                  padding: '20px 8px'
                                }}
                              >
                                <i className="bi bi-calendar-x" style={{ fontSize: '24px', marginBottom: '6px', opacity: 0.5 }}></i>
                                <span style={{ fontWeight: '500' }}>Sin hitos</span>
                              </div>
                            ) : (
                              hitosDelDia.map((hito, hitoIdx) => {
                                const isHabilitado = isHitoHabilitado(hito)
                                const hasChanges = hitosEditados[hito.id] !== undefined

                                // Colores corporativos Atisa
                                let accentColor = ''
                                let bgColor = ''
                                let textColor = ''

                                if (!isHabilitado) {
                                  accentColor = atisaStyles.colors.error // #FF6D22 - Naranja
                                  bgColor = '#fff5f0'
                                  textColor = atisaStyles.colors.primary
                                } else if (hasChanges) {
                                  accentColor = atisaStyles.colors.warning // #F1E800 - Amarillo
                                  bgColor = '#fffef0'
                                  textColor = atisaStyles.colors.primary
                                } else {
                                  accentColor = atisaStyles.colors.secondary // #9CBA39 - Verde claro
                                  bgColor = '#f5f9f0'
                                  textColor = atisaStyles.colors.primary
                                }

                                return (
                                  <div
                                    key={hito.id}
                                    className="hito-card"
                                    onClick={() => editarHito(hito)}
                                    style={{
                                      backgroundColor: bgColor,
                                      borderLeft: `4px solid ${accentColor}`,
                                      border: `1px solid ${accentColor}40`,
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      flexShrink: 0,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '5px',
                                      position: 'relative',
                                      boxShadow: `0 1px 3px ${accentColor}20`,
                                      fontFamily: atisaStyles.fonts.secondary
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'white'
                                      e.currentTarget.style.boxShadow = `0 2px 6px ${accentColor}40`
                                      e.currentTarget.style.borderColor = accentColor
                                      e.currentTarget.style.zIndex = '10'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = bgColor
                                      e.currentTarget.style.boxShadow = `0 1px 3px ${accentColor}20`
                                      e.currentTarget.style.borderColor = `${accentColor}40`
                                      e.currentTarget.style.zIndex = '1'
                                    }}
                                  >
                                    {/* Nombre del hito - línea única */}
                                    <div
                                      className="hito-name"
                                      style={{
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        lineHeight: '1.4',
                                        color: textColor,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontFamily: atisaStyles.fonts.secondary
                                      }}
                                      title={getNombreHito(hito.hito_id)}
                                    >
                                      {getNombreHito(hito.hito_id)}
                                    </div>

                                    {/* Información secundaria en una línea */}
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '6px',
                                      fontSize: '10px',
                                      color: atisaStyles.colors.dark
                                    }}>
                                      <div
                                        style={{
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          flex: 1,
                                          minWidth: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          fontWeight: '500'
                                        }}
                                        title={getNombreProceso(hito.cliente_proceso_id)}
                                      >
                                        <span style={{
                                          width: '5px',
                                          height: '5px',
                                          borderRadius: '50%',
                                          backgroundColor: accentColor,
                                          flexShrink: 0,
                                          boxShadow: `0 0 0 1px ${accentColor}60`
                                        }}></span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {getNombreProceso(hito.cliente_proceso_id)}
                                        </span>
                                      </div>
                                      {hito.hora_limite && (
                                        <span style={{
                                          whiteSpace: 'nowrap',
                                          flexShrink: 0,
                                          fontWeight: '700',
                                          color: accentColor,
                                          fontSize: '10px'
                                        }}>
                                          {hito.hora_limite.substring(0, 5)}
                                        </span>
                                      )}
                                      {/* Indicadores de estado como iconos pequeños */}
                                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        {hasChanges && (
                                          <i
                                            className="bi bi-pencil-fill"
                                            style={{ fontSize: '10px', color: atisaStyles.colors.warning }}
                                            title="Modificado"
                                          />
                                        )}
                                        {!isHabilitado && (
                                          <i
                                            className="bi bi-x-circle-fill"
                                            style={{ fontSize: '10px', color: atisaStyles.colors.error }}
                                            title="Deshabilitado"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Vista de tabla mejorada */
              <div
                className="hitos-table-container"
                style={{
                  width: '100%',
                  maxWidth: '2000px' // Aprovechar el 80% del espacio
                }}
              >

                <div
                  className="table-responsive"
                  style={{
                    width: '100%',
                    overflowX: 'auto'
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-3" style={{ gap: '12px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre de hito..."
                        value={busquedaNombre}
                        onChange={(e) => setBusquedaNombre(e.target.value)}
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          fontSize: '14px',
                          border: `1px solid ${atisaStyles.colors.light}`,
                          borderRadius: '6px',
                          paddingRight: searchingNombre ? '50px' : '12px'
                        }}
                      />
                      {searchingNombre && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                          }}
                        >
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                            style={{
                              color: atisaStyles.colors.primary,
                              width: '20px',
                              height: '20px'
                            }}
                          >
                            <span className="visually-hidden">Buscando...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <table
                    className="hitos-table"
                    style={{
                      width: '100%',
                      minWidth: '800px', // Ancho mínimo reducido
                      borderCollapse: 'collapse',
                      fontFamily: atisaStyles.fonts.secondary,
                      tableLayout: 'fixed' // Para controlar mejor el ancho de las columnas
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: atisaStyles.colors.primary, color: 'white' }}>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'left',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            width: '40%',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.2s ease'
                          }}
                          onClick={() => handleSort('hito')}
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
                          style={{
                            padding: '16px',
                            textAlign: 'left',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            width: '25%',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.2s ease'
                          }}
                          onClick={() => handleSort('proceso')}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                          }}
                        >
                          Proceso {getSortIcon('proceso')}
                        </th>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'left',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            width: '20%',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.2s ease'
                          }}
                          onClick={() => handleSort('fecha_limite')}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                          }}
                        >
                          Fecha Límite {getSortIcon('fecha_limite')}
                        </th>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'left',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            width: '15%',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.2s ease'
                          }}
                          onClick={() => handleSort('hora_limite')}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                          }}
                        >
                          Hora Límite {getSortIcon('hora_limite')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingHitos ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-4"
                            style={{
                              backgroundColor: '#f8f9fa',
                              fontFamily: atisaStyles.fonts.secondary,
                              padding: '2rem'
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
                        getHitosFiltrados().map((hito, index) => {
                          const hasChanges = hitosEditados[hito.id] !== undefined

                          return (
                            <tr
                              key={hito.id}
                              style={{
                                backgroundColor: hasChanges
                                  ? '#fff3cd'
                                  : !isHitoHabilitado(hito)
                                    ? '#f8d7da'
                                    : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                                transition: 'all 0.2s ease',
                                borderLeft: hasChanges
                                  ? `4px solid ${atisaStyles.colors.warning}`
                                  : !isHitoHabilitado(hito)
                                    ? '4px solid #dc3545'
                                    : 'none',
                                opacity: !isHitoHabilitado(hito) ? 0.8 : 1
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = hasChanges
                                  ? '#ffeaa7'
                                  : !isHitoHabilitado(hito)
                                    ? '#f5c6cb'
                                    : atisaStyles.colors.light
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = hasChanges
                                  ? '#fff3cd'
                                  : !isHitoHabilitado(hito)
                                    ? '#f8d7da'
                                    : (index % 2 === 0 ? 'white' : '#f8f9fa')
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            >
                              <td style={{ padding: '16px', verticalAlign: 'top', width: '40%' }}>
                                <div
                                  className="hito-info"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  {/* Selección se traslada al modal; eliminamos checkbox por fila */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => toggleHabilitarHito(hito)}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '10px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: isHitoHabilitado(hito) ? '#dc3545' : '#28a745',
                                        color: 'white',
                                        fontWeight: '500',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        flexShrink: 0,
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isHitoHabilitado(hito) ? '#c82333' : '#218838'
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isHitoHabilitado(hito) ? '#dc3545' : '#28a745'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                                      }}
                                      title={isHitoHabilitado(hito) ? 'Deshabilitar hito' : 'Habilitar hito'}
                                    >
                                      <i className={`bi ${isHitoHabilitado(hito) ? 'bi-x-circle' : 'bi-check-circle'}`}></i>
                                      {isHitoHabilitado(hito) ? 'Deshabilitar' : 'Habilitar'}
                                    </button>
                                    <span
                                      style={{
                                        fontFamily: atisaStyles.fonts.secondary,
                                        color: atisaStyles.colors.primary,
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        lineHeight: '1.4',
                                        wordWrap: 'break-word',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        flex: 1
                                      }}
                                    >
                                      {getNombreHito(hito.hito_id)}
                                    </span>
                                    {hasChanges && (
                                      <i className="bi bi-pencil-square" style={{ color: '#ffc107' }}></i>
                                    )}
                                  </div>

                                </div>
                              </td>
                              <td style={{ padding: '16px', verticalAlign: 'top', width: '25%' }}>
                                <span
                                  style={{
                                    fontFamily: atisaStyles.fonts.secondary,
                                    color: atisaStyles.colors.dark,
                                    fontSize: '12px',
                                    backgroundColor: atisaStyles.colors.light,
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    display: 'inline-block',
                                    fontWeight: '500',
                                    wordWrap: 'break-word',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%'
                                  }}
                                >
                                  {getNombreProceso(hito.cliente_proceso_id)}
                                </span>
                              </td>

                              <td style={{ padding: '16px', verticalAlign: 'top', width: '20%' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={formatDateForInput(getValorHito(hito, 'fecha_limite'))}
                                    onChange={(e) => handleFechaChange(hito.id, 'fecha_limite', e.target.value)}
                                    data-hito-id={hito.id}
                                    data-campo="fecha_limite"
                                    style={{
                                      fontFamily: atisaStyles.fonts.secondary,
                                      fontSize: '12px',
                                      border: hasChanges ? `2px solid ${atisaStyles.colors.warning}` : `1px solid ${atisaStyles.colors.light}`,
                                      borderRadius: '6px',
                                      width: '100%'
                                    }}
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '16px', verticalAlign: 'top', width: '15%' }}>
                                <input
                                  type="time"
                                  className="form-control form-control-sm"
                                  value={formatTimeForInput(getValorHito(hito, 'hora_limite'))}
                                  onChange={(e) => handleHoraChange(hito.id, e.target.value)}

                                  style={{
                                    fontFamily: atisaStyles.fonts.secondary,
                                    fontSize: '12px',
                                    border: hasChanges ? `2px solid ${atisaStyles.colors.warning}` : `1px solid ${atisaStyles.colors.light}`,
                                    borderRadius: '6px',
                                    width: '100%'
                                  }}
                                />
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Modal de edición de hito mejorado */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header
          style={{
            backgroundColor: atisaStyles.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px 12px 0 0',
            padding: '20px 24px'
          }}
        >
          <Modal.Title
            style={{
              fontFamily: atisaStyles.fonts.primary,
              fontWeight: 'bold',
              color: 'white',
              fontSize: '1.25rem',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <i className="bi bi-pencil-square" style={{ color: 'white' }}></i>
            Editar Hito
          </Modal.Title>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={() => setShowEditModal(false)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <i className="bi bi-x" style={{ color: 'white', fontSize: '16px' }}></i>
          </button>
        </Modal.Header>

        <Modal.Body style={{ padding: '24px' }}>
          {/* Información del hito */}
          <div
            className="mb-4 p-3"
            style={{
              backgroundColor: atisaStyles.colors.light,
              borderRadius: '8px',
              border: `1px solid ${atisaStyles.colors.accent}`
            }}
          >
            <div className="row">
              <div className="col-md-6">
                <label style={{ fontSize: '12px', fontWeight: '600', color: atisaStyles.colors.dark, marginBottom: '4px' }}>
                  HITO
                </label>
                <div style={{ fontSize: '14px', fontWeight: '600', color: atisaStyles.colors.primary }}>
                  {selectedHito ? getNombreHito(selectedHito.hito_id) : ''}
                </div>
              </div>
              <div className="col-md-6">
                <label style={{ fontSize: '12px', fontWeight: '600', color: atisaStyles.colors.dark, marginBottom: '4px' }}>
                  PROCESO
                </label>
                <div style={{ fontSize: '14px', color: atisaStyles.colors.dark }}>
                  {selectedHito ? getNombreProceso(selectedHito.cliente_proceso_id) : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de edición */}
          <div className="hito-edit-form">
            {/* Advertencia sobre cambio de mes */}
            {selectedHito && selectedPeriod && editForm.fecha_limite && (() => {
              const fechaSeleccionada = new Date(editForm.fecha_limite)
              const [year, month] = selectedPeriod.split('-').map(Number)
              const mesSeleccionado = new Date(year, month - 1, 1)
              const esMesDiferente = fechaSeleccionada.getFullYear() !== year || fechaSeleccionada.getMonth() !== (month - 1)

              return esMesDiferente ? (
                <div
                  className="alert alert-warning mb-4"
                  style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="bi bi-exclamation-triangle" style={{ color: '#856404', fontSize: '16px' }}></i>
                  <div>
                    <strong style={{ color: '#856404', fontSize: '14px' }}>Cambio de mes detectado</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#856404' }}>
                      La fecha seleccionada está en un mes diferente al período actual.
                      El hito se moverá al mes correspondiente.
                    </p>
                  </div>
                </div>
              ) : null
            })()}

            <div className="row">
              <div className="col-md-6">
                <div className="form-group mb-4">
                  <label className="form-label" style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: atisaStyles.colors.dark,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="bi bi-calendar3" style={{ color: atisaStyles.colors.primary }}></i>
                    Fecha Límite *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={editForm.fecha_limite || ''}
                    onChange={(e) => {
                      const newVal = e.target.value || ''
                      if (!newVal) {
                        showToastMessage('La fecha límite es obligatoria y no se puede dejar vacía', 'warning')
                        e.target.value = editForm.fecha_limite || ''
                        return
                      }
                      setEditForm({ ...editForm, fecha_limite: newVal })
                    }}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      border: `2px solid ${atisaStyles.colors.light}`,
                      borderRadius: '8px',
                      padding: '12px',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = atisaStyles.colors.accent
                      e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = atisaStyles.colors.light
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group mb-4">
                  <label className="form-label" style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: atisaStyles.colors.dark,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="bi bi-clock" style={{ color: atisaStyles.colors.primary }}></i>
                    Hora Límite
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    value={editForm.hora_limite || ''}
                    onChange={(e) => setEditForm({ ...editForm, hora_limite: e.target.value || null })}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      border: `2px solid ${atisaStyles.colors.light}`,
                      borderRadius: '8px',
                      padding: '12px',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = atisaStyles.colors.accent
                      e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = atisaStyles.colors.light
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Motivo de Auditoría */}
            <div className="form-group mb-4">
              <label className="form-label" style={{
                fontSize: '14px',
                fontWeight: '600',
                color: atisaStyles.colors.dark,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="bi bi-flag" style={{ color: atisaStyles.colors.primary }}></i>
                Motivo de modificación *
              </label>
              <select
                className="form-select"
                value={editForm.motivo}
                onChange={(e) => setEditForm({ ...editForm, motivo: parseInt(e.target.value) as MotivoAuditoria })}
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.accent
                  e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.light
                  e.target.style.boxShadow = 'none'
                }}
              >
                <option value={0} disabled>Seleccione un motivo...</option>
                {MOTIVOS_AUDITORIA.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}. {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Observaciones */}
            <div className="form-group mb-4">
              <label className="form-label" style={{
                fontSize: '14px',
                fontWeight: '600',
                color: atisaStyles.colors.dark,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="bi bi-chat-text" style={{ color: atisaStyles.colors.primary }}></i>
                Observaciones
              </label>
              <textarea
                className="form-control"
                value={editForm.observaciones}
                onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })}
                rows={4}
                placeholder="Agregue observaciones sobre los cambios realizados en este hito..."
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  padding: '12px',
                  resize: 'vertical',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.accent
                  e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.light
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer
          style={{
            backgroundColor: '#f8f9fa',
            border: 'none',
            padding: '20px 24px',
            borderRadius: '0 0 12px 12px'
          }}
        >
          <button
            className="btn"
            onClick={() => setShowEditModal(false)}
            style={{
              fontFamily: atisaStyles.fonts.secondary,
              fontSize: '14px',
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <i className="bi bi-x-circle me-2"></i>
            Cancelar
          </button>
          <button
            className="btn"
            onClick={guardarHito}
            style={{
              fontFamily: atisaStyles.fonts.secondary,
              fontSize: '14px',
              padding: '10px 20px',
              backgroundColor: atisaStyles.colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 186, 57, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            Guardar Cambios
          </button>
        </Modal.Footer>
      </Modal>


      {/* Notificaciones Toast */}
      <CustomToast
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        message="Los cambios se han guardado correctamente"
        type="success"
        delay={3000}
      />
      <CustomToast
        show={showError}
        onClose={() => setShowError(false)}
        message={errorMessage || 'Ha ocurrido un error al guardar los cambios'}
        type="error"
        delay={5000}
      />

      {/* Modal deshabilitar desde fecha */}
      {
        showDeshabilitarDesdeModal && (
          <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="modal-dialog">
              <div className="modal-content" style={{ borderRadius: 12 }}>
                <div className="modal-header" style={{ backgroundColor: atisaStyles.colors.primary, color: 'white', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                  <h5 className="modal-title" style={{
                    margin: 0,
                    fontFamily: atisaStyles.fonts.primary,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>Deshabilitar desde fecha</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeshabilitarDesdeModal(false)}></button>
                </div>
                <div className="modal-body" style={{ fontFamily: atisaStyles.fonts.secondary }}>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 600 }}>Fecha desde</label>
                    <input type="date" className="form-control" value={fechaDesdeDeshabilitar} onChange={(e) => setFechaDesdeDeshabilitar(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 600 }}>Tipo de deshabilitación</label>
                    <div className="btn-group w-100" role="group">
                      <button
                        type="button"
                        className={`btn ${modoDeshabilitar === 'hitos' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => {
                          setModoDeshabilitar('hitos')
                          // No resetear selecciones, solo limpiar búsquedas
                          setBusquedaHitosModal('')
                          setBusquedaProcesosModal('')
                          // Sincronizar procesos basado en hitos seleccionados
                          setTimeout(() => {
                            sincronizarProcesosDesdeHitos()
                          }, 0)
                        }}
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (modoDeshabilitar !== 'hitos') {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                            e.currentTarget.style.color = 'white'
                            e.currentTarget.style.borderColor = atisaStyles.colors.primary
                            e.currentTarget.style.transform = 'translateY(-2px)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (modoDeshabilitar !== 'hitos') {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = atisaStyles.colors.primary
                            e.currentTarget.style.borderColor = atisaStyles.colors.primary
                            e.currentTarget.style.transform = 'translateY(0)'
                          }
                        }}
                      >
                        Por Hitos
                      </button>
                      <button
                        type="button"
                        className={`btn ${modoDeshabilitar === 'procesos' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => {
                          setModoDeshabilitar('procesos')
                          // No resetear selecciones, solo limpiar búsquedas
                          setBusquedaHitosModal('')
                          setBusquedaProcesosModal('')
                          // Sincronizar hitos basado en procesos seleccionados
                          setTimeout(() => {
                            const procesosSeleccionados = Array.from(selectedProcesos)
                            const hitosASeleccionar = new Set<number>()
                            procesosSeleccionados.forEach(procesoId => {
                              const hitosDelProceso = getHitosFiltrados().filter(h => h.cliente_proceso_id === procesoId)
                              hitosDelProceso.forEach(h => hitosASeleccionar.add(h.hito_id))
                            })
                            setSelectedHitosMaestro(hitosASeleccionar)
                          }, 0)
                        }}
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (modoDeshabilitar !== 'procesos') {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                            e.currentTarget.style.color = 'white'
                            e.currentTarget.style.borderColor = atisaStyles.colors.primary
                            e.currentTarget.style.transform = 'translateY(-2px)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (modoDeshabilitar !== 'procesos') {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = atisaStyles.colors.primary
                            e.currentTarget.style.borderColor = atisaStyles.colors.primary
                            e.currentTarget.style.transform = 'translateY(0)'
                          }
                        }}
                      >
                        Por Procesos
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 d-flex justify-content-between align-items-center" style={{ gap: '8px' }}>
                    <label className="form-label m-0" style={{ fontWeight: 600 }}>
                      {modoDeshabilitar === 'hitos' ? 'Seleccione los hitos a deshabilitar' : 'Seleccione los procesos a deshabilitar'}
                    </label>
                    <small style={{ color: atisaStyles.colors.dark }}>
                      {modoDeshabilitar === 'hitos' ? selectedHitosMaestro.size : selectedProcesos.size} seleccionados
                    </small>
                  </div>
                  <div className="d-flex align-items-center mb-2" style={{ gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder={modoDeshabilitar === 'hitos' ? 'Buscar hito...' : 'Buscar proceso...'}
                      value={modoDeshabilitar === 'hitos' ? busquedaHitosModal : busquedaProcesosModal}
                      onChange={(e) => {
                        if (modoDeshabilitar === 'hitos') {
                          setBusquedaHitosModal(e.target.value)
                        } else {
                          setBusquedaProcesosModal(e.target.value)
                        }
                      }}
                      style={{ maxWidth: 260 }}
                    />
                    <button
                      className="btn btn-sm"
                      style={{
                        backgroundColor: atisaStyles.colors.light,
                        border: `1px solid ${atisaStyles.colors.accent}`,
                        color: atisaStyles.colors.primary,
                        fontFamily: atisaStyles.fonts.secondary,
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => {
                        if (modoDeshabilitar === 'hitos') {
                          const ids = Array.from(new Set(getHitosFiltrados().map(h => h.hito_id)))
                          setSelectedHitosMaestro(new Set(ids))
                        } else {
                          // Seleccionar todos los procesos y sus hitos
                          const procesosIds = getProcesosFiltrados().map(p => p.id)
                          setSelectedProcesos(new Set(procesosIds))
                          const todosLosHitos = getHitosFiltrados().map(h => h.hito_id)
                          setSelectedHitosMaestro(new Set(todosLosHitos))
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                        e.currentTarget.style.color = 'white'
                        e.currentTarget.style.borderColor = atisaStyles.colors.accent
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 161, 222, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                        e.currentTarget.style.color = atisaStyles.colors.primary
                        e.currentTarget.style.borderColor = atisaStyles.colors.accent
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >Seleccionar todos</button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => {
                        setSelectedHitosMaestro(new Set())
                        setSelectedProcesos(new Set())
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#6c757d'
                        e.currentTarget.style.color = 'white'
                        e.currentTarget.style.borderColor = '#6c757d'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(108, 117, 125, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#6c757d'
                        e.currentTarget.style.borderColor = '#6c757d'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >Limpiar</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: 320, overflowY: 'auto' }}>
                    {modoDeshabilitar === 'hitos' ? (
                      // Lista de hitos
                      Array.from(new Set(getHitosFiltrados().map(h => `${h.hito_id}|${getNombreHito(h.hito_id)}`)))
                        .map(key => {
                          const [idStr, nombre] = key.split('|')
                          return { id: parseInt(idStr, 10), nombre }
                        })
                        .filter(item =>
                          item.nombre
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .includes(
                              busquedaHitosModal
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .trim()
                            )
                        )
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                        .map(({ id, nombre }) => {
                          const checked = selectedHitosMaestro.has(id)
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                setSelectedHitosMaestro(prev => {
                                  const n = new Set(prev);
                                  checked ? n.delete(id) : n.add(id);
                                  return n
                                })
                                // Sincronizar procesos después de un pequeño delay para que el estado se actualice
                                setTimeout(() => {
                                  sincronizarProcesosDesdeHitos()
                                }, 0)
                              }}
                              role="button"
                              className="d-flex align-items-center"
                              style={{
                                backgroundColor: checked ? '#e8f5e9' : 'white',
                                border: `2px solid ${checked ? atisaStyles.colors.accent : '#e9ecef'}`,
                                borderRadius: 10,
                                padding: '10px 12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all .2s ease'
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                              title={nombre}
                            >
                              <span
                                className="d-inline-flex justify-content-center align-items-center me-2"
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  backgroundColor: checked ? atisaStyles.colors.secondary : '#f1f3f5',
                                  color: checked ? 'white' : atisaStyles.colors.primary,
                                  border: `1px solid ${checked ? atisaStyles.colors.accent : '#e9ecef'}`,
                                  fontSize: 12,
                                  flexShrink: 0
                                }}
                              >
                                {checked ? '✓' : ''}
                              </span>
                              <span style={{ fontWeight: 600, color: atisaStyles.colors.primary, fontSize: 13, lineHeight: 1.2 }}>{nombre}</span>
                            </div>
                          )
                        })
                    ) : (
                      // Lista de procesos
                      getProcesosFiltrados()
                        .filter(proceso => {
                          const procesoNombre = procesosList.find(p => p.id === proceso.proceso_id)?.nombre || ''
                          return procesoNombre
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .includes(
                              busquedaProcesosModal
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .trim()
                            )
                        })
                        .sort((a, b) => {
                          const nombreA = procesosList.find(p => p.id === a.proceso_id)?.nombre || ''
                          const nombreB = procesosList.find(p => p.id === b.proceso_id)?.nombre || ''
                          return nombreA.localeCompare(nombreB)
                        })
                        .map(proceso => {
                          const procesoNombre = procesosList.find(p => p.id === proceso.proceso_id)?.nombre || ''
                          const checked = selectedProcesos.has(proceso.id)
                          return (
                            <div
                              key={proceso.id}
                              onClick={() => {
                                if (checked) {
                                  // Deseleccionar proceso y sus hitos
                                  setSelectedProcesos(prev => {
                                    const n = new Set(prev)
                                    n.delete(proceso.id)
                                    return n
                                  })
                                  // Remover todos los hitos de este proceso
                                  const hitosDelProceso = getHitosFiltrados().filter(h => h.cliente_proceso_id === proceso.id)
                                  setSelectedHitosMaestro(prev => {
                                    const n = new Set(prev)
                                    hitosDelProceso.forEach(h => n.delete(h.hito_id))
                                    return n
                                  })
                                } else {
                                  // Seleccionar proceso y todos sus hitos
                                  setSelectedProcesos(prev => {
                                    const n = new Set(prev)
                                    n.add(proceso.id)
                                    return n
                                  })
                                  // Agregar todos los hitos de este proceso
                                  const hitosDelProceso = getHitosFiltrados().filter(h => h.cliente_proceso_id === proceso.id)
                                  setSelectedHitosMaestro(prev => {
                                    const n = new Set(prev)
                                    hitosDelProceso.forEach(h => n.add(h.hito_id))
                                    return n
                                  })
                                }
                              }}
                              role="button"
                              className="d-flex align-items-center"
                              style={{
                                backgroundColor: checked ? '#e8f5e9' : 'white',
                                border: `2px solid ${checked ? atisaStyles.colors.accent : '#e9ecef'}`,
                                borderRadius: 10,
                                padding: '10px 12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all .2s ease'
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                              title={procesoNombre}
                            >
                              <span
                                className="d-inline-flex justify-content-center align-items-center me-2"
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  backgroundColor: checked ? atisaStyles.colors.secondary : '#f1f3f5',
                                  color: checked ? 'white' : atisaStyles.colors.primary,
                                  border: `1px solid ${checked ? atisaStyles.colors.accent : '#e9ecef'}`,
                                  fontSize: 12,
                                  flexShrink: 0
                                }}
                              >
                                {checked ? '✓' : ''}
                              </span>
                              <span style={{ fontWeight: 600, color: atisaStyles.colors.primary, fontSize: 13, lineHeight: 1.2 }}>{procesoNombre}</span>
                            </div>
                          )
                        })
                    )}
                  </div>
                  <p style={{ margin: '8px 0 0 0' }}>
                    {modoDeshabilitar === 'hitos'
                      ? 'Se deshabilitarán los hitos maestros seleccionados a partir de la fecha indicada.'
                      : 'Se deshabilitarán todos los hitos de los procesos seleccionados a partir de la fecha indicada.'
                    }
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDeshabilitarDesdeModal(false)}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#5a6268'
                      e.currentTarget.style.borderColor = '#5a6268'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(108, 117, 125, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6c757d'
                      e.currentTarget.style.borderColor = '#6c757d'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >Cancelar</button>
                  <button
                    className="btn btn-danger"
                    onClick={confirmarDeshabilitarDesde}
                    disabled={!fechaDesdeDeshabilitar || (modoDeshabilitar === 'hitos' ? selectedHitosMaestro.size === 0 : selectedProcesos.size === 0)}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      opacity: (!fechaDesdeDeshabilitar || (modoDeshabilitar === 'hitos' ? selectedHitosMaestro.size === 0 : selectedProcesos.size === 0)) ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!(!fechaDesdeDeshabilitar || (modoDeshabilitar === 'hitos' ? selectedHitosMaestro.size === 0 : selectedProcesos.size === 0))) {
                        e.currentTarget.style.backgroundColor = '#c82333'
                        e.currentTarget.style.borderColor = '#c82333'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(!fechaDesdeDeshabilitar || (modoDeshabilitar === 'hitos' ? selectedHitosMaestro.size === 0 : selectedProcesos.size === 0))) {
                        e.currentTarget.style.backgroundColor = '#dc3545'
                        e.currentTarget.style.borderColor = '#dc3545'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }
                    }}
                  >
                    Deshabilitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de confirmación para habilitar/deshabilitar hito */}
      {
        showConfirmarHabilitarModal && hitoAConfirmar && (
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
                    backgroundColor: isHitoHabilitado(hitoAConfirmar) ? '#f59e0b' : atisaStyles.colors.secondary,
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
                    <i className={`bi ${isHitoHabilitado(hitoAConfirmar) ? 'bi-x-circle-fill' : 'bi-check-circle-fill'}`} style={{ color: 'white', fontSize: '1.5rem' }}></i>
                    {isHitoHabilitado(hitoAConfirmar) ? 'Deshabilitar Hito' : 'Habilitar Hito'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={cancelarCambioEstado}
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
                        backgroundColor: isHitoHabilitado(hitoAConfirmar) ? '#fff3cd' : '#d1f0de',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <i className={`bi ${isHitoHabilitado(hitoAConfirmar) ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`} style={{ color: isHitoHabilitado(hitoAConfirmar) ? '#f59e0b' : atisaStyles.colors.secondary, fontSize: '24px' }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h6
                        style={{
                          color: atisaStyles.colors.primary,
                          marginBottom: '12px',
                          fontFamily: atisaStyles.fonts.primary,
                          fontWeight: 'bold',
                          fontSize: '1rem'
                        }}
                      >
                        <i className="bi bi-info-circle me-2"></i>
                        Información del Hito
                      </h6>
                      <div
                        style={{
                          backgroundColor: '#f8f9fa',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          border: `1px solid ${atisaStyles.colors.light}`
                        }}
                      >
                        <div style={{ marginBottom: '8px', fontFamily: atisaStyles.fonts.secondary }}>
                          <strong>Hito:</strong> {getNombreHito(hitoAConfirmar.hito_id)}
                        </div>
                        <div style={{ marginBottom: '8px', fontFamily: atisaStyles.fonts.secondary }}>
                          <strong>Proceso:</strong> {procesosList.find(p => p.id === procesos.find(cp => cp.id === hitoAConfirmar.cliente_proceso_id)?.proceso_id)?.nombre || 'Proceso desconocido'}
                        </div>
                        <div style={{ fontFamily: atisaStyles.fonts.secondary }}>
                          <strong>Estado actual:</strong>
                          <span
                            style={{
                              marginLeft: '8px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: isHitoHabilitado(hitoAConfirmar) ? '#d4edda' : '#f8d7da',
                              color: isHitoHabilitado(hitoAConfirmar) ? '#155724' : '#721c24',
                              border: `1px solid ${isHitoHabilitado(hitoAConfirmar) ? '#c3e6cb' : '#f5c6cb'}`
                            }}
                          >
                            {isHitoHabilitado(hitoAConfirmar) ? '✓ Habilitado' : '✗ Deshabilitado'}
                          </span>
                        </div>
                      </div>
                      <div
                        className="alert"
                        style={{
                          backgroundColor: isHitoHabilitado(hitoAConfirmar) ? '#fff3cd' : '#d1ecf1',
                          border: `1px solid ${isHitoHabilitado(hitoAConfirmar) ? '#ffc107' : '#bee5eb'}`,
                          color: isHitoHabilitado(hitoAConfirmar) ? '#856404' : '#0c5460',
                          borderRadius: '8px',
                          marginBottom: '0',
                          fontFamily: atisaStyles.fonts.secondary
                        }}
                      >
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        <strong>¿Está seguro?</strong>
                        {isHitoHabilitado(hitoAConfirmar)
                          ? ' Este hito será deshabilitado y no aparecerá en el calendario del cliente.'
                          : ' Este hito será habilitado y estará disponible en el calendario del cliente.'
                        }
                      </div>
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
                    onClick={cancelarCambioEstado}
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
                    onClick={confirmarCambioEstado}
                    style={{
                      backgroundColor: isHitoHabilitado(hitoAConfirmar) ? '#f59e0b' : atisaStyles.colors.secondary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '10px 20px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: isHitoHabilitado(hitoAConfirmar) ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(156, 186, 57, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isHitoHabilitado(hitoAConfirmar) ? '#d97706' : atisaStyles.colors.accent
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = isHitoHabilitado(hitoAConfirmar) ? '0 4px 12px rgba(245, 158, 11, 0.4)' : '0 4px 12px rgba(156, 186, 57, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isHitoHabilitado(hitoAConfirmar) ? '#f59e0b' : atisaStyles.colors.secondary
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = isHitoHabilitado(hitoAConfirmar) ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(156, 186, 57, 0.3)'
                    }}
                  >
                    <i className={`bi ${isHitoHabilitado(hitoAConfirmar) ? 'bi-x-circle' : 'bi-check-circle'} me-2`}></i>
                    {isHitoHabilitado(hitoAConfirmar) ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para cargar procesos */}
      {
        showCargarProcesosModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: atisaStyles.colors.primary, color: 'white' }}>
                  <h5 className="modal-title" style={{ color: 'white' }}>
                    <i className="bi bi-plus-circle me-2"></i>
                    Cargar Procesos al Calendario
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={cerrarModalCargarProcesos}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: '600', color: atisaStyles.colors.primary }}>
                      <i className="bi bi-search me-2"></i>
                      Buscar procesos
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Escriba para filtrar procesos..."
                      value={busquedaProcesos}
                      onChange={(e) => setBusquedaProcesos(e.target.value)}
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        border: `2px solid ${atisaStyles.colors.light}`,
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: '600', color: atisaStyles.colors.primary }}>
                      <i className="bi bi-calendar-date me-2"></i>
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={fechaInicioProcesos}
                      onChange={(e) => setFechaInicioProcesos(e.target.value)}
                      required
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        border: `2px solid ${atisaStyles.colors.light}`,
                        borderRadius: '6px',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = atisaStyles.colors.accent
                        e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = atisaStyles.colors.light
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: '600', color: atisaStyles.colors.primary }}>
                      <i className="bi bi-funnel me-2"></i>
                      Filtrar por Temporalidad
                    </label>
                    <select
                      className="form-control"
                      value={filtroTemporalidad}
                      onChange={(e) => setFiltroTemporalidad(e.target.value)}
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        border: `2px solid ${atisaStyles.colors.light}`,
                        borderRadius: '6px',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = atisaStyles.colors.accent
                        e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = atisaStyles.colors.light
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      <option value="">Todas las temporalidades</option>
                      <option value="mes">Mensual</option>
                      <option value="trimestre">Trimestral</option>
                      <option value="semestre">Semestral</option>
                      <option value="año">Anual</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: '600', color: atisaStyles.colors.primary }}>
                      Procesos disponibles ({procesosDisponibles.filter(proceso => {
                        const coincideNombre = proceso.nombre.toLowerCase().includes(busquedaProcesos.toLowerCase())
                        const coincideTemporalidad = !filtroTemporalidad || proceso.temporalidad === filtroTemporalidad
                        return coincideNombre && coincideTemporalidad
                      }).length})
                    </label>
                    <div
                      style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: `1px solid ${atisaStyles.colors.light}`,
                        borderRadius: '6px',
                        padding: '8px'
                      }}
                    >
                      {procesosDisponibles
                        .filter(proceso => {
                          const coincideNombre = proceso.nombre.toLowerCase().includes(busquedaProcesos.toLowerCase())
                          const coincideTemporalidad = !filtroTemporalidad || proceso.temporalidad === filtroTemporalidad
                          return coincideNombre && coincideTemporalidad
                        })
                        .map((proceso) => {
                          return (
                            <div
                              key={proceso.id}
                              className="d-flex align-items-center p-2"
                              style={{
                                borderBottom: '1px solid #f0f0f0',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s ease',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = atisaStyles.colors.light + '20'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleSeleccionProceso(proceso.id)
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={procesosSeleccionados.has(proceso.id)}
                                readOnly
                                style={{ marginRight: '12px' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: '600',
                                  color: atisaStyles.colors.primary,
                                  fontSize: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}>
                                  <span>{proceso.nombre}</span>
                                  <span style={{
                                    fontSize: '11px',
                                    backgroundColor: atisaStyles.colors.accent,
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: '500',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    {proceso.temporalidad}
                                  </span>
                                </div>
                                {proceso.descripcion && (
                                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                    {proceso.descripcion}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}

                      {procesosDisponibles.filter(proceso => {
                        const coincideNombre = proceso.nombre.toLowerCase().includes(busquedaProcesos.toLowerCase())
                        const coincideTemporalidad = !filtroTemporalidad || proceso.temporalidad === filtroTemporalidad
                        return coincideNombre && coincideTemporalidad
                      }).length === 0 && (
                          <div className="text-center py-4" style={{ color: '#666' }}>
                            <i className="bi bi-inbox fs-1"></i>
                            <p className="mt-2 mb-0">No hay procesos disponibles</p>
                          </div>
                        )}
                    </div>
                  </div>

                  {procesosSeleccionados.size > 0 && (
                    <div className="mt-3">
                      <h6 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: atisaStyles.colors.primary,
                        marginBottom: '8px'
                      }}>
                        <i className="bi bi-check-circle me-2"></i>
                        Procesos seleccionados ({procesosSeleccionados.size})
                      </h6>
                      <div
                        style={{
                          maxHeight: '150px',
                          overflowY: 'auto',
                          border: `1px solid ${atisaStyles.colors.light}`,
                          borderRadius: '6px',
                          backgroundColor: '#f8f9fa'
                        }}
                      >
                        {Array.from(procesosSeleccionados).map(procesoId => {
                          const proceso = procesosDisponibles.find(p => p.id === procesoId)
                          if (!proceso) return null
                          return (
                            <div
                              key={proceso.id}
                              className="d-flex align-items-center justify-content-between p-2"
                              style={{ borderBottom: '1px solid #e9ecef' }}
                            >
                              <span style={{ fontSize: '13px', fontFamily: atisaStyles.fonts.secondary }}>
                                {proceso.nombre}
                              </span>
                              <i
                                className="bi bi-x-circle text-danger"
                                style={{ cursor: 'pointer', fontSize: '14px' }}
                                onClick={() => toggleSeleccionProceso(proceso.id)}
                                title="Desmarcar proceso"
                              ></i>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarModalCargarProcesos}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#5a6268'
                      e.currentTarget.style.borderColor = '#5a6268'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(108, 117, 125, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6c757d'
                      e.currentTarget.style.borderColor = '#6c757d'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: atisaStyles.colors.accent,
                      color: 'white',
                      opacity: (procesosSeleccionados.size === 0 || !fechaInicioProcesos) ? 0.6 : 1,
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      border: `2px solid ${atisaStyles.colors.accent}`,
                      boxShadow: (procesosSeleccionados.size > 0 && fechaInicioProcesos) ? '0 2px 8px rgba(0, 161, 222, 0.3)' : 'none'
                    }}
                    onClick={cargarProcesosSeleccionados}
                    disabled={procesosSeleccionados.size === 0 || !fechaInicioProcesos}
                    onMouseEnter={(e) => {
                      if (!(procesosSeleccionados.size === 0 || !fechaInicioProcesos)) {
                        e.currentTarget.style.backgroundColor = '#0099cc'
                        e.currentTarget.style.borderColor = '#0099cc'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 161, 222, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(procesosSeleccionados.size === 0 || !fechaInicioProcesos)) {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                        e.currentTarget.style.borderColor = atisaStyles.colors.accent
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 161, 222, 0.3)'
                      }
                    }}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Cargar {procesosSeleccionados.size > 0 ? `(${procesosSeleccionados.size})` : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Custom Toast */}
      <CustomToast
        show={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
        delay={5000}
      />
    </>
  )
}

export default EditarCalendarioCliente
