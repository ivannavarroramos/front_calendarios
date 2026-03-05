import { FC, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { atisaStyles, getSecondaryButtonStyles } from '../../../../styles/atisaStyles'
import { formatDateDisplay, formatDateTimeDisplay } from '../../../../utils/dateFormatter'
import SharedPagination from '../../../../components/pagination/SharedPagination'
import { Cliente, getAllClientes } from '../../../../api/clientes'
import { ClienteProcesoHito } from '../../../../api/clienteProcesoHitos'
import { ClienteProcesoHitoCumplimiento } from '../../../../api/clienteProcesoHitoCumplimientos'
import { getStatusTodosClientes, getStatusTodosClientesByUser, HitoCompletoConInfo } from '../../../../api/statusTodosClientes'
import { useAuth } from '../../../../modules/auth/core/Auth'
import api from '../../../../api/axiosConfig'
import { getAllSubdepartamentos, Subdepartamento } from '../../../../api/subdepartamentos'
import Select from 'react-select'
import PageHeader from '../../../../components/ui/PageHeader'

// Usamos la interfaz del API optimizado
type HitoConInfo = HitoCompletoConInfo

const StatusTodosClientes: FC = () => {
    const navigate = useNavigate()
    const { isAdmin, currentUser } = useAuth()
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
    const [selectedCliente, setSelectedCliente] = useState<string[]>([])
    const [selectedEstados, setSelectedEstados] = useState<Set<'cumplido_en_plazo' | 'cumplido_fuera_plazo' | 'vence_hoy' | 'pendiente_fuera_plazo' | 'pendiente_en_plazo'>>(new Set())
    const [claveFiltro, setClaveFiltro] = useState('')
    const [obligatorioFiltro, setObligatorioFiltro] = useState('')
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
    const [clientesList, setClientesList] = useState<Cliente[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [sortField, setSortField] = useState<'cliente' | 'proceso' | 'hito' | 'estado' | 'fecha_limite' | 'hora_limite' | 'fecha_estado' | 'linea' | 'estado_proceso' | 'cubo'>('fecha_limite')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [cumplimientosPorHito, setCumplimientosPorHito] = useState<Record<number, ClienteProcesoHitoCumplimiento[]>>({})
    const [subdepartamentos, setSubdepartamentos] = useState<Subdepartamento[]>([])
    const [selectedDepartamentos, setSelectedDepartamentos] = useState<string[]>([])
    const [selectedLineas, setSelectedLineas] = useState<string[]>([])

    // Función para normalizar texto
    const normalizeText = (text: string | null | undefined): string => {
        if (!text) return ''
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
    }

    // Función optimizada para cargar todos los hitos en una sola llamada
    const cargarTodosLosHitos = async () => {
        setLoading(true)
        try {
            // Llamada única optimizada al backend
            let response
            if (isAdmin) {
                response = await getStatusTodosClientes()
            } else {
                if (!currentUser?.email) {
                    console.error('El usuario no tiene email configurado')
                    setLoading(false)
                    return
                }
                response = await getStatusTodosClientesByUser(currentUser.email)
            }
            const todosLosHitos = response.hitos || []

            setHitos(todosLosHitos)
            setTotal(response.total || todosLosHitos.length)

            // Extraer lista única de clientes para el filtro
            const clientesUnicosMap = new Map<string, Cliente>()
            todosLosHitos.forEach(hito => {
                if (hito.cliente_id && !clientesUnicosMap.has(hito.cliente_id)) {
                    clientesUnicosMap.set(hito.cliente_id, {
                        idcliente: hito.cliente_id,
                        razsoc: hito.cliente_nombre,
                        cif: null,
                        cif_empresa: null,
                        direccion: null,
                        localidad: null,
                        provincia: null,
                        cpostal: null,
                        codigop: null,
                        pais: null,
                        cif_factura: null
                    })
                }
            })
            setClientesList(Array.from(clientesUnicosMap.values()))

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
            setClientesList([])
        } finally {
            setLoading(false)
        }
    }

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
        cargarTodosLosHitos()
        cargarSubdepartamentos()
    }, [isAdmin, currentUser])

    const formatDate = (date: string) => {
        return formatDateDisplay(date)
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

    const formatDateTime = (dateTime: string | null) => {
        return formatDateTimeDisplay(dateTime)
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
    const isFinalizadoFueraDePlazo = (h: ClienteProcesoHito): boolean => {
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
        setSelectedCliente([])
        setSelectedEstados(new Set())
        setFechaDesde(getTodayDate())
        setFechaHasta('')
        setSelectedLineas([])
        setSelectedDepartamentos([])
        setClaveFiltro('')
        setObligatorioFiltro('')
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

            if (selectedCliente.length > 0) {
                selectedCliente.forEach(id => params.append('cliente_id', id))
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

            if (selectedLineas.length > 0) {
                selectedLineas.forEach(l => params.append('lineas', l))
            }

            if (selectedDepartamentos.length > 0) {
                selectedDepartamentos.forEach(d => params.append('departamentos', d))
            }

            if (claveFiltro !== '') {
                params.append('critico', claveFiltro)
            }

            if (obligatorioFiltro !== '') {
                params.append('obligatorio', obligatorioFiltro)
            }

            if (debouncedSearchTerm) {
                params.append('search_term', debouncedSearchTerm)
            }

            if (!isAdmin && currentUser?.email) {
                params.append('email', currentUser.email)
            }

            // Determinar la URL base según el rol
            const baseUrl = isAdmin
                ? '/status-todos-clientes/exportar-excel'
                : '/cliente-proceso-hitos/status-todos-clientes/exportar-excel'

            // Construir URL completa
            const url = `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`

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
            let filename = `status_hitos_todos_clientes_${getTodayDate()}.xlsx`
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



    // Función para manejar el ordenamiento
    const handleSort = (field: 'cliente' | 'proceso' | 'hito' | 'estado' | 'fecha_limite' | 'hora_limite' | 'fecha_estado' | 'linea' | 'estado_proceso' | 'cubo') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Función para obtener el icono de ordenamiento
    const getSortIcon = (field: 'cliente' | 'proceso' | 'hito' | 'estado' | 'fecha_limite' | 'hora_limite' | 'fecha_estado' | 'linea' | 'estado_proceso' | 'cubo') => {
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
                case 'cliente':
                    const clienteA = a.cliente_nombre || ''
                    const clienteB = b.cliente_nombre || ''
                    comparison = clienteA.localeCompare(clienteB, 'es', { sensitivity: 'base' })
                    break

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
                    const cuboA = a.codSubDepar?.substring(4) || ''
                    const cuboB = b.codSubDepar?.substring(4) || ''
                    comparison = cuboA.localeCompare(cuboB, 'es', { sensitivity: 'base', numeric: true })
                    break

                case 'linea':
                    const linA = a.departamento_cliente || a.departamento || ''
                    const linB = b.departamento_cliente || b.departamento || ''
                    comparison = linA.localeCompare(linB, 'es', { sensitivity: 'base' })
                    break

                case 'estado_proceso':
                    const pEstA = a.estado_proceso || ''
                    const pEstB = b.estado_proceso || ''
                    comparison = pEstA.localeCompare(pEstB, 'es', { sensitivity: 'base' })
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
            const matchesCliente = selectedCliente.length === 0 || selectedCliente.includes(hito.cliente_id || '')

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

            const matchesLinea = selectedLineas.length === 0 || (hito.codSubDepar && selectedLineas.includes(hito.codSubDepar!))
            const matchesDepartamento = selectedDepartamentos.length === 0 || (hito.codSubDepar && selectedDepartamentos.includes(hito.codSubDepar!.substring(0, 4)))

            let matchesClave = true;
            if (claveFiltro !== '') {
                matchesClave = String(!!hito.critico) === claveFiltro;
            }

            let matchesObligatorio = true;
            if (obligatorioFiltro !== '') {
                matchesObligatorio = String(!!hito.obligatorio) === obligatorioFiltro;
            }

            return matchesSearch && matchesHitoOrProceso && matchesCliente && matchesEstado && matchesFecha && matchesLinea && matchesDepartamento && matchesClave && matchesObligatorio
        })

        return sortHitos(filtrados)
    }, [hitos, debouncedSearchTerm, selectedHito, selectedProceso, selectedCliente, selectedEstados, fechaDesde, fechaHasta, selectedLineas, selectedDepartamentos, claveFiltro, obligatorioFiltro, sortField, sortDirection, cumplimientosPorHito])

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

    // Obtener clientes únicos para el filtro
    const clientesUnicos = useMemo(() => {
        const clientesSet = new Map<string, { id: string, nombre: string }>()
        hitos.forEach(hito => {
            if (hito.cliente_id && hito.cliente_nombre) {
                clientesSet.set(hito.cliente_id, {
                    id: hito.cliente_id,
                    nombre: hito.cliente_nombre
                })
            }
        })
        return Array.from(clientesSet.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    }, [hitos])

    // Obtener hitos únicos para el filtro
    const hitosUnicos = useMemo(() => {
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

    // Obtener líneas únicas para el filtro a partir de los hitos
    const lineasUnicas = useMemo(() => {
        const lineaSet = new Set<string>()
        hitos.forEach(hito => {
            if (hito.codSubDepar && hito.codSubDepar.length > 4) {
                lineaSet.add(hito.codSubDepar.substring(4))
            }
        })
        return Array.from(lineaSet).sort()
    }, [hitos])

    // Obtener departamentos únicos para el filtro a partir de los hitos
    const departamentosUnicos = useMemo(() => {
        const depMap = new Map<string, { cod: string, nombre: string }>()
        hitos.forEach(hito => {
            if (hito.codSubDepar) {
                const codDep = hito.codSubDepar.substring(0, 4)
                const depName = (hito.ultimo_cumplimiento?.departamento) || hito.departamento_cliente || hito.departamento || codDep
                if (!depMap.has(codDep)) {
                    depMap.set(codDep, { cod: codDep, nombre: depName })
                } else if (depMap.get(codDep)?.nombre === codDep && depName !== codDep) {
                    depMap.set(codDep, { cod: codDep, nombre: depName })
                }
            }
        })
        return Array.from(depMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
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
            {/* Header compacto */}
            <PageHeader
                title="Status de Hitos - Todos los Clientes"
                subtitle="Vista global de todos los hitos de todos los clientes"
                icon="info-circle"
                backButton={
                    <button
                        className="btn d-flex align-items-center"
                        onClick={() => navigate(`/clientes`)}
                        style={{
                            backgroundColor: 'transparent',
                            border: `2px solid white`,
                            color: 'white',
                            fontFamily: atisaStyles.fonts.secondary,
                            fontWeight: '600',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            transition: 'all 0.3s ease'
                        }}
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
                        {/* Badge de filtros activos */}
                        {(selectedCliente.length > 0 || selectedProceso.length > 0 || selectedHito.length > 0 || selectedEstados.size > 0 || selectedLineas.length > 0 || selectedDepartamentos.length > 0 || fechaDesde || fechaHasta || debouncedSearchTerm || claveFiltro !== '' || obligatorioFiltro !== '') && (
                            <span
                                className="badge rounded-pill"
                                style={{
                                    backgroundColor: atisaStyles.colors.accent,
                                    color: 'white',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                            >
                                <i className="bi bi-funnel-fill me-1"></i>
                                {[
                                    selectedCliente.length,
                                    selectedProceso.length,
                                    selectedHito.length,
                                    selectedEstados.size,
                                    selectedLineas.length,
                                    selectedDepartamentos.length,
                                    fechaDesde ? 1 : 0,
                                    fechaHasta ? 1 : 0,
                                    debouncedSearchTerm ? 1 : 0,
                                    claveFiltro !== '' ? 1 : 0,
                                    obligatorioFiltro !== '' ? 1 : 0
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

                    {/* Cliente */}
                    {isAdmin && (
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Cliente</label>
                            <Select
                                isMulti
                                closeMenuOnSelect={false}
                                options={clientesUnicos.map(c => ({ value: c.id, label: c.nombre }))}
                                value={clientesUnicos
                                    .filter(c => selectedCliente.includes(c.id))
                                    .map(c => ({ value: c.id, label: c.nombre }))}
                                onChange={(opts) => setSelectedCliente(opts ? (opts as any[]).map((o: any) => o.value) : [])}
                                placeholder="Todos los clientes..."
                                noOptionsMessage={() => 'No hay opciones'}
                                menuPortalTarget={document.body}
                                styles={selectStyles}
                            />
                        </div>
                    )}

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
                            options={hitosUnicos.map(h => ({ value: String(h.id), label: h.nombre }))}
                            value={hitosUnicos
                                .filter(h => selectedHito.includes(String(h.id)))
                                .map(h => ({ value: String(h.id), label: h.nombre }))}
                            onChange={(opts) => setSelectedHito(opts ? (opts as any[]).map((o: any) => o.value) : [])}
                            placeholder="Todos los hitos..."
                            noOptionsMessage={() => 'No hay opciones'}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Líneas */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Líneas</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}
                            options={departamentosUnicos.map(d => ({ value: d.cod, label: d.nombre }))}
                            value={departamentosUnicos
                                .filter(d => selectedDepartamentos.includes(d.cod))
                                .map(d => ({ value: d.cod, label: d.nombre }))
                            }
                            onChange={(newValue) => setSelectedDepartamentos(newValue ? (newValue as any[]).map(v => v.value) : [])}
                            placeholder="Seleccionar departamentos..."
                            noOptionsMessage={() => "No hay opciones"}
                            menuPortalTarget={document.body}
                            styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                control: (base) => ({
                                    ...base,
                                    backgroundColor: 'rgba(255,255,255,0.12)',
                                    borderColor: 'rgba(255,255,255,0.25)',
                                    color: 'white',
                                    borderRadius: '8px'
                                }),
                                menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                    color: atisaStyles.colors.dark,
                                    cursor: 'pointer',
                                    ':active': { backgroundColor: atisaStyles.colors.secondary }
                                }),
                                multiValue: (base) => ({ ...base, backgroundColor: atisaStyles.colors.secondary, borderRadius: '4px' }),
                                multiValueLabel: (base) => ({ ...base, color: 'white', fontSize: '12px' }),
                                multiValueRemove: (base) => ({ ...base, color: 'white', ':hover': { backgroundColor: '#d32f2f', color: 'white' } }),
                                placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.6)', fontSize: '13px' }),
                                input: (base) => ({ ...base, color: 'white' }),
                                singleValue: (base) => ({ ...base, color: 'white' }),
                            }}
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
                                .filter(subDep => subDep.codSubDepar !== null && selectedLineas.includes(subDep.codSubDepar!))
                                .map(subDep => ({
                                    value: subDep.codSubDepar!,
                                    label: `${subDep.codSubDepar?.substring(4)} - ${subDep.nombre || ''}`
                                }))
                            }
                            onChange={(selectedOptions) => {
                                setSelectedLineas(selectedOptions ? (selectedOptions as any).map((opt: any) => opt.value) : [])
                            }}
                            placeholder="Seleccionar líneas..."
                            noOptionsMessage={() => "No hay opciones"}
                            menuPortalTarget={document.body}
                            styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                control: (base) => ({
                                    ...base,
                                    backgroundColor: 'rgba(255,255,255,0.12)',
                                    borderColor: 'rgba(255,255,255,0.25)',
                                    color: 'white',
                                    borderRadius: '8px'
                                }),
                                menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                    color: atisaStyles.colors.dark,
                                    cursor: 'pointer',
                                    ':active': { backgroundColor: atisaStyles.colors.secondary }
                                }),
                                multiValue: (base) => ({ ...base, backgroundColor: atisaStyles.colors.secondary, borderRadius: '4px' }),
                                multiValueLabel: (base) => ({ ...base, color: 'white', fontSize: '12px' }),
                                multiValueRemove: (base) => ({ ...base, color: 'white', ':hover': { backgroundColor: '#d32f2f', color: 'white' } }),
                                placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.6)', fontSize: '13px' }),
                                input: (base) => ({ ...base, color: 'white' }),
                                singleValue: (base) => ({ ...base, color: 'white' }),
                            }}
                        />
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

            <div className="flex-grow-1">
                {/* Tabla de hitos */}
                <div
                    className="card border-0"
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        style={{
                            padding: '1.5rem',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            backgroundColor: atisaStyles.colors.light
                        }}
                    >
                        <h3
                            style={{
                                fontFamily: atisaStyles.fonts.primary,
                                color: atisaStyles.colors.primary,
                                fontWeight: 'bold',
                                margin: 0,
                                fontSize: '1.3rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className="bi bi-list-ul" style={{ color: atisaStyles.colors.primary }}></i>
                            Listado de Hitos ({hitosFiltrados.length})
                        </h3>
                    </div>

                    <div className="table-responsive">
                        <table
                            className="table table-hover"
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
                                    {isAdmin && (
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('cliente')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                            Cliente {getSortIcon('cliente')}
                                        </th>
                                    )}
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('linea')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Línea {getSortIcon('linea')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('cubo')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Cubo {getSortIcon('cubo')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('proceso')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Proceso {getSortIcon('proceso')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('estado_proceso')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Estado Proceso {getSortIcon('estado_proceso')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('hito')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Hito {getSortIcon('hito')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('estado')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Estado {getSortIcon('estado')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('fecha_limite')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Fecha / Hora Límite {getSortIcon('fecha_limite')}
                                    </th>
                                    <th className="cursor-pointer user-select-none" onClick={() => handleSort('fecha_estado')} style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', color: 'white', backgroundColor: atisaStyles.colors.primary, cursor: 'pointer' }}>
                                        Fecha Actualización {getSortIcon('fecha_estado')}
                                    </th>

                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={isAdmin ? 9 : 8}
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
                                            colSpan={isAdmin ? 9 : 8}
                                            className="text-center py-4"
                                            style={{
                                                backgroundColor: '#f8f9fa',
                                                fontFamily: atisaStyles.fonts.secondary,
                                                padding: '2rem',
                                                color: atisaStyles.colors.dark
                                            }}
                                        >
                                            <i className="bi bi-info-circle me-2" style={{ color: atisaStyles.colors.dark }}></i>
                                            {debouncedSearchTerm || selectedHito || selectedProceso || selectedCliente || selectedEstados.size > 0 || fechaDesde || fechaHasta
                                                ? 'No se encontraron hitos con los filtros aplicados'
                                                : 'No hay hitos registrados'
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

                                        // Cálculo del texto de estado
                                        let estadoTexto = isFinalized ? 'Cumplido' : 'Pendiente'
                                        if (isFinalized) {
                                            estadoTexto = finalizadoFuera ? 'Cumplido fuera de plazo' : 'Cumplido en plazo'
                                        } else {
                                            if (venceHoy) {
                                                estadoTexto = 'Vence hoy'
                                            } else if (estadoVenc === 'vencido') {
                                                estadoTexto = 'Pendiente fuera de plazo'
                                            } else if (estadoVenc === 'en_plazo') {
                                                estadoTexto = 'Pendiente en plazo'
                                            }
                                        }

                                        return (
                                            <tr
                                                key={`${hito.cliente_id}-${hito.id}`}
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
                                                {isAdmin && (
                                                    <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.primary, fontWeight: '600', padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                        <span title={hito.cliente_nombre || 'No disponible'}>
                                                            {hito.cliente_nombre || 'No disponible'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.ultimo_cumplimiento ? (
                                                        hito.ultimo_cumplimiento.departamento || '-'
                                                    ) : (
                                                        hito.departamento_cliente || hito.departamento || '-'
                                                    )}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.ultimo_cumplimiento?.codSubDepar ? (
                                                        hito.ultimo_cumplimiento.codSubDepar!.substring(4)
                                                    ) : hito.codSubDepar ? (
                                                        hito.codSubDepar!.substring(4)
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.proceso_nombre || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    {hito.estado_proceso || '-'}
                                                </td>
                                                <td style={{ fontFamily: atisaStyles.fonts.secondary, color: atisaStyles.colors.dark, padding: '16px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                                                    <div className='d-flex align-items-center gap-2' style={{ position: 'relative', paddingLeft: (Boolean(hito.critico) || Boolean(hito.obligatorio)) ? '10px' : '0' }}>
                                                        {Boolean(hito.critico) && (
                                                            <div style={{ position: 'absolute', left: '-12px', top: '-10px', bottom: '-10px', width: '5px', backgroundColor: atisaStyles.colors.error, borderRadius: '0 3px 3px 0' }} />
                                                        )}
                                                        {!Boolean(hito.critico) && Boolean(hito.obligatorio) && (
                                                            <div style={{ position: 'absolute', left: '-12px', top: '-10px', bottom: '-10px', width: '5px', backgroundColor: atisaStyles.colors.accent, borderRadius: '0 3px 3px 0' }} />
                                                        )}
                                                        <span style={{ fontWeight: Boolean(hito.critico) ? '700' : '600', color: atisaStyles.colors.primary, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hito.hito_nombre}>
                                                            {hito.hito_nombre || '-'}
                                                        </span>
                                                        {Boolean(hito.obligatorio) && (
                                                            <div className='d-flex align-items-center justify-content-center flex-shrink-0' style={{ backgroundColor: atisaStyles.colors.accent, width: '20px', height: '20px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,161,222,0.3)' }} title='Obligatorio'>
                                                                <i className='bi bi-asterisk' style={{ fontSize: '11px', color: '#fff', lineHeight: 1 }}></i>
                                                            </div>
                                                        )}
                                                        {Boolean(hito.critico) && (
                                                            <div className='d-flex align-items-center justify-content-center flex-shrink-0' style={{ backgroundColor: atisaStyles.colors.error, width: '20px', height: '20px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(217,33,78,0.4)' }} title='Crítico'>
                                                                <i className='bi bi-exclamation-triangle-fill' style={{ fontSize: '11px', color: '#fff', lineHeight: 1 }}></i>
                                                            </div>
                                                        )}
                                                    </div>
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

                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {hitosFiltrados.length > itemsPerPage && (
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
                    )}
                </div>
            </div>
        </div>
    )
}

export default StatusTodosClientes
