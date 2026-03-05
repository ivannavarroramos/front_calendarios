import { FC, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { atisaStyles, getSecondaryButtonStyles } from '../../../../styles/atisaStyles'
import { getStatusTodosClientes, getStatusTodosClientesByUser, HitoCompletoConInfo } from '../../../../api/statusTodosClientes'
import Select, { components } from 'react-select'
import { useAuth } from '../../../../modules/auth/core/Auth'
import SharedPagination from '../../../../components/pagination/SharedPagination'
import CumplimentarHitosMasivoModal from './CumplimentarHitosMasivoModal'
import { getAllSubdepartamentos, Subdepartamento } from '../../../../api/subdepartamentos'
import PageHeader from '../../../../components/ui/PageHeader'



const CumplimientoMasivo: FC = () => {
    const navigate = useNavigate()
    const { currentUser, isAdmin } = useAuth()

    // Datos y carga
    const [loading, setLoading] = useState(false)
    const [allItems, setAllItems] = useState<HitoCompletoConInfo[]>([])

    // Estados para filtros
    const getTodayDate = () => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    }
    const [fechaDesde, setFechaDesde] = useState<string>(getTodayDate())
    const [fechaHasta, setFechaHasta] = useState<string>('')
    const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([])

    // Filtros Multi-select (IDs)
    const [selectedProcesos, setSelectedProcesos] = useState<{ value: number; label: string }[]>([])
    const [selectedHitos, setSelectedHitos] = useState<{ value: number; label: string }[]>([])
    const [filterClave, setFilterClave] = useState<string>('')
    const [filterObligatorio, setFilterObligatorio] = useState<string>('')
    const [selectedLineas, setSelectedLineas] = useState<string[]>([])
    const [selectedDepartamentos, setSelectedDepartamentos] = useState<string[]>([])
    const [subdepartamentos, setSubdepartamentos] = useState<Subdepartamento[]>([])

    // Paginación y Ordenación
    const [page, setPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [limit] = useState(10)
    const [sortField, setSortField] = useState<string>('fecha_limite')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Selección
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Modal
    const [showCumplimentarModal, setShowCumplimentarModal] = useState(false)

    // Cargar datos al montar
    useEffect(() => {
        loadAllData()
        cargarSubdepartamentos()
    }, [isAdmin, currentUser])

    const cargarSubdepartamentos = async () => {
        try {
            const response = await getAllSubdepartamentos(undefined, 1000, undefined, 'asc')
            setSubdepartamentos(response.subdepartamentos || [])
        } catch (error) {
            console.error('Error cargando subdepartamentos:', error)
        }
    }

    const loadAllData = async () => {
        if (!isAdmin && !currentUser?.email) return

        setLoading(true)
        try {
            let response
            if (isAdmin) {
                response = await getStatusTodosClientes()
            } else {
                response = await getStatusTodosClientesByUser(currentUser!.email!)
            }
            setAllItems(response.hitos || [])
        } catch (error) {
            console.error('Error al cargar datos:', error)
            setAllItems([])
        } finally {
            setLoading(false)
        }
    }

    // Derivar opciones para filtros basadas en los datos cargados
    // Obtener líneas únicas para el filtro a partir de los hitos
    const lineasUnicas = useMemo(() => {
        const lineaSet = new Set<string>()
        allItems.forEach(hito => {
            if (hito.codSubDepar && hito.codSubDepar.length > 4) {
                lineaSet.add(hito.codSubDepar.substring(4))
            }
        })
        return Array.from(lineaSet).sort()
    }, [allItems])

    const departamentosUnicos = useMemo(() => {
        const depMap = new Map<string, { cod: string, nombre: string }>()
        allItems.forEach(item => {
            if (item.codSubDepar) {
                const codDep = item.codSubDepar.substring(0, 4)
                const depName = item.departamento_cliente || item.departamento || codDep
                if (!depMap.has(codDep)) {
                    depMap.set(codDep, { cod: codDep, nombre: depName })
                }
            }
        })
        return Array.from(depMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    }, [allItems])

    const { clientesOpts, procesosOpts, hitosOpts } = useMemo(() => {
        const clientesMap = new Map<string, string>()
        const procesosMap = new Map<number, string>()
        const hitosMap = new Map<number, string>()
        const responsablesSet = new Set<string>()

        allItems.forEach(item => {
            if (item.cliente_id && item.cliente_nombre) {
                clientesMap.set(item.cliente_id, item.cliente_nombre)
            }
            if (item.proceso_id && item.proceso_nombre) {
                procesosMap.set(item.proceso_id, item.proceso_nombre)
            }
            if (item.hito_id && item.hito_nombre) {
                hitosMap.set(item.hito_id, item.hito_nombre)
            }
            if (item.tipo) {
                responsablesSet.add(item.tipo)
            }
        })

        const cOpts = Array.from(clientesMap.entries()).map(([id, nombre]) => ({
            id: id,
            nombre: `${nombre}`
        })).sort((a, b) => a.nombre.localeCompare(b.nombre))

        const pOpts = Array.from(procesosMap.entries()).map(([id, nombre]) => ({
            value: id,
            label: nombre
        })).sort((a, b) => a.label.localeCompare(b.label))

        const hOpts = Array.from(hitosMap.entries()).map(([id, nombre]) => ({
            value: id,
            label: nombre
        })).sort((a, b) => a.label.localeCompare(b.label))

        return { clientesOpts: cOpts, procesosOpts: pOpts, hitosOpts: hOpts }
    }, [allItems])


    // Función para normalizar texto
    const normalizeText = (text: string | null | undefined): string => {
        if (!text) return ''
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
    }

    // Filtrar items
    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            // Filtro Búsqueda
            if (searchTerm) {
                const search = normalizeText(searchTerm)
                const proc = normalizeText(item.proceso_nombre)
                const hito = normalizeText(item.hito_nombre)
                const cli = normalizeText(item.cliente_nombre)
                if (!proc.includes(search) && !hito.includes(search) && !cli.includes(search)) return false
            }

            // Filtro Cliente
            if (selectedClienteIds.length > 0 && !selectedClienteIds.includes(item.cliente_id)) return false

            // Filtro Fechas (sobre fecha_limite)
            if (fechaDesde) {
                if (item.fecha_limite < fechaDesde) return false
            }
            if (fechaHasta) {
                if (item.fecha_limite > fechaHasta) return false
            }

            // Filtro Procesos (Multi)
            if (selectedProcesos.length > 0) {
                const procIds = selectedProcesos.map(p => p.value)
                if (!procIds.includes(item.proceso_id)) return false
            }

            // Filtro Hitos (Multi)
            if (selectedHitos.length > 0) {
                const hitoIds = selectedHitos.map(h => h.value)
                if (!hitoIds.includes(item.hito_id)) return false
            }

            // Filtro Clave
            if (filterClave !== '') {
                if (String(!!item.critico) !== filterClave) return false
            }

            // Filtro Obligatorio
            if (filterObligatorio !== '') {
                if (String(!!item.obligatorio) !== filterObligatorio) return false
            }

            // Filtro Departamentos y Líneas
            if (selectedLineas.length > 0) {
                if (!item.codSubDepar || !selectedLineas.includes(item.codSubDepar)) return false
            }
            if (selectedDepartamentos.length > 0) {
                if (!item.codSubDepar || !selectedDepartamentos.includes(item.codSubDepar.substring(0, 4))) return false
            }

            return true
        })
    }, [allItems, selectedClienteIds, fechaDesde, fechaHasta, selectedProcesos, selectedHitos, searchTerm, filterClave, filterObligatorio, selectedDepartamentos, selectedLineas])

    // Ordenar items
    const sortedItems = useMemo(() => {
        const sorted = [...filteredItems]
        sorted.sort((a, b) => {
            let valA: any = ''
            let valB: any = ''

            switch (sortField) {
                case 'cliente':
                    valA = a.cliente_nombre || ''
                    valB = b.cliente_nombre || ''
                    break
                case 'cubo':
                    valA = a.codSubDepar ? a.codSubDepar.substring(4) : ''
                    valB = b.codSubDepar ? b.codSubDepar.substring(4) : ''
                    break
                case 'linea':
                    valA = a.departamento_cliente || a.departamento || ''
                    valB = b.departamento_cliente || b.departamento || ''
                    break
                case 'proceso':
                    valA = a.proceso_nombre || ''
                    valB = b.proceso_nombre || ''
                    break
                case 'hito':
                    valA = a.hito_nombre || ''
                    valB = b.hito_nombre || ''
                    break
                case 'responsable':
                    valA = a.tipo || ''
                    valB = b.tipo || ''
                    break
                case 'clave':
                    valA = a.critico ? 1 : 0
                    valB = b.critico ? 1 : 0
                    break
                case 'estado':
                    valA = a.estado || ''
                    valB = b.estado || ''
                    break
                case 'fecha_limite':
                    valA = a.fecha_limite || ''
                    valB = b.fecha_limite || ''
                    break
                default:
                    return 0
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
        })
        return sorted
    }, [filteredItems, sortField, sortDirection])

    // Paginar items
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * limit
        return sortedItems.slice(start, start + limit)
    }, [sortedItems, page, limit])

    // Funciones de manejo
    const handleResetFiltros = () => {
        setFechaDesde(getTodayDate())
        setFechaHasta('')
        setSelectedClienteIds([])
        setSelectedProcesos([])
        setSelectedHitos([])
        setFilterClave('')
        setFilterObligatorio('')
        setSelectedLineas([])
        setSelectedDepartamentos([])
        setSearchTerm('')
        setPage(1)
    }

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const onSelectRow = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }


    const onSelectAllVisible = (checked: boolean) => {
        if (checked) {
            const visibleIds = filteredItems.map(i => i.id)
            const newIds = [...selectedIds]
            visibleIds.forEach(id => {
                if (!newIds.includes(id)) newIds.push(id)
            })
            setSelectedIds(newIds)
        } else {
            const visibleIds = filteredItems.map(i => i.id)
            setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)))
        }
    }

    const areAllVisibleSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.includes(i.id))

    const handleMassSuccess = (count: number) => {
        loadAllData()
        setSelectedIds([])
        alert(`Se han cumplimentado ${count} hitos correctamente`)
    }

    const getSortIcon = (field: string) => {
        if (sortField !== field) return <i className='bi bi-arrow-down-up ms-1 text-muted' style={{ fontSize: '10px' }}></i>
        return <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'} ms-1 text-white`} style={{ fontSize: '12px' }}></i>
    }

    // Funciones auxiliares para estado visual
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

    const isFinalizadoFueraDePlazo = (item: HitoCompletoConInfo): boolean => {
        if (item.estado !== 'Finalizado') return false
        if (!item.ultimo_cumplimiento) return false

        const c = item.ultimo_cumplimiento
        if (!c.fecha) return false
        const horaStr = c.hora ? (c.hora.includes(':') ? c.hora : `${c.hora}:00`) : '00:00:00'
        const fechaCumplimiento = new Date(`${c.fecha}T${horaStr.length === 5 ? horaStr + ':00' : horaStr}`)

        if (!item.fecha_limite) return false
        const limitTimeStr = item.hora_limite ? (item.hora_limite.includes(':') ? item.hora_limite : `${item.hora_limite}:00`) : '23:59:59'
        const fechaLimite = new Date(`${item.fecha_limite}T${limitTimeStr.length === 5 ? limitTimeStr + ':00' : limitTimeStr}`)

        return fechaCumplimiento.getTime() > fechaLimite.getTime()
    }

    // Funciones de renderizado
    const renderResponsable = (tipo: string) => {
        return <span className="text-gray-800 fw-bold">{tipo}</span>
    }

    const renderClave = (critico: number | boolean) => {
        return critico ?
            <span className="badge" style={{ backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', fontWeight: '600' }}>Clave</span> :
            <span className="text-muted small">No clave</span>
    }

    // Estilos extraídos
    const tableHeaderStyle = {
        fontFamily: atisaStyles.fonts.primary,
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '16px 12px',
        borderBottom: `3px solid ${atisaStyles.colors.primary}`,
        color: atisaStyles.colors.primary,
        backgroundColor: atisaStyles.colors.light,
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    }

    const tableCellStyleBase = {
        fontFamily: atisaStyles.fonts.secondary,
        padding: '16px 12px',
        verticalAlign: 'middle',
        fontSize: '13px'
    }

    // Estilos comunes para todos los `react-select` del Drawer
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
                padding: '20px'
            }}
        >
            <PageHeader
                title="Cumplimiento Masivo de Hitos"
                subtitle="Gestión agrupada de estados y evidencias"
                icon="check-all"
                backButton={
                    <button
                        className="btn"
                        onClick={() => navigate(-1)}
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
                        <i className="bi bi-arrow-left"></i>
                        Volver
                    </button>
                }
                actions={
                    <div className="d-flex gap-3">
                        <button
                            className="btn"
                            onClick={() => setShowFilters(true)}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '8px',
                                fontFamily: atisaStyles.fonts.secondary,
                                fontWeight: '600',
                                padding: '8px 16px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <i className="bi bi-funnel-fill" style={{ color: 'white' }}></i>
                            Filtros
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setShowCumplimentarModal(true)}
                            disabled={selectedIds.length === 0}
                            style={{
                                backgroundColor: selectedIds.length === 0 ? 'rgba(255, 255, 255, 0.2)' : atisaStyles.colors.secondary,
                                color: 'white',
                                border: selectedIds.length === 0 ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                                borderRadius: '8px',
                                fontFamily: atisaStyles.fonts.secondary,
                                fontWeight: '600',
                                padding: '8px 16px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                opacity: selectedIds.length === 0 ? 0.7 : 1,
                                cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                                boxShadow: selectedIds.length > 0 ? '0 4px 12px rgba(156, 186, 57, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedIds.length > 0) {
                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedIds.length > 0) {
                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }
                            }}
                        >
                            <i className="bi bi-file-earmark-check" style={{ color: 'white' }}></i>
                            Cumplimentar {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                        </button>
                    </div>
                }
            />

            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-body p-0">
                    <div className="p-6">


                        {/* Contador */}
                        <div
                            style={{
                                backgroundColor: atisaStyles.colors.light,
                                padding: '12px 16px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: `1px solid ${atisaStyles.colors.accent}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: atisaStyles.fonts.secondary,
                                    color: atisaStyles.colors.primary,
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                <i className="bi bi-check-circle me-2"></i>
                                Seleccionados: {selectedIds.length} / Filtrados: {filteredItems.length}
                            </span>
                            <div className="d-flex gap-2">
                                {filteredItems.length > 0 && selectedIds.length < filteredItems.length && (
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        onClick={() => onSelectAllVisible(true)}
                                        style={{
                                            backgroundColor: atisaStyles.colors.accent,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                        }}
                                    >
                                        <i className="bi bi-check-all me-1"></i>
                                        Todos (Filtrados)
                                    </button>
                                )}
                                {selectedIds.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        onClick={() => onSelectAllVisible(false)}
                                        style={{
                                            backgroundColor: 'transparent',
                                            color: atisaStyles.colors.dark,
                                            border: `1px solid ${atisaStyles.colors.dark}`,
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                        }}
                                    >
                                        <i className="bi bi-x me-1"></i>
                                        Limpiar Selección
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="table-responsive">
                            <table className="table table-hover"
                                style={{ fontFamily: atisaStyles.fonts.secondary, margin: 0 }}
                            >
                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr
                                        style={{
                                            backgroundColor: atisaStyles.colors.light,
                                            color: atisaStyles.colors.primary,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <th style={{ width: '50px', padding: '16px 12px', borderBottom: `3px solid ${atisaStyles.colors.primary}`, backgroundColor: atisaStyles.colors.light }}>
                                            <div className="form-check form-check-sm form-check-custom form-check-solid">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={areAllVisibleSelected}
                                                    onChange={(e) => onSelectAllVisible(e.target.checked)}
                                                    disabled={filteredItems.length === 0}
                                                    style={{
                                                        borderColor: atisaStyles.colors.primary,
                                                        backgroundColor: areAllVisibleSelected ? atisaStyles.colors.secondary : 'transparent'
                                                    }}
                                                />
                                            </div>
                                        </th>
                                        {isAdmin && (
                                            <th className="cursor-pointer user-select-none" onClick={() => handleSort('cliente')} style={tableHeaderStyle}>
                                                Cliente {getSortIcon('cliente')}
                                            </th>
                                        )}
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('cubo')} style={tableHeaderStyle}>
                                            Cubo {getSortIcon('cubo')}
                                        </th>
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('linea')} style={tableHeaderStyle}>
                                            Línea {getSortIcon('linea')}
                                        </th>
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('proceso')} style={tableHeaderStyle}>
                                            Proceso {getSortIcon('proceso')}
                                        </th>
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('hito')} style={tableHeaderStyle}>
                                            Hito {getSortIcon('hito')}
                                        </th>
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('responsable')} style={tableHeaderStyle}>
                                            Responsable {getSortIcon('responsable')}
                                        </th>
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('estado')} style={tableHeaderStyle}>
                                            Estado {getSortIcon('estado')}
                                        </th>
                                        <th className="cursor-pointer user-select-none" onClick={() => handleSort('fecha_limite')} style={tableHeaderStyle}>
                                            Fecha / Hora Límite {getSortIcon('fecha_limite')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '40px 20px', color: atisaStyles.colors.dark, fontFamily: atisaStyles.fonts.secondary }}>
                                                <i className="bi bi-inbox" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
                                                {loading ? 'Cargando datos...' : 'No se encontraron registros'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item, index) => {
                                            const isSelected = selectedIds.includes(item.id)
                                            const isFinalized = item.estado === 'Finalizado'
                                            const isNuevo = item.estado === 'Nuevo'
                                            const estadoVenc = getEstadoVencimiento(item.fecha_limite, item.estado)
                                            const finalizadoFuera = isFinalizadoFueraDePlazo(item)
                                            const venceHoy = isNuevo && estadoVenc === 'hoy'

                                            let badgeColors = { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' }
                                            let estadoTexto = isFinalized ? 'Cumplido' : 'Pendiente'

                                            if (isFinalized) {
                                                if (finalizadoFuera) {
                                                    badgeColors = { bg: '#fff3e0', color: '#ef6c00', border: '#ffe0b2' } // Naranja
                                                    estadoTexto = 'Cumplido fuera de plazo'
                                                } else {
                                                    badgeColors = { bg: '#e8f5e8', color: '#2e7d32', border: '#c8e6c9' } // Verde
                                                    estadoTexto = 'Cumplido en plazo'
                                                }
                                            } else {
                                                if (venceHoy) {
                                                    badgeColors = { bg: '#fff8e1', color: '#f9a825', border: '#ffecb3' } // Amarillo
                                                    estadoTexto = 'Vence hoy'
                                                } else if (estadoVenc === 'vencido') {
                                                    badgeColors = { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' } // Rojo
                                                    estadoTexto = 'Pendiente fuera de plazo'
                                                } else if (estadoVenc === 'sin_fecha') {
                                                    badgeColors = { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' }
                                                    estadoTexto = 'Sin fecha'
                                                } else {
                                                    badgeColors = { bg: '#e0f2f1', color: '#00695c', border: '#b2dfdb' } // Teal
                                                    estadoTexto = 'Pendiente en plazo'
                                                }
                                            }

                                            return (
                                                <tr
                                                    key={item.id}
                                                    style={{
                                                        backgroundColor: isSelected ? 'rgba(156, 186, 57, 0.15)' : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                                                        transition: 'all 0.2s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={(e) => {
                                                        if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                                            onSelectRow(item.id)
                                                        }
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.backgroundColor = '#e9ecef'
                                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                                                            e.currentTarget.style.transform = 'translateY(0)'
                                                            e.currentTarget.style.boxShadow = 'none'
                                                        }
                                                    }}
                                                >
                                                    <td style={{ ...tableCellStyleBase, width: '50px', borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                        <div className="form-check form-check-sm form-check-custom form-check-solid">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                checked={selectedIds.includes(item.id)}
                                                                onChange={(e) => onSelectRow(item.id)}
                                                            />
                                                        </div>
                                                    </td>
                                                    {isAdmin && (
                                                        <td style={{ ...tableCellStyleBase, color: isSelected ? atisaStyles.colors.secondary : atisaStyles.colors.primary, fontWeight: '600', borderBottom: `1px solid ${atisaStyles.colors.light}` }}>{item.cliente_nombre}</td>
                                                    )}
                                                    <td style={{ ...tableCellStyleBase, color: atisaStyles.colors.dark, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                        {item.codSubDepar ? item.codSubDepar.substring(4) : '-'}
                                                    </td>
                                                    <td style={{ ...tableCellStyleBase, color: atisaStyles.colors.dark, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                        {item.departamento_cliente || item.departamento || '-'}
                                                    </td>
                                                    <td style={{ ...tableCellStyleBase, color: atisaStyles.colors.dark, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>{item.proceso_nombre}</td>
                                                    <td style={{ ...tableCellStyleBase, color: atisaStyles.colors.dark, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                        <div className='d-flex align-items-center gap-2' style={{ position: 'relative', paddingLeft: (Boolean(item.critico) || Boolean(item.obligatorio)) ? '10px' : '0' }}>
                                                            {Boolean(item.critico) && (
                                                                <div style={{ position: 'absolute', left: '-12px', top: '-10px', bottom: '-10px', width: '5px', backgroundColor: atisaStyles.colors.error, borderRadius: '0 3px 3px 0' }} />
                                                            )}
                                                            {!Boolean(item.critico) && Boolean(item.obligatorio) && (
                                                                <div style={{ position: 'absolute', left: '-12px', top: '-10px', bottom: '-10px', width: '5px', backgroundColor: atisaStyles.colors.accent, borderRadius: '0 3px 3px 0' }} />
                                                            )}
                                                            <span style={{ fontWeight: Boolean(item.critico) ? '700' : '500' }}>
                                                                {item.hito_nombre || '-'}
                                                            </span>
                                                            {Boolean(item.obligatorio) && (
                                                                <div className='d-flex align-items-center justify-content-center flex-shrink-0' style={{ backgroundColor: atisaStyles.colors.accent, width: '20px', height: '20px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,161,222,0.3)' }} title='Obligatorio'>
                                                                    <i className='bi bi-asterisk' style={{ fontSize: '11px', color: '#fff', lineHeight: 1 }}></i>
                                                                </div>
                                                            )}
                                                            {Boolean(item.critico) && (
                                                                <div className='d-flex align-items-center justify-content-center flex-shrink-0' style={{ backgroundColor: atisaStyles.colors.error, width: '20px', height: '20px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(217,33,78,0.4)' }} title='Crítico'>
                                                                    <i className='bi bi-exclamation-triangle-fill' style={{ fontSize: '11px', color: '#fff', lineHeight: 1 }}></i>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tableCellStyleBase, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>{renderResponsable(item.tipo)}</td>
                                                    <td style={{ ...tableCellStyleBase, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                        <span
                                                            className="badge"
                                                            style={{
                                                                backgroundColor: badgeColors.bg,
                                                                color: badgeColors.color,
                                                                border: `1px solid ${badgeColors.border}`,
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                padding: '6px 10px',
                                                                borderRadius: '6px'
                                                            }}
                                                        >
                                                            {estadoTexto}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tableCellStyleBase, color: atisaStyles.colors.dark, borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                        {item.fecha_limite} {item.hora_limite ? (item.hora_limite.length > 5 ? item.hora_limite.slice(0, 5) : item.hora_limite) : ''}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredItems.length > 0 && (
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '16px 20px',
                                borderRadius: '8px',
                                marginTop: '20px'
                            }}>
                                <SharedPagination
                                    currentPage={page}
                                    totalItems={filteredItems.length}
                                    pageSize={limit}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modal de cumplimiento (mantenido como modal interno) */}
            {showCumplimentarModal && (
                <CumplimentarHitosMasivoModal
                    show={showCumplimentarModal}
                    onHide={() => setShowCumplimentarModal(false)}
                    ids={selectedIds}
                    onSuccess={handleMassSuccess}
                />
            )}
            {/* Drawer de Filtros */}
            {showFilters && (
                <div
                    onClick={() => setShowFilters(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'transparent',
                        zIndex: 1040,
                        transition: 'opacity 0.3s'
                    }}
                />
            )}

            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: showFilters ? 0 : '-400px',
                    width: '400px',
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
                            onClick={handleResetFiltros}
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
                                className="form-control form-control-sm"
                                placeholder="Proceso, hito..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                            />
                        </div>
                    </div>

                    {/* Cliente */}
                    {isAdmin && (
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Cliente</label>
                            <Select
                                isMulti
                                closeMenuOnSelect={false}
                                options={clientesOpts.map(c => ({ value: c.id, label: c.nombre }))}
                                value={clientesOpts
                                    .filter(c => selectedClienteIds.includes(c.id))
                                    .map(c => ({ value: c.id, label: c.nombre }))}
                                onChange={(opts) => {
                                    setSelectedClienteIds(opts ? (opts as any[]).map((o: any) => o.value) : [])
                                    setPage(1)
                                }}
                                placeholder="Todos los clientes..."
                                noOptionsMessage={() => 'No hay opciones'}
                                menuPortalTarget={document.body}
                                styles={selectStyles}
                            />
                        </div>
                    )}

                    {/* Fechas */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Rango de Fechas (Límite)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '4px', display: 'block' }}>Desde</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '4px', display: 'block' }}>Hasta</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Proceso */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Procesos</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}


                            options={procesosOpts}
                            value={selectedProcesos}
                            onChange={(newValue) => {
                                setSelectedProcesos(newValue as { value: number; label: string }[])
                                setPage(1)
                            }}
                            placeholder="Seleccionar procesos..."
                            menuPortalTarget={document.body}
                            styles={selectStyles}
                        />
                    </div>

                    {/* Hito */}
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Hitos</label>
                        <Select
                            isMulti
                            closeMenuOnSelect={false}


                            options={hitosOpts}
                            value={selectedHitos}
                            onChange={(newValue) => {
                                setSelectedHitos(newValue as { value: number; label: string }[])
                                setPage(1)
                            }}
                            placeholder="Seleccionar hitos..."
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
                                .filter(subDep => subDep.codSubDepar !== null && selectedLineas.includes(subDep.codSubDepar!))
                                .map(subDep => ({
                                    value: subDep.codSubDepar!,
                                    label: `${subDep.codSubDepar?.substring(4)} - ${subDep.nombre || ''}`
                                }))
                            }
                            onChange={(selectedOptions) => {
                                setSelectedLineas(selectedOptions ? (selectedOptions as any).map((opt: any) => opt.value) : [])
                            }}
                            placeholder="Seleccionar cubos..."
                            noOptionsMessage={() => "No hay opciones"}
                            menuPortalTarget={document.body}
                            styles={selectStyles}
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
                                    onClick={() => setFilterClave(opt.value)}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: filterClave === opt.value ? (opt.color || 'white') : 'rgba(255,255,255,0.1)',
                                        color: filterClave === opt.value ? (opt.color ? 'white' : atisaStyles.colors.primary) : 'white',
                                        border: `1px solid ${opt.color || 'white'}`,
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        opacity: filterClave === opt.value ? 1 : 0.65,
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
                                    onClick={() => setFilterObligatorio(opt.value)}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: filterObligatorio === opt.value ? (opt.color || 'white') : 'rgba(255,255,255,0.1)',
                                        color: filterObligatorio === opt.value ? (opt.color ? 'white' : atisaStyles.colors.primary) : 'white',
                                        border: `1px solid ${opt.color || 'white'}`,
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        opacity: filterObligatorio === opt.value ? 1 : 0.65,
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

        </div>
    )
}

export default CumplimientoMasivo
