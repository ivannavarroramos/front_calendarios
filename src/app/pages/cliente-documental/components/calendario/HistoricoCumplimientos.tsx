import { FC, useEffect, useState, useMemo } from 'react'
import Select from 'react-select'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { atisaStyles, getSecondaryButtonStyles } from '../../../../styles/atisaStyles'
import { formatDateDisplay } from '../../../../utils/dateFormatter'
import SharedPagination from '../../../../components/pagination/SharedPagination'
import PageHeader from '../../../../components/ui/PageHeader'
import { getClienteProcesoHitoCumplimientosByCliente, ClienteProcesoHitoCumplimiento } from '../../../../api/clienteProcesoHitoCumplimientos'
import { Cliente, getClienteById } from '../../../../api/clientes'
import { getAllHitos, Hito } from '../../../../api/hitos'
import { getAllProcesos, Proceso } from '../../../../api/procesos'
import { descargarDocumentosCumplimiento } from '../../../../api/documentosCumplimiento'
import { getClienteProcesoHitoById, ClienteProcesoHito } from '../../../../api/clienteProcesoHitos'
import { getClienteProcesosByCliente } from '../../../../api/clienteProcesos'
import { getAllSubdepartamentos, Subdepartamento } from '../../../../api/subdepartamentos'

// Type alias for better readability
type CumplimientoHistorico = ClienteProcesoHitoCumplimiento

interface Props {
    clienteId: string
}

const HistoricoCumplimientos: FC<Props> = ({ clienteId }) => {
    const navigate = useNavigate()
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [cumplimientos, setCumplimientos] = useState<CumplimientoHistorico[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [searching, setSearching] = useState(false)
    const [selectedHito, setSelectedHito] = useState('')
    const [selectedProceso, setSelectedProceso] = useState('')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [tipoFiltroFecha, setTipoFiltroFecha] = useState<'cumplimiento' | 'creacion' | 'limite'>('cumplimiento')
    const [hitos, setHitos] = useState<Hito[]>([])
    const [procesos, setProcesos] = useState<Proceso[]>([])
    const [subdepartamentos, setSubdepartamentos] = useState<Subdepartamento[]>([])
    const [selectedLineas, setSelectedLineas] = useState<string[]>([])
    const [selectedCubos, setSelectedCubos] = useState<string[]>([])
    const [selectedEstadoPlazo, setSelectedEstadoPlazo] = useState<string>('todos')
    const [selectedEstadoProceso, setSelectedEstadoProceso] = useState<'todos' | 'Finalizado' | 'En proceso'>('todos')
    const [showFilters, setShowFilters] = useState(false)
    const [downloadingCumplimientoId, setDownloadingCumplimientoId] = useState<number | null>(null)
    const [sortField, setSortField] = useState<'fecha_cumplimiento' | 'hora_cumplimiento' | 'fecha_limite' | 'hora_limite' | 'usuario' | 'proceso' | 'hito' | 'observacion' | 'fecha_creacion' | 'linea' | 'cubo' | 'hito_tipo' | 'estado_plazo' | 'proceso_periodo' | 'proceso_estado' | 'num_documentos'>('fecha_creacion')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    // Función para cargar cumplimientos
    const cargarCumplimientos = async (page: number = 1) => {
        setLoading(true)
        try {
            const response = await getClienteProcesoHitoCumplimientosByCliente(
                clienteId,
                page,
                itemsPerPage,
                sortField === 'fecha_cumplimiento' ? 'fecha' : sortField,
                sortDirection
            )
            const cumplimientosData = response.cumplimientos || []
            setCumplimientos(cumplimientosData)
            setTotal(response.total || 0)
        } catch (error) {
            console.error('Error cargando cumplimientos:', error)
            setCumplimientos([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

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

    // Debounce para el término de búsqueda
    useEffect(() => {
        if (searchTerm) {
            setSearching(true)
        }

        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
            setSearching(false)
        }, 300) // 300ms de delay



        return () => {
            clearTimeout(timer)
            setSearching(false)
        }
    }, [searchTerm])

    // Cargar datos iniciales
    useEffect(() => {
        if (clienteId) {
            getClienteById(clienteId).then(setCliente)
            cargarCumplimientos(currentPage)
        }
    }, [clienteId, currentPage])

    // Cargar hitos y procesos del cliente solo cuando cambia el clienteId
    useEffect(() => {
        if (clienteId) {
            cargarHitosYProcesosDelCliente()
            cargarSubdepartamentos()
        }
    }, [clienteId])

    // Cargar subdepartamentos para el filtro
    const cargarSubdepartamentos = async () => {
        try {
            const response = await getAllSubdepartamentos(undefined, 1000, undefined, 'asc')
            setSubdepartamentos(response.subdepartamentos || [])
        } catch (error) {
            console.error('Error cargando subdepartamentos:', error)
            setSubdepartamentos([])
        }
    }

    // Cargar hitos y procesos únicos del cliente basados en sus cumplimientos
    const cargarHitosYProcesosDelCliente = async () => {
        try {
            // Cargar todos los cumplimientos del cliente (sin paginación para obtener todos)
            const response = await getClienteProcesoHitoCumplimientosByCliente(
                clienteId,
                1,
                10000, // Límite alto para obtener todos
                'fecha',
                'desc'
            )

            const cumplimientosData = (response.cumplimientos || []) as CumplimientoHistorico[]

            if (cumplimientosData.length === 0) {
                setHitos([])
                setProcesos([])
                return
            }

            // Primero intentar usar los campos directos si existen
            const hitoIds = new Set<number>()
            const procesoIds = new Set<number>()

            cumplimientosData.forEach(cumplimiento => {
                const cumpl = cumplimiento as any
                if (cumpl.hito_id) {
                    hitoIds.add(cumpl.hito_id)
                }
                if (cumpl.proceso_id) {
                    procesoIds.add(cumpl.proceso_id)
                }
            })

            // Si no encontramos los campos directos, obtenerlos desde cliente_proceso_hito
            if (hitoIds.size === 0 || procesoIds.size === 0) {
                // Extraer cliente_proceso_hito_id únicos
                const clienteProcesoHitoIds = new Set<number>()
                cumplimientosData.forEach(cumplimiento => {
                    if (cumplimiento.cliente_proceso_hito_id) {
                        clienteProcesoHitoIds.add(cumplimiento.cliente_proceso_hito_id)
                    }
                })

                if (clienteProcesoHitoIds.size === 0) {
                    setHitos([])
                    setProcesos([])
                    return
                }

                // Obtener todos los cliente_proceso_hito en paralelo
                const clienteProcesoHitosPromises = Array.from(clienteProcesoHitoIds).map(id =>
                    getClienteProcesoHitoById(id)
                        .then(hito => ({ id, hito }))
                        .catch(error => {
                            console.warn(`Error obteniendo cliente_proceso_hito ${id}:`, error)
                            return null
                        })
                )

                const clienteProcesoHitosResults = await Promise.all(clienteProcesoHitosPromises)
                const clienteProcesoHitos = clienteProcesoHitosResults.filter((r): r is { id: number, hito: ClienteProcesoHito } => r !== null)

                if (clienteProcesoHitos.length === 0) {
                    setHitos([])
                    setProcesos([])
                    return
                }

                // Extraer hito_id únicos desde cliente_proceso_hito
                const clienteProcesoIds = new Set<number>()

                clienteProcesoHitos.forEach(({ hito }) => {
                    if (hito.hito_id) {
                        hitoIds.add(hito.hito_id)
                    }
                    if (hito.cliente_proceso_id) {
                        clienteProcesoIds.add(hito.cliente_proceso_id)
                    }
                })

                // Obtener procesos del cliente para mapear cliente_proceso_id a proceso_id
                const procesosCliente = await getClienteProcesosByCliente(clienteId)
                const procesoIdMap = new Map<number, number>()
                procesosCliente.clienteProcesos?.forEach(cp => {
                    procesoIdMap.set(cp.id, cp.proceso_id)
                })

                // Mapear cliente_proceso_id a proceso_id
                clienteProcesoIds.forEach(clienteProcesoId => {
                    const procesoId = procesoIdMap.get(clienteProcesoId)
                    if (procesoId) {
                        procesoIds.add(procesoId)
                    }
                })
            }

            // Cargar todos los hitos y procesos maestros
            const [hitosResponse, procesosResponse] = await Promise.all([
                getAllHitos(),
                getAllProcesos()
            ])

            // Filtrar solo los hitos y procesos que tiene el cliente
            const hitosFiltrados = (hitosResponse.hitos || []).filter((hito: Hito) => hitoIds.has(hito.id))
            const procesosFiltrados = (procesosResponse.procesos || []).filter((proceso: Proceso) => procesoIds.has(proceso.id))

            setHitos(hitosFiltrados)
            setProcesos(procesosFiltrados)
        } catch (error) {
            console.error('Error cargando hitos y procesos del cliente:', error)
            // En caso de error, cargar listas vacías
            setHitos([])
            setProcesos([])
        }
    }

    const formatDate = (date: string) => {
        return formatDateDisplay(date)
    }


    const formatTime = (time: string) => {
        if (!time) return '-'

        // Si ya está en formato HH:MM, devolverlo tal como está
        if (time.match(/^\d{2}:\d{2}$/)) {
            return time
        }

        // Si viene en formato HH:MM:SS, quitar los segundos
        if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
            return time.substring(0, 5)
        }

        return time
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    // Función para limpiar filtros
    const limpiarFiltros = () => {
        setSearchTerm('')
        setSelectedHito('')
        setSelectedProceso('')
        setSelectedLineas([])
        setSelectedCubos([])
        setSelectedEstadoPlazo('todos')
        setSelectedEstadoProceso('todos')
        setFechaDesde('')
        setFechaHasta('')
        setTipoFiltroFecha('cumplimiento')
        setCurrentPage(1)
    }

    // Función para manejar el ordenamiento
    const handleSort = (field: 'fecha_cumplimiento' | 'hora_cumplimiento' | 'fecha_limite' | 'hora_limite' | 'usuario' | 'proceso' | 'hito' | 'observacion' | 'fecha_creacion' | 'linea' | 'cubo' | 'hito_tipo' | 'estado_plazo' | 'proceso_periodo' | 'proceso_estado' | 'num_documentos') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Función para obtener el icono de ordenamiento
    const getSortIcon = (field: 'fecha_cumplimiento' | 'hora_cumplimiento' | 'fecha_limite' | 'hora_limite' | 'usuario' | 'proceso' | 'hito' | 'observacion' | 'fecha_creacion' | 'linea' | 'cubo' | 'hito_tipo' | 'estado_plazo' | 'proceso_periodo' | 'proceso_estado' | 'num_documentos') => {
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

    // Función para ordenar los cumplimientos
    const sortCumplimientos = (cumplimientos: CumplimientoHistorico[]): CumplimientoHistorico[] => {
        const sorted = [...cumplimientos].sort((a, b) => {
            let comparison = 0

            switch (sortField) {
                case 'fecha_cumplimiento':
                    const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0
                    const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0
                    comparison = fechaA - fechaB
                    // Si las fechas son iguales, ordenar por hora
                    if (comparison === 0) {
                        const horaA = a.hora ? (a.hora.includes(':') ? a.hora : `${a.hora}:00`) : '00:00:00'
                        const horaB = b.hora ? (b.hora.includes(':') ? b.hora : `${b.hora}:00`) : '00:00:00'
                        const [hA, mA] = horaA.split(':').map(Number)
                        const [hB, mB] = horaB.split(':').map(Number)
                        comparison = (hA * 60 + mA) - (hB * 60 + mB)
                    }
                    break

                case 'hora_cumplimiento':
                    const horaCumplA = a.hora ? (a.hora.includes(':') ? a.hora : `${a.hora}:00`) : '00:00:00'
                    const horaCumplB = b.hora ? (b.hora.includes(':') ? b.hora : `${b.hora}:00`) : '00:00:00'
                    const [hCA, mCA] = horaCumplA.split(':').map(Number)
                    const [hCB, mCB] = horaCumplB.split(':').map(Number)
                    comparison = (hCA * 60 + mCA) - (hCB * 60 + mCB)
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

                case 'usuario':
                    const usuarioA = a.usuario || ''
                    const usuarioB = b.usuario || ''
                    comparison = usuarioA.localeCompare(usuarioB, 'es', { sensitivity: 'base' })
                    break


                case 'cubo':
                    const cuboA = a.codSubDepar && a.codSubDepar.length >= 4 ? a.codSubDepar.substring(4) : ''
                    const cuboB = b.codSubDepar && b.codSubDepar.length >= 4 ? b.codSubDepar.substring(4) : ''
                    comparison = cuboA.localeCompare(cuboB, 'es', { sensitivity: 'base', numeric: true })
                    break

                case 'linea':
                    const depA = a.departamento || ''
                    const depB = b.departamento || ''
                    comparison = depA.localeCompare(depB, 'es', { sensitivity: 'base' })
                    break

                case 'proceso':
                    const procesoA = a.proceso || ''
                    const procesoB = b.proceso || ''
                    comparison = procesoA.localeCompare(procesoB, 'es', { sensitivity: 'base' })
                    break

                case 'hito':
                    const hitoA = a.hito || ''
                    const hitoB = b.hito || ''
                    comparison = hitoA.localeCompare(hitoB, 'es', { sensitivity: 'base' })
                    break

                case 'observacion':
                    const obsA = a.observacion || ''
                    const obsB = b.observacion || ''
                    comparison = obsA.localeCompare(obsB, 'es', { sensitivity: 'base' })
                    break

                case 'fecha_creacion':
                    const fechaCreA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0
                    const fechaCreB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0
                    comparison = fechaCreA - fechaCreB
                    break

                case 'hito_tipo':
                    const hitoInfoA = hitos.find(h => h.id === a.hito_id)
                    const hitoInfoB = hitos.find(h => h.id === b.hito_id)
                    const tipoA = hitoInfoA?.tipo || ''
                    const tipoB = hitoInfoB?.tipo || ''
                    comparison = tipoA.localeCompare(tipoB, 'es', { sensitivity: 'base' })
                    break

                case 'estado_plazo':
                    const getEstado = (c: CumplimientoHistorico) => {
                        if (!c.fecha_limite) return 'Cumplido';
                        const fechaCumpl = new Date(c.fecha + (c.hora ? 'T' + c.hora : 'T00:00:00'));
                        const fechaLim = new Date(c.fecha_limite + (c.hora_limite ? 'T' + c.hora_limite : 'T23:59:59'));
                        return fechaCumpl <= fechaLim ? 'Cumplido en plazo' : 'Cumplido fuera de plazo';
                    }
                    const estadoA = getEstado(a)
                    const estadoB = getEstado(b)
                    comparison = estadoA.localeCompare(estadoB, 'es', { sensitivity: 'base' })
                    break

                case 'proceso_periodo':
                    const perA = a.proceso_periodo || ''
                    const perB = b.proceso_periodo || ''
                    comparison = perA.localeCompare(perB, 'es', { sensitivity: 'base' })
                    break

                case 'proceso_estado':
                    const estA = a.proceso_estado || ''
                    const estB = b.proceso_estado || ''
                    comparison = estA.localeCompare(estB, 'es', { sensitivity: 'base' })
                    break

                case 'num_documentos':
                    const docsA = a.num_documentos || 0
                    const docsB = b.num_documentos || 0
                    comparison = docsA - docsB
                    break

                default:
                    return 0
            }

            return sortDirection === 'asc' ? comparison : -comparison
        })

        return sorted
    }


    // Filtrar cumplimientos usando useMemo para optimizar el rendimiento
    const cumplimientosFiltrados = useMemo(() => {
        const filtrados = cumplimientos.filter(cumplimiento => {
            const matchesSearch = !debouncedSearchTerm ||
                cumplimiento.proceso?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                cumplimiento.hito?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                cumplimiento.usuario?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                cumplimiento.observacion?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

            const matchesHito = !selectedHito || cumplimiento.hito_id?.toString() === selectedHito
            const matchesProceso = !selectedProceso || cumplimiento.proceso_id?.toString() === selectedProceso
            const matchesLineas = selectedLineas.length === 0 || (cumplimiento.codSubDepar && selectedLineas.includes(cumplimiento.codSubDepar.substring(0, 4)))
            const matchesCubos = selectedCubos.length === 0 || (cumplimiento.codSubDepar && selectedCubos.includes(cumplimiento.codSubDepar))

            const getEstado = (c: CumplimientoHistorico) => {
                if (!c.fecha_limite) return 'Cumplido'
                const fechaCumpl = new Date(c.fecha + (c.hora ? 'T' + c.hora : 'T00:00:00'))
                const fechaLim = new Date(c.fecha_limite + (c.hora_limite ? 'T' + c.hora_limite : 'T23:59:59'))
                return fechaCumpl <= fechaLim ? 'Cumplido en plazo' : 'Cumplido fuera de plazo'
            }
            const matchesEstadoPlazo = selectedEstadoPlazo === 'todos' || getEstado(cumplimiento) === selectedEstadoPlazo

            const matchesEstadoProceso = selectedEstadoProceso === 'todos' || cumplimiento.proceso_estado === selectedEstadoProceso


            let matchesFecha = true
            if (fechaDesde || fechaHasta) {
                let fechaAComparar: Date | null = null

                // Determinar qué fecha usar según el tipo de filtro
                switch (tipoFiltroFecha) {
                    case 'cumplimiento':
                        fechaAComparar = cumplimiento.fecha ? new Date(cumplimiento.fecha) : null
                        break
                    case 'creacion':
                        fechaAComparar = cumplimiento.fecha_creacion ? new Date(cumplimiento.fecha_creacion) : null
                        break
                    case 'limite':
                        fechaAComparar = cumplimiento.fecha_limite ? new Date(cumplimiento.fecha_limite) : null
                        break
                }

                if (fechaAComparar && !isNaN(fechaAComparar.getTime())) {
                    if (fechaDesde) {
                        const fechaDesdeDate = new Date(fechaDesde)
                        matchesFecha = matchesFecha && fechaAComparar >= fechaDesdeDate
                    }
                    if (fechaHasta) {
                        const fechaHastaDate = new Date(fechaHasta)
                        matchesFecha = matchesFecha && fechaAComparar <= fechaHastaDate
                    }
                } else {
                    // Si no hay fecha válida para el tipo seleccionado, no mostrar el registro
                    matchesFecha = false
                }
            }

            return matchesSearch && matchesHito && matchesProceso && matchesFecha && matchesLineas && matchesCubos && matchesEstadoProceso && matchesEstadoPlazo
        })

        // Aplicar ordenamiento
        return sortCumplimientos(filtrados)
    }, [cumplimientos, debouncedSearchTerm, selectedHito, selectedProceso, selectedLineas, selectedCubos, selectedEstadoProceso, fechaDesde, fechaHasta, tipoFiltroFecha, sortField, sortDirection])


    const lineasUnicas = useMemo(() => {
        const depMap = new Map<string, { cod: string, nombre: string }>()
        subdepartamentos.forEach(sub => {
            if (sub.codSubDepar) {
                const codDep = sub.codSubDepar.substring(0, 4)
                if (!depMap.has(codDep)) {
                    depMap.set(codDep, { cod: codDep, nombre: sub.nombre || codDep })
                }
            }
        })
        return Array.from(depMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    }, [subdepartamentos])

    const selectStyles = {
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
        control: (base: any) => ({
            ...base,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderColor: 'rgba(255,255,255,0.25)',
            color: 'white',
            borderRadius: '8px',
            minHeight: '38px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)'
            }
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
        multiValueLabel: (base: any) => ({ ...base, color: 'white', fontSize: '12px', padding: '2px 6px' }),
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
            <PageHeader
                title="Histórico de Cumplimientos"
                subtitle={cliente?.razsoc || clienteId}
                icon="clock-history"
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
                            {(debouncedSearchTerm || selectedHito || selectedProceso || (selectedLineas.length > 0 || selectedCubos.length > 0 || selectedEstadoPlazo !== 'todos') || selectedEstadoProceso !== 'todos' || fechaDesde || fechaHasta) && (
                                <span className="badge rounded-pill bg-danger" style={{ fontSize: '10px', marginLeft: '4px' }}>
                                    {[debouncedSearchTerm ? 1 : 0, selectedHito ? 1 : 0, selectedProceso ? 1 : 0, selectedLineas.length, selectedCubos.length, selectedEstadoProceso !== 'todos' ? 1 : 0, selectedEstadoPlazo !== 'todos' ? 1 : 0, fechaDesde ? 1 : 0, fechaHasta ? 1 : 0].reduce((a, b) => a + b, 0)}
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
                    right: showFilters ? 0 : '-520px',
                    width: '500px',
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
                                placeholder="Buscar por nombre, proceso, hito o usuario..."
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

                    {/* Hito */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Hito</label>
                        <Select
                            options={[{ value: '', label: 'Todos los hitos' }, ...hitos.map(h => ({ value: String(h.id), label: h.nombre }))]}
                            value={selectedHito ? { value: selectedHito, label: hitos.find(h => String(h.id) === selectedHito)?.nombre || '' } : { value: '', label: 'Todos los hitos' }}
                            onChange={(opt) => setSelectedHito(opt ? (opt as any).value : '')}
                            placeholder="Todos los hitos..."
                            noOptionsMessage={() => 'No hay opciones'}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Proceso */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Proceso</label>
                        <Select
                            options={[{ value: '', label: 'Todos los procesos' }, ...procesos.map(p => ({ value: String(p.id), label: p.nombre }))]}
                            value={selectedProceso ? { value: selectedProceso, label: procesos.find(p => String(p.id) === selectedProceso)?.nombre || '' } : { value: '', label: 'Todos los procesos' }}
                            onChange={(opt) => setSelectedProceso(opt ? (opt as any).value : '')}
                            placeholder="Todos los procesos..."
                            noOptionsMessage={() => 'No hay opciones'}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Estado Proceso */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Estado Proceso</label>
                        <select className="form-select form-select-sm" value={selectedEstadoProceso} onChange={(e) => setSelectedEstadoProceso(e.target.value as any)} style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}>
                            <option value="todos" style={{ color: 'black' }}>Todos</option>
                            <option value="Finalizado" style={{ color: 'black' }}>Finalizado</option>
                            <option value="En proceso" style={{ color: 'black' }}>En proceso</option>
                        </select>
                    </div>

                    {/* Líneas */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Líneas</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}
                            options={lineasUnicas.map(d => ({ value: d.cod, label: d.nombre }))}
                            value={lineasUnicas
                                .filter(d => selectedLineas.includes(d.cod))
                                .map(d => ({ value: d.cod, label: d.nombre }))
                            }
                            onChange={(opts) => setSelectedLineas(opts ? (opts as any[]).map(v => v.value) : [])}
                            placeholder="Seleccionar líneas..."
                            noOptionsMessage={() => "No hay opciones"}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Cubos */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Cubos</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}
                            options={subdepartamentos
                                .filter(subDep => subDep.codSubDepar !== null)
                                .map(subDep => ({
                                    value: subDep.codSubDepar!,
                                    label: `${subDep.codSubDepar?.substring(4)} - ${subDep.nombre || ''}`
                                }))
                            }
                            value={subdepartamentos
                                .filter(subDep => subDep.codSubDepar !== null && selectedCubos.includes(subDep.codSubDepar!))
                                .map(subDep => ({
                                    value: subDep.codSubDepar!,
                                    label: `${subDep.codSubDepar?.substring(4)} - ${subDep.nombre || ''}`
                                }))
                            }
                            onChange={(opts) => setSelectedCubos(opts ? (opts as any[]).map(v => v.value) : [])}
                            placeholder="Seleccionar cubos..."
                            noOptionsMessage={() => "No hay opciones"}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Estado Plazo */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Estado (Plazo)</label>
                        <select className="form-select form-select-sm" value={selectedEstadoPlazo} onChange={(e) => setSelectedEstadoPlazo(e.target.value)} style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}>
                            <option value="todos" style={{ color: 'black' }}>Todos</option>
                            <option value="Cumplido en plazo" style={{ color: 'black' }}>Cumplido en plazo</option>
                            <option value="Cumplido fuera de plazo" style={{ color: 'black' }}>Cumplido fuera de plazo</option>
                        </select>
                    </div>

                    {/* Tipo de Fecha */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Tipo de Fecha</label>
                        <select className="form-select form-select-sm" value={tipoFiltroFecha} onChange={(e) => setTipoFiltroFecha(e.target.value as any)} style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}>
                            <option value="cumplimiento" style={{ color: 'black' }}>Cumplimiento</option>
                            <option value="creacion" style={{ color: 'black' }}>Creación</option>
                            <option value="limite" style={{ color: 'black' }}>Límite</option>
                        </select>
                    </div>

                    {/* Rango de Fechas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Desde</label>
                            <input type="date" className="form-control form-control-sm" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }} />
                        </div>
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Hasta</label>
                            <input type="date" className="form-control form-control-sm" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }} />
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
                                    <th className="ps-4 cursor-pointer" onClick={() => handleSort('fecha_cumplimiento')} style={{ padding: '16px 12px' }}>
                                        Fecha / Hora {getSortIcon('fecha_cumplimiento')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('fecha_limite')} style={{ padding: '16px 12px' }}>
                                        Límite {getSortIcon('fecha_limite')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('hito')} style={{ padding: '16px 12px' }}>
                                        Hito {getSortIcon('hito')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('hito_tipo')} style={{ padding: '16px 12px' }}>
                                        T. Hito {getSortIcon('hito_tipo')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('estado_plazo')} style={{ padding: '16px 12px' }}>
                                        Plazo {getSortIcon('estado_plazo')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('proceso')} style={{ padding: '16px 12px' }}>
                                        Proceso {getSortIcon('proceso')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('linea')} style={{ padding: '16px 12px' }}>
                                        Línea {getSortIcon('linea')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('cubo')} style={{ padding: '16px 12px' }}>
                                        Cubo {getSortIcon('cubo')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('usuario')} style={{ padding: '16px 12px' }}>
                                        Usuario {getSortIcon('usuario')}
                                    </th>
                                    <th className="text-center" style={{ padding: '16px 12px' }}>
                                        Obs.
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('proceso_periodo')} style={{ padding: '16px 12px' }}>
                                        Período {getSortIcon('proceso_periodo')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('proceso_estado')} style={{ padding: '16px 12px' }}>
                                        E. Proc {getSortIcon('proceso_estado')}
                                    </th>
                                    <th className="cursor-pointer" onClick={() => handleSort('fecha_creacion')} style={{ padding: '16px 12px' }}>
                                        Alta {getSortIcon('fecha_creacion')}
                                    </th>
                                    <th className="pe-4 text-center" onClick={() => handleSort('num_documentos')} style={{ padding: '16px 12px' }}>
                                        Docs {getSortIcon('num_documentos')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={13} className="text-center py-4" style={{ backgroundColor: '#f8f9fa', fontFamily: atisaStyles.fonts.secondary, padding: '2rem' }}>
                                            <div className="spinner-border" role="status" style={{ color: atisaStyles.colors.primary, width: '2rem', height: '2rem' }}>
                                                <span className="visually-hidden">Cargando cumplimientos...</span>
                                            </div>
                                            <span className="ms-2" style={{ color: atisaStyles.colors.dark, fontFamily: atisaStyles.fonts.secondary, fontWeight: '500' }}>Cargando cumplimientos...</span>
                                        </td>
                                    </tr>
                                ) : cumplimientosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="text-center py-4" style={{ backgroundColor: '#f8f9fa', fontFamily: atisaStyles.fonts.secondary, padding: '2rem', color: atisaStyles.colors.dark }}>
                                            <i className="bi bi-info-circle me-2" style={{ color: atisaStyles.colors.dark }}></i>
                                            {debouncedSearchTerm || selectedHito || selectedProceso || fechaDesde || fechaHasta
                                                ? 'No se encontraron cumplimientos con los filtros aplicados'
                                                : 'No hay cumplimientos registrados para este cliente'
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    cumplimientosFiltrados.map((cumplimiento, index) => {
                                        let estadoPlazo = 'Cumplido';
                                        let estadoPlazoColor = '#2e7d32'; // Green
                                        let estadoPlazoBg = '#e8f5e8';

                                        if (cumplimiento.fecha_limite) {
                                            const fechaCumpl = new Date(cumplimiento.fecha + (cumplimiento.hora ? 'T' + cumplimiento.hora : 'T00:00:00'));
                                            const fechaLim = new Date(cumplimiento.fecha_limite + (cumplimiento.hora_limite ? 'T' + cumplimiento.hora_limite : 'T23:59:59'));

                                            if (fechaCumpl <= fechaLim) {
                                                estadoPlazo = 'Cumplido en plazo';
                                            } else {
                                                estadoPlazo = 'Cumplido fuera de plazo';
                                                estadoPlazoColor = '#d32f2f'; // Red
                                                estadoPlazoBg = '#ffebee';
                                            }
                                        }

                                        const hitoInfo = hitos.find(h => h.id === cumplimiento.hito_id);


                                        return (
                                            <tr
                                                key={cumplimiento.id}
                                                style={{
                                                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                                                    transition: 'all 0.2s ease'
                                                }}
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
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.primary, fontWeight: '600', padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    {formatDate(cumplimiento.fecha)}, {formatTime(cumplimiento.hora)}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.primary, fontWeight: '600', padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    <span
                                                        style={{ backgroundColor: '#e8f5e8', color: '#2e7d32', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #c8e6c9', boxShadow: '0 1px 3px rgba(46, 125, 50, 0.1)' }}
                                                        title={cumplimiento.fecha_limite ? `${formatDate(cumplimiento.fecha_limite)} ${cumplimiento.hora_limite ? formatTime(cumplimiento.hora_limite) : ''}` : 'No disponible'}
                                                    >
                                                        {cumplimiento.fecha_limite ? formatDate(cumplimiento.fecha_limite) : 'No disponible'}
                                                        {cumplimiento.hora_limite && `, ${formatTime(cumplimiento.hora_limite)}`}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.primary, fontWeight: '600', padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    <span title={cumplimiento.hito || 'No disponible'}>
                                                        {cumplimiento.hito || 'No disponible'}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    {hitoInfo?.tipo || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    <span style={{ backgroundColor: estadoPlazoBg, color: estadoPlazoColor, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: `1px solid ${estadoPlazoColor}40`, display: 'inline-block' }}>
                                                        {estadoPlazo}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    <span title={cumplimiento.proceso || 'No disponible'}>
                                                        {cumplimiento.proceso || 'No disponible'}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    {cumplimiento.departamento || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                    {cumplimiento.codSubDepar ? cumplimiento.codSubDepar.substring(4) : '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    <span style={{ backgroundColor: atisaStyles.colors.light, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                                                        {cumplimiento.usuario}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    {cumplimiento.observacion ? (
                                                        <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-obs-${cumplimiento.id}`} style={{ maxWidth: '300px' }}>{cumplimiento.observacion}</Tooltip>}>
                                                            <button type="button" className="btn btn-icon btn-sm" style={{ background: 'transparent', border: 'none', padding: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                                <i className="bi bi-chat-square-text-fill" style={{ color: '#dc3545', fontSize: '20px' }}></i>
                                                            </button>
                                                        </OverlayTrigger>
                                                    ) : (
                                                        <i className="bi bi-chat-square" style={{ color: '#dee2e6', fontSize: '20px' }}></i>
                                                    )}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {cumplimiento.proceso_periodo || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    {cumplimiento.proceso_estado && (
                                                        <span style={{ backgroundColor: cumplimiento.proceso_estado === 'Finalizado' ? '#e8f5e9' : '#e3f2fd', color: cumplimiento.proceso_estado === 'Finalizado' ? '#2e7d32' : '#1976d2', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: `1px solid ${cumplimiento.proceso_estado === 'Finalizado' ? '#c8e6c9' : '#90caf9'}`, display: 'inline-block' }}>
                                                            {cumplimiento.proceso_estado}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.primary, fontWeight: '600', padding: '16px 12px', verticalAlign: 'middle' }}>
                                                    <span style={{ backgroundColor: '#f3e5f5', color: '#7b1fa2', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #e1bee7', boxShadow: '0 1px 3px rgba(123, 31, 162, 0.1)' }} title={cumplimiento.fecha_creacion ? new Date(cumplimiento.fecha_creacion).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No disponible'}>
                                                        {cumplimiento.fecha_creacion ? new Date(cumplimiento.fecha_creacion).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No disponible'}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, padding: '16px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {cumplimiento.id && cumplimiento.num_documentos && cumplimiento.num_documentos > 0 ? (
                                                        <button className="btn btn-sm" onClick={() => handleDescargarDocumentos(cumplimiento.id!)} disabled={downloadingCumplimientoId === cumplimiento.id} style={{ backgroundColor: atisaStyles.colors.accent, color: 'white', border: 'none', borderRadius: '8px', padding: '0', transition: 'background-color 0.3s ease, box-shadow 0.3s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', boxShadow: '0 2px 8px rgba(0, 161, 222, 0.25)', cursor: downloadingCumplimientoId === cumplimiento.id ? 'not-allowed' : 'pointer', lineHeight: '1', verticalAlign: 'middle' }} onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = atisaStyles.colors.primary; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 80, 92, 0.35)' } }} onMouseLeave={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 161, 222, 0.25)' } }} title={`Descargar ${cumplimiento.num_documentos} documento(s)`}>
                                                            {downloadingCumplimientoId === cumplimiento.id ? (
                                                                <span className="spinner-border spinner-border-sm" style={{ width: '20px', height: '20px', borderWidth: '3px', borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white' }}></span>
                                                            ) : (
                                                                <i className="bi bi-download" style={{ fontSize: '20px', lineHeight: '1', fontWeight: 'bold', color: 'white' }}></i>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <i className="bi bi-file-earmark-x" title="Sin documentos" style={{ color: '#dee2e6', fontSize: '20px' }}></i>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {cumplimientosFiltrados.length > itemsPerPage && (
                        <div
                            style={{
                                padding: '1.5rem',
                                borderTop: `1px solid ${atisaStyles.colors.light}`,
                                backgroundColor: '#f8f9fa'
                            }}
                        >
                            <SharedPagination
                                currentPage={currentPage}
                                totalItems={cumplimientosFiltrados.length}
                                pageSize={itemsPerPage}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div >
    )
}

export default HistoricoCumplimientos
