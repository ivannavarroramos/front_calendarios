import { FC, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { atisaStyles, getSecondaryButtonStyles } from '../../../../styles/atisaStyles'
import { formatDateDisplay, formatDateTimeDisplay } from '../../../../utils/dateFormatter'
import SharedPagination from '../../../../components/pagination/SharedPagination'
import { Cliente, getClienteById } from '../../../../api/clientes'
import { ClienteProcesoHitoCumplimiento } from '../../../../api/clienteProcesoHitoCumplimientos'
import { getStatusCliente, HitoCompletoConInfo } from '../../../../api/statusTodosClientes'
import api from '../../../../api/axiosConfig'
import PageHeader from '../../../../components/ui/PageHeader'

// Usamos la interfaz del API optimizado
type HitoConInfo = HitoCompletoConInfo

interface Props {
    clienteId: string
}

const StatusCliente: FC<Props> = ({ clienteId }) => {
    const navigate = useNavigate()
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [hitos, setHitos] = useState<HitoConInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [total, setTotal] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [searching, setSearching] = useState(false)
    const [selectedHito, setSelectedHito] = useState<string[]>([])
    const [selectedProceso, setSelectedProceso] = useState<string[]>([])
    const [selectedEstados, setSelectedEstados] = useState<Set<'cumplido_en_plazo' | 'cumplido_fuera_plazo' | 'vence_hoy' | 'pendiente_fuera_plazo' | 'pendiente_en_plazo'>>(new Set())
    const [selectedTipos, setSelectedTipos] = useState<Set<string>>(new Set())
    // Obtener fecha de hoy en formato YYYY-MM-DD para el input type="date"
    const getTodayDate = () => {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
    const [fechaDesde, setFechaDesde] = useState(getTodayDate())
    const [fechaHasta, setFechaHasta] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [sortField, setSortField] = useState<'proceso' | 'hito' | 'estado' | 'fecha_limite' | 'hora_limite' | 'fecha_estado' | 'tipo' | 'linea' | 'estado_proceso' | 'critico' | 'usuario' | 'observacion' | 'cubo'>('fecha_limite')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [cumplimientosPorHito, setCumplimientosPorHito] = useState<Record<number, ClienteProcesoHitoCumplimiento[]>>({})

    // Función para normalizar texto
    const normalizeText = (text: string | null | undefined): string => {
        if (!text) return ''
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
    }

    // Función optimizada para cargar los hitos del cliente en una sola llamada
    const cargarHitos = async () => {
        setLoading(true)
        try {
            const response = await getStatusCliente(clienteId)
            const todosLosHitos = response.hitos || []

            setHitos(todosLosHitos)
            setTotal(response.total || todosLosHitos.length)

            // Mapear cumplimientos desde la respuesta optimizada
            const cumplimientosMap: Record<number, ClienteProcesoHitoCumplimiento[]> = {}
            todosLosHitos.forEach(hito => {
                if (hito.ultimo_cumplimiento) {
                    cumplimientosMap[hito.id] = [hito.ultimo_cumplimiento as ClienteProcesoHitoCumplimiento]
                } else {
                    cumplimientosMap[hito.id] = []
                }
            })
            setCumplimientosPorHito(cumplimientosMap)
        } catch (error) {
            console.error('Error cargando hitos:', error)
            setHitos([])
            setTotal(0)
            setCumplimientosPorHito({})
        } finally {
            setLoading(false)
        }
    }

    // Debounce para el término de búsqueda
    useEffect(() => {
        if (searchTerm) {
            setSearching(true)
        }

        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
            setSearching(false)
        }, 300)

        return () => {
            clearTimeout(timer)
            setSearching(false)
        }
    }, [searchTerm])

    // Cargar datos iniciales
    useEffect(() => {
        if (clienteId) {
            getClienteById(clienteId).then(setCliente)
            cargarHitos()
        }
    }, [clienteId])

    const formatDate = (date: string) => {
        return formatDateDisplay(date)
    }

    const formatDateTime = (dateStr: string) => {
        return formatDateTimeDisplay(dateStr)
    }

    const formatTime = (time: string | null) => {
        if (!time) return '-'
        if (time.match(/^\d{2}:\d{2}$/)) {
            return time
        }
        if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
            return time.substring(0, 5)
        }
        return time
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

    // Obtener fecha del último cumplimiento
    const getUltimoCumplimientoDate = (hitoId: number): Date | null => {
        const lista = cumplimientosPorHito[hitoId]
        if (!lista || lista.length === 0) return null
        const c = lista[0]
        if (!c.fecha) return null
        const horaStr = c.hora ? (c.hora.includes(':') ? c.hora : `${c.hora}:00`) : '00:00'
        const dt = new Date(`${c.fecha}T${horaStr.length === 5 ? horaStr + ':00' : horaStr}`)
        return isNaN(dt.getTime()) ? null : dt
    }

    // Obtener fecha límite con hora
    const getFechaLimiteDate = (fechaLimite?: string | null, horaLimite?: string | null): Date | null => {
        if (!fechaLimite) return null
        const horaStr = horaLimite && !horaLimite.startsWith('00:00')
            ? (horaLimite.includes(':') ? horaLimite : `${horaLimite}:00`)
            : '23:59:59'
        const dt = new Date(`${fechaLimite}T${horaStr.length === 5 ? horaStr + ':00' : horaStr}`)
        return isNaN(dt.getTime()) ? null : dt
    }

    // Determinar si fue finalizado fuera de plazo
    const isFinalizadoFueraDePlazo = (h: HitoConInfo): boolean => {
        if (h.estado !== 'Finalizado') return false
        const ult = getUltimoCumplimientoDate(h.id)
        const limite = getFechaLimiteDate(h.fecha_limite, h.hora_limite)
        if (!ult || !limite) return false
        return ult.getTime() > limite.getTime()
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    // Función para limpiar filtros
    const limpiarFiltros = () => {
        setSearchTerm('')
        setSelectedHito([])
        setSelectedProceso([])
        setSelectedEstados(new Set())
        setSelectedTipos(new Set())
        setFechaDesde(getTodayDate())
        setFechaHasta('')
        setCurrentPage(1)
    }

    // Función para exportar a Excel
    const exportarExcel = async () => {
        setExporting(true)
        try {
            // Construir parámetros de query
            const params = new URLSearchParams()

            if (selectedHito.length > 0) {
                selectedHito.forEach(id => params.append('hito_id', id))
            }

            if (selectedProceso.length > 0) {
                selectedProceso.forEach(p => params.append('proceso_nombre', p))
            }

            if (fechaDesde) {
                params.append('fecha_desde', fechaDesde)
            }

            if (fechaHasta) {
                params.append('fecha_hasta', fechaHasta)
            }

            if (selectedEstados.size > 0) {
                params.append('estados', Array.from(selectedEstados).join(','))
            }

            if (selectedTipos.size > 0) {
                params.append('tipos', Array.from(selectedTipos).join(','))
            }

            if (debouncedSearchTerm) {
                params.append('search_term', debouncedSearchTerm)
            }

            // Construir URL completa
            const url = `/status-cliente/${clienteId}/exportar-excel${params.toString() ? `?${params.toString()}` : ''}`

            // Hacer la petición para descargar el archivo
            const response = await api.get(url, {
                responseType: 'blob'
            })

            // Crear un blob con el archivo
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            // Crear un enlace temporal para descargar
            const urlBlob = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = urlBlob

            // Obtener el nombre del archivo del header Content-Disposition o usar uno por defecto
            const contentDisposition = response.headers['content-disposition']
            let filename = `status_hitos_cliente_${clienteId}_${getTodayDate()}.xlsx`
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1]
                }
            }

            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()

            // Limpiar
            link.remove()
            window.URL.revokeObjectURL(urlBlob)
        } catch (error) {
            console.error('Error al exportar Excel:', error)
            alert('Error al exportar el archivo Excel. Por favor, intente nuevamente.')
        } finally {
            setExporting(false)
        }
    }

    // Función para toggle de estados
    const toggleEstado = (estado: 'cumplido_en_plazo' | 'cumplido_fuera_plazo' | 'vence_hoy' | 'pendiente_fuera_plazo' | 'pendiente_en_plazo') => {
        const nuevosEstados = new Set(selectedEstados)
        if (nuevosEstados.has(estado)) {
            nuevosEstados.delete(estado)
        } else {
            nuevosEstados.add(estado)
        }
        setSelectedEstados(nuevosEstados)
    }

    // Función para toggle de tipos
    const toggleTipo = (tipo: string) => {
        const nuevosTipos = new Set(selectedTipos)
        if (nuevosTipos.has(tipo)) {
            nuevosTipos.delete(tipo)
        } else {
            nuevosTipos.add(tipo)
        }
        setSelectedTipos(nuevosTipos)
    }

    // Función para manejar el ordenamiento
    const handleSort = (field: 'proceso' | 'hito' | 'estado' | 'fecha_limite' | 'hora_limite' | 'fecha_estado' | 'tipo' | 'linea' | 'estado_proceso' | 'critico' | 'usuario' | 'observacion' | 'cubo') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Función para obtener el icono de ordenamiento
    const getSortIcon = (field: 'proceso' | 'hito' | 'estado' | 'fecha_limite' | 'hora_limite' | 'fecha_estado' | 'tipo' | 'linea' | 'estado_proceso' | 'critico' | 'usuario' | 'observacion' | 'cubo') => {
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
    const sortHitos = (hitos: HitoConInfo[]): HitoConInfo[] => {
        const sorted = [...hitos].sort((a, b) => {
            let comparison = 0

            switch (sortField) {
                case 'proceso':
                    const procesoA = a.proceso_nombre || ''
                    const procesoB = b.proceso_nombre || ''
                    comparison = procesoA.localeCompare(procesoB, 'es', { sensitivity: 'base' })
                    break

                case 'hito':
                    const hitoA = a.hito_nombre || ''
                    const hitoB = b.hito_nombre || ''
                    comparison = hitoA.localeCompare(hitoB, 'es', { sensitivity: 'base' })
                    break

                case 'estado':
                    const estadoA = a.estado || ''
                    const estadoB = b.estado || ''
                    comparison = estadoA.localeCompare(estadoB, 'es', { sensitivity: 'base' })
                    break

                case 'fecha_limite':
                    const fechaLimA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0
                    const fechaLimB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0
                    comparison = fechaLimA - fechaLimB
                    break

                case 'hora_limite':
                    const horaLimA = a.hora_limite ? (a.hora_limite.includes(':') ? a.hora_limite : `${a.hora_limite}:00`) : '00:00:00'
                    const horaLimB = b.hora_limite ? (b.hora_limite.includes(':') ? b.hora_limite : `${b.hora_limite}:00`) : '00:00:00'
                    const [hLA, mLA] = horaLimA.split(':').map(Number)
                    const [hLB, mLB] = horaLimB.split(':').map(Number)
                    comparison = (hLA * 60 + mLA) - (hLB * 60 + mLB)
                    break

                case 'fecha_estado':
                    const fechaEstA = a.fecha_estado ? new Date(a.fecha_estado).getTime() : 0
                    const fechaEstB = b.fecha_estado ? new Date(b.fecha_estado).getTime() : 0
                    comparison = fechaEstA - fechaEstB
                    break

                case 'cubo':
                    const cuboA = (a.ultimo_cumplimiento?.codSubDepar || a.codSubDepar || '').substring(4)
                    const cuboB = (b.ultimo_cumplimiento?.codSubDepar || b.codSubDepar || '').substring(4)
                    comparison = cuboA.localeCompare(cuboB, 'es', { sensitivity: 'base', numeric: true })
                    break

                case 'linea':
                    const linA = a.ultimo_cumplimiento?.departamento || a.departamento_cliente || a.departamento || ''
                    const linB = b.ultimo_cumplimiento?.departamento || b.departamento_cliente || b.departamento || ''
                    comparison = linA.localeCompare(linB, 'es', { sensitivity: 'base' })
                    break

                case 'tipo':
                    const tipoA = a.tipo || ''
                    const tipoB = b.tipo || ''
                    comparison = tipoA.localeCompare(tipoB, 'es', { sensitivity: 'base' })
                    break

                default:
                    return 0
            }

            return sortDirection === 'asc' ? comparison : -comparison
        })

        return sorted
    }

    // Filtrar hitos usando useMemo
    const hitosFiltrados = useMemo(() => {
        const filtrados = hitos.filter(hito => {
            const searchNormalized = normalizeText(debouncedSearchTerm)
            const matchesSearch = !debouncedSearchTerm ||
                normalizeText(hito.proceso_nombre).includes(searchNormalized) ||
                normalizeText(hito.hito_nombre).includes(searchNormalized)

            // Hito y Proceso actúan como OR entre sí
            const matchesHitoOrProceso =
                (selectedHito.length === 0 && selectedProceso.length === 0) ||
                (selectedHito.length > 0 && selectedHito.includes(String(hito.hito_id))) ||
                (selectedProceso.length > 0 && selectedProceso.includes(hito.proceso_nombre || ''))

            // Filtro de estado basado en la lógica de estados (múltiple selección)
            let matchesEstado = true
            if (selectedEstados.size > 0) {
                const isFinalized = hito.estado === 'Finalizado'
                const isNuevo = hito.estado === 'Nuevo'
                const estadoVenc = getEstadoVencimiento(hito.fecha_limite, hito.estado)
                const finalizadoFuera = isFinalizadoFueraDePlazo(hito)
                const venceHoy = isNuevo && estadoVenc === 'hoy'

                // Verificar si el hito coincide con alguno de los estados seleccionados
                matchesEstado = Array.from(selectedEstados).some(estado => {
                    switch (estado) {
                        case 'cumplido_en_plazo':
                            return isFinalized && !finalizadoFuera
                        case 'cumplido_fuera_plazo':
                            return isFinalized && finalizadoFuera
                        case 'vence_hoy':
                            return venceHoy
                        case 'pendiente_fuera_plazo':
                            return !isFinalized && estadoVenc === 'vencido'
                        case 'pendiente_en_plazo':
                            return !isFinalized && estadoVenc === 'en_plazo'
                        default:
                            return false
                    }
                })
            }

            // Filtro de tipo (múltiple selección)
            let matchesTipo = true
            if (selectedTipos.size > 0) {
                matchesTipo = hito.tipo ? selectedTipos.has(hito.tipo) : false
            }

            let matchesFecha = true
            if (fechaDesde || fechaHasta) {
                const fechaLimite = hito.fecha_limite ? new Date(hito.fecha_limite) : null
                if (fechaLimite && !isNaN(fechaLimite.getTime())) {
                    if (fechaDesde) {
                        const fechaDesdeDate = new Date(fechaDesde)
                        matchesFecha = matchesFecha && fechaLimite >= fechaDesdeDate
                    }
                    if (fechaHasta) {
                        const fechaHastaDate = new Date(fechaHasta)
                        matchesFecha = matchesFecha && fechaLimite <= fechaHastaDate
                    }
                } else {
                    matchesFecha = false
                }
            }

            return matchesSearch && matchesHitoOrProceso && matchesEstado && matchesTipo && matchesFecha
        })

        return sortHitos(filtrados)
    }, [hitos, debouncedSearchTerm, selectedHito, selectedProceso, selectedEstados, selectedTipos, fechaDesde, fechaHasta, sortField, sortDirection, cumplimientosPorHito])

    // Paginación
    const paginatedHitos = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return hitosFiltrados.slice(startIndex, endIndex)
    }, [hitosFiltrados, currentPage, itemsPerPage])

    // Obtener procesos únicos para el filtro
    const procesosUnicos = useMemo(() => {
        const procesosSet = new Set<string>()
        hitos.forEach(hito => {
            if (hito.proceso_nombre) {
                procesosSet.add(hito.proceso_nombre)
            }
        })
        return Array.from(procesosSet).sort()
    }, [hitos])

    // Obtener tipos únicos para el filtro
    const tiposUnicos = useMemo(() => {
        const tiposSet = new Set<string>()
        hitos.forEach(hito => {
            if (hito.tipo) {
                tiposSet.add(hito.tipo)
            }
        })
        return Array.from(tiposSet).sort()
    }, [hitos])

    // Obtener hitos únicos del cliente para el filtro
    const hitosUnicosDelCliente = useMemo(() => {
        const hitosSet = new Map<number, { id: number, nombre: string }>()
        hitos.forEach(hito => {
            if (hito.hito_id && hito.hito_nombre) {
                hitosSet.set(hito.hito_id, {
                    id: hito.hito_id,
                    nombre: hito.hito_nombre
                })
            }
        })
        return Array.from(hitosSet.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    }, [hitos])

    // Estilos para react-select (tema del drawer)
    const selectStyles = {
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
        control: (base: any) => ({
            ...base,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderColor: 'rgba(255,255,255,0.25)',
            borderRadius: '8px',
            boxShadow: 'none',
            '&:hover': { borderColor: 'rgba(255,255,255,0.5)' }
        }),
        menu: (base: any) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
            color: atisaStyles.colors.dark,
            cursor: 'pointer',
            ':active': { backgroundColor: atisaStyles.colors.secondary }
        }),
        multiValue: (base: any) => ({ ...base, backgroundColor: atisaStyles.colors.secondary, borderRadius: '4px' }),
        multiValueLabel: (base: any) => ({ ...base, color: 'white', fontSize: '12px' }),
        multiValueRemove: (base: any) => ({ ...base, color: 'white', ':hover': { backgroundColor: '#d32f2f', color: 'white' } }),
        placeholder: (base: any) => ({ ...base, color: 'rgba(255,255,255,0.6)', fontSize: '13px' }),
        input: (base: any) => ({ ...base, color: 'white' }),
        singleValue: (base: any) => ({ ...base, color: 'white' }),
        indicatorSeparator: (base: any) => ({ ...base, backgroundColor: 'rgba(255,255,255,0.3)' }),
        dropdownIndicator: (base: any) => ({ ...base, color: 'rgba(255,255,255,0.6)' }),
        clearIndicator: (base: any) => ({ ...base, color: 'rgba(255,255,255,0.6)' }),
    }

    return (
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
            {/* Header Sticky con Título y Filtros */}
            <PageHeader
                title="Status de Hitos"
                subtitle={cliente?.razsoc || clienteId}
                icon="info-circle"
                backButton={
                    <button
                        className="btn d-flex align-items-center"
                        onClick={() => navigate(`/clientes-documental-calendario`)}
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
                    <div className="d-flex align-items-center gap-3">
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
                                padding: '8px 16px',
                                fontSize: '14px',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className="bi bi-funnel"></i>
                            Filtros
                            {(selectedEstados.size > 0 || selectedTipos.size > 0 || selectedHito.length > 0 || selectedProceso.length > 0 || fechaDesde || fechaHasta || debouncedSearchTerm) && (
                                <span className="badge rounded-pill bg-danger" style={{ fontSize: '10px', marginLeft: '4px' }}>
                                    {[
                                        selectedEstados.size,
                                        selectedTipos.size,
                                        selectedHito.length,
                                        selectedProceso.length,
                                        fechaDesde ? 1 : 0,
                                        fechaHasta ? 1 : 0,
                                        debouncedSearchTerm ? 1 : 0
                                    ].reduce((a, b) => a + b, 0)}
                                </span>
                            )}
                        </button>

                        <button
                            className="btn"
                            onClick={() => navigate(`/cliente-calendario/${clienteId}`)}
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
                            <i className="bi bi-calendar3"></i>
                            Ver Calendario
                        </button>
                    </div>
                }
            />

            {/* Overlay */}
            {showFilters && (
                <div
                    onClick={() => setShowFilters(false)}
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'transparent', zIndex: 1040 }}
                />
            )}

            {/* Drawer de Filtros */}
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
                            onClick={exportarExcel}
                            disabled={exporting}
                            title="Exportar Excel"
                            style={{ color: 'white', backgroundColor: '#50cd89', borderColor: '#50cd89', fontWeight: '600', padding: '6px 12px', opacity: exporting ? 0.7 : 1 }}
                        >
                            {exporting ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                                <i className="bi bi-file-earmark-excel"></i>
                            )}
                        </button>
                        <button
                            className="btn btn-sm"
                            onClick={limpiarFiltros}
                            title="Limpiar filtros"
                            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)', fontWeight: '600', padding: '6px 12px' }}
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button onClick={() => setShowFilters(false)} title="Cerrar" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>
                            <i className="bi bi-x"></i>
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Búsqueda */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Búsqueda</label>
                        <div style={{ position: 'relative' }}>
                            <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)' }}></i>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar por proceso, hito..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                            />
                            {searching && (
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                    <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Proceso */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Proceso</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}
                            options={procesosUnicos.map(p => ({ value: p, label: p }))}
                            value={procesosUnicos
                                .filter(p => selectedProceso.includes(p))
                                .map(p => ({ value: p, label: p }))}
                            onChange={(opts) => setSelectedProceso(opts ? (opts as any[]).map((o: any) => o.value) : [])}
                            placeholder="Todos los procesos..."
                            noOptionsMessage={() => 'No hay opciones'}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Hito */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Hito</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}
                            options={hitosUnicosDelCliente.map(h => ({ value: String(h.id), label: h.nombre }))}
                            value={hitosUnicosDelCliente
                                .filter(h => selectedHito.includes(String(h.id)))
                                .map(h => ({ value: String(h.id), label: h.nombre }))}
                            onChange={(opts) => setSelectedHito(opts ? (opts as any[]).map((o: any) => o.value) : [])}
                            placeholder="Todos los hitos..."
                            noOptionsMessage={() => 'No hay opciones'}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Fechas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Desde</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Hasta</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                            />
                        </div>
                    </div>

                    {/* Estado */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', display: 'block' }}>Estado del Hito</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <div
                                onClick={() => setSelectedEstados(new Set())}
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: selectedEstados.size === 0 ? 'white' : 'rgba(255,255,255,0.1)',
                                    color: selectedEstados.size === 0 ? atisaStyles.colors.primary : 'white',
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
                                { id: 'cumplido_en_plazo', label: 'Cumplido en Plazo', color: '#2e7d32' },
                                { id: 'cumplido_fuera_plazo', label: 'Cumplido Fuera de Plazo', color: '#ef6c00' },
                                { id: 'vence_hoy', label: 'Vence Hoy', color: '#f9a825' },
                                { id: 'pendiente_en_plazo', label: 'Pendiente en Plazo', color: '#00695c' },
                                { id: 'pendiente_fuera_plazo', label: 'Pendiente Fuera de Plazo', color: '#c62828' }
                            ].map((estado) => {
                                const isSelected = selectedEstados.has(estado.id as any)
                                return (
                                    <div
                                        key={estado.id}
                                        onClick={() => toggleEstado(estado.id as any)}
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

                    {/* Tipo */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', display: 'block' }}>Tipo</label>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {['Atisa', 'Cliente', 'Terceros'].map((tipo) => (
                                <div key={tipo} className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`drawer-tipo-${tipo}`}
                                        checked={selectedTipos.has(tipo)}
                                        onChange={() => toggleTipo(tipo)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label className="form-check-label" htmlFor={`drawer-tipo-${tipo}`} style={{ color: 'white', fontSize: '13px', cursor: 'pointer' }}>
                                        {tipo}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            <div className="flex-grow-1">
                <div
                    className="card border-0"
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                        overflow: 'hidden'
                    }}
                >
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr className="text-uppercase fs-8 fw-black text-muted" style={{ letterSpacing: '0.05em' }}>
                                    <th className="ps-4 cursor-pointer" onClick={() => handleSort('linea')} style={{ padding: '16px 12px' }}>
                                        Línea {getSortIcon('linea')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('cubo')} style={{ padding: '16px 12px' }}>
                                        Cubo {getSortIcon('cubo')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('proceso')} style={{ padding: '16px 12px' }}>
                                        Proceso {getSortIcon('proceso')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('estado_proceso')} style={{ padding: '16px 12px' }}>
                                        E. Proc {getSortIcon('estado_proceso')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('hito')} style={{ padding: '16px 12px' }}>
                                        Hito {getSortIcon('hito')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('tipo')} style={{ padding: '16px 12px' }}>
                                        Resp. {getSortIcon('tipo')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('critico')} style={{ padding: '16px 12px' }}>
                                        Clave {getSortIcon('critico')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('estado')} style={{ padding: '16px 12px' }}>
                                        Estado {getSortIcon('estado')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('fecha_limite')} style={{ padding: '16px 12px' }}>
                                        Límite {getSortIcon('fecha_limite')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('fecha_estado')} style={{ padding: '16px 12px' }}>
                                        Actualización {getSortIcon('fecha_estado')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('usuario')} style={{ padding: '16px 12px' }}>
                                        Gestor {getSortIcon('usuario')}
                                    </th>
                                    <th className="pe-4 text-center" style={{ padding: '16px 12px' }}>
                                        Obs.
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={11}
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
                                ) : hitosFiltrados.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={11}
                                            className="text-center py-4"
                                            style={{
                                                backgroundColor: '#f8f9fa',
                                                fontFamily: atisaStyles.fonts.secondary,
                                                padding: '2rem',
                                                color: atisaStyles.colors.dark
                                            }}
                                        >
                                            <i className="bi bi-info-circle me-2" style={{ color: atisaStyles.colors.dark }}></i>
                                            {debouncedSearchTerm || selectedHito || selectedProceso || selectedEstados.size > 0 || selectedTipos.size > 0 || fechaDesde || fechaHasta
                                                ? 'No se encontraron hitos con los filtros aplicados'
                                                : 'No hay hitos registrados para este cliente'
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedHitos.map((hito, index) => {
                                        const isFinalized = hito.estado === 'Finalizado'
                                        const isNuevo = hito.estado === 'Nuevo'
                                        const estadoVenc = getEstadoVencimiento(hito.fecha_limite, hito.estado)
                                        const finalizadoFuera = isFinalizadoFueraDePlazo(hito)
                                        const venceHoy = isNuevo && estadoVenc === 'hoy'

                                        let badgeColors = { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' }
                                        if (isFinalized) {
                                            badgeColors = finalizadoFuera
                                                ? { bg: '#fff3e0', color: '#ef6c00', border: '#ffe0b2' }
                                                : { bg: '#e8f5e8', color: '#2e7d32', border: '#c8e6c9' }
                                        } else if (venceHoy) {
                                            badgeColors = { bg: '#fff8e1', color: '#f9a825', border: '#ffecb3' }
                                        } else if (estadoVenc === 'vencido') {
                                            badgeColors = { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' }
                                        } else if (estadoVenc !== 'sin_fecha') {
                                            badgeColors = { bg: '#e0f2f1', color: '#00695c', border: '#b2dfdb' }
                                        }

                                        let estadoTexto = ''
                                        if (isFinalized) {
                                            estadoTexto = finalizadoFuera ? 'Cumplido fuera de plazo' : 'Cumplido en plazo'
                                        } else if (venceHoy) {
                                            estadoTexto = 'Vence hoy'
                                        } else if (estadoVenc === 'vencido') {
                                            estadoTexto = 'Pendiente fuera de plazo'
                                        } else {
                                            estadoTexto = 'Pendiente en plazo'
                                        }

                                        return (
                                            <tr
                                                key={hito.id}
                                                style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa', transition: 'all 0.2s ease' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#e9ecef'
                                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                    e.currentTarget.style.boxShadow = 'none'
                                                }}
                                            >
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.ultimo_cumplimiento?.departamento || hito.departamento_cliente || hito.departamento || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.ultimo_cumplimiento?.codSubDepar
                                                        ? hito.ultimo_cumplimiento.codSubDepar.substring(4)
                                                        : hito.codSubDepar
                                                            ? hito.codSubDepar.substring(4)
                                                            : '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.proceso_nombre || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.estado_proceso || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.primary, fontWeight: '600', padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.hito_nombre || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.tipo || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.critico ? 'Clave' : 'No clave'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    <span style={{ backgroundColor: badgeColors.bg, color: badgeColors.color, padding: '4px 10px', borderRadius: '4px', border: `1px solid ${badgeColors.border}`, fontWeight: '600', fontSize: '11px', display: 'inline-block' }}>
                                                        {estadoTexto}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {formatDate(hito.fecha_limite)} {formatTime(hito.hora_limite)}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.fecha_estado ? formatDateTime(hito.fecha_estado) : '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.ultimo_cumplimiento?.usuario || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    {hito.ultimo_cumplimiento?.observacion ? (
                                                        <i
                                                            className="bi bi-chat-square-text-fill"
                                                            style={{ color: atisaStyles.colors.primary, fontSize: '16px', cursor: 'help' }}
                                                            title={hito.ultimo_cumplimiento.observacion}
                                                        ></i>
                                                    ) : (
                                                        <span style={{ color: '#adb5bd' }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {
                        hitosFiltrados.length > itemsPerPage && (
                            <div
                                style={{
                                    padding: '1.5rem',
                                    borderTop: `1px solid ${atisaStyles.colors.light}`,
                                    backgroundColor: '#f8f9fa'
                                }}
                            >
                                <SharedPagination
                                    currentPage={currentPage}
                                    totalItems={hitosFiltrados.length}
                                    pageSize={itemsPerPage}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )
                    }
                </div>
            </div>
        </div >
    )
}

export default StatusCliente
