import React, { FC, useEffect, useState } from 'react'
import { Cliente, getClientesConDepartamentos, ConfiguracionAvisos } from '../../api/clientes'
import { getAllSubdepartamentos, Subdepartamento } from '../../api/subdepartamentos'
import { createConfigAvisos, updateConfigAvisos, ConfigAvisosPayload } from '../../api/configAvisos'
import { atisaStyles, getTableHeaderStyles, getTableCellStyles } from '../../styles/atisaStyles'
import SharedPagination from '../../components/pagination/SharedPagination'
import { Spinner } from 'react-bootstrap'
import CustomToast from '../../components/ui/CustomToast'
import PageHeader from '../../components/ui/PageHeader'

const ConfigAvisosPage: FC = () => {
    const [allClientes, setAllClientes] = useState<Cliente[]>([])
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const limit = 10
    const [expandedClientValues, setExpandedClientValues] = useState<Set<string>>(new Set())

    // Saving state per department: key = `${clientId}-${codSubDepar}`
    const [savingDepartments, setSavingDepartments] = useState<Set<string>>(new Set())

    // Toast state
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({
        show: false,
        message: '',
        type: 'info'
    })

    // Search state
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
    const [searching, setSearching] = useState(false)

    // Department filter state
    const [departments, setDepartments] = useState<Subdepartamento[]>([])
    const [selectedDepartment, setSelectedDepartment] = useState<string>('')
    const [loadingDepartments, setLoadingDepartments] = useState(false)

    // Load departments on mount
    useEffect(() => {
        const loadDepartments = async () => {
            setLoadingDepartments(true)
            try {
                const response = await getAllSubdepartamentos(undefined, 1000, undefined, 'asc')
                setDepartments(response.subdepartamentos || [])
            } catch (error) {
                console.error('Error loading departments:', error)
                setDepartments([])
            } finally {
                setLoadingDepartments(false)
            }
        }
        loadDepartments()
    }, [])

    // Debounce logic
    useEffect(() => {
        if (searchTerm) {
            setSearching(true)
        }
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
            setSearching(false)
        }, 500)

        return () => {
            clearTimeout(timer)
        }
    }, [searchTerm])

    // Reset page on filter change
    useEffect(() => {
        setPage(1)
    }, [debouncedSearchTerm, selectedDepartment])

    // --- Configuration Types ---

    type AvisoConfig = {
        enabled: boolean
        periodicityId: number
        value: string
    }

    type ProximoVencimientoConfig = AvisoConfig & {
        days_before: number
    }

    type DepartmentConfig = {
        id?: number | string // Stores the ID from backend if saved
        unified: boolean
        vence_hoy: AvisoConfig
        proximo_vencimiento: ProximoVencimientoConfig
        vencido: AvisoConfig
    }

    // Key = `${clientId}-${codSubDepar}`
    const [avisosConfig, setAvisosConfig] = useState<Record<string, DepartmentConfig>>({})

    // Load data
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const clientesResponse = await getClientesConDepartamentos(
                1,
                1000,
                undefined,
                undefined,
                undefined,
                undefined
            )
            setAllClientes(clientesResponse.clientes || [])

            // Process existing configurations in the response
            const newConfigs: Record<string, DepartmentConfig> = {}
            clientesResponse.clientes?.forEach(cliente => {
                cliente.departamentos?.forEach(dep => {
                    // Check if 'configuracion' exists on the department object
                    // Since we updated 'Cliente' interface, we assume it's there if backend returns it
                    // Assuming 'dep' is of type 'Departamento' from '../api/clientes' which now has 'configuracion'
                    if (dep.configuracion) {
                        const conf = dep.configuracion
                        const key = `${cliente.idcliente}-${dep.codSubDepar}`

                        // Helper to map backend values to UI state
                        const mapAviso = (
                            enabled: boolean,
                            period: number,
                            timeVal: number | null,
                            hourVal: string | null
                        ): AvisoConfig => {
                            const isDay = Number(period) === 1
                            // If Period is Days (1), value comes from hourVal (HH:MM)
                            // If Period is Hours/Mins (!= 1), value comes from timeVal (number)
                            const val = isDay ? (hourVal || '') : String(timeVal !== null ? timeVal : '')
                            return {
                                enabled: enabled,
                                periodicityId: period,
                                value: val
                            }
                        }

                        newConfigs[key] = {
                            id: conf.id,
                            unified: conf.config_global,
                            vence_hoy: mapAviso(
                                conf.aviso_vence_hoy,
                                conf.temporicidad_vence_hoy || 1,
                                conf.tiempo_vence_hoy,
                                conf.hora_vence_hoy
                            ),
                            proximo_vencimiento: {
                                ...mapAviso(
                                    conf.aviso_proximo_vencimiento,
                                    conf.temporicidad_proximo_vencimiento || 1,
                                    conf.tiempo_proximo_vencimiento,
                                    conf.hora_proximo_vencimiento
                                ),
                                days_before: conf.dias_proximo_vencimiento || 1
                            },
                            vencido: mapAviso(
                                conf.aviso_vencido,
                                conf.temporicidad_vencido || 1,
                                conf.tiempo_vencido,
                                conf.hora_vencido
                            )
                        }
                    }
                })
            })
            setAvisosConfig(prev => ({ ...prev, ...newConfigs }))

        } catch (error) {
            console.error('Error loading data:', error)
            setAllClientes([])
        } finally {
            setLoading(false)
        }
    }

    // Filter logic
    const filteredClientes = React.useMemo(() => {
        return allClientes.filter(cliente => {
            const matchesSearch = !debouncedSearchTerm ||
                (cliente.razsoc || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (cliente.cif || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())

            const clienteDeps = cliente.departamentos || []
            const matchesDepartment = !selectedDepartment ||
                clienteDeps.some(dep => dep.codSubDepar === selectedDepartment)

            return matchesSearch && matchesDepartment
        })
    }, [allClientes, debouncedSearchTerm, selectedDepartment])

    // Pagination logic
    const paginatedClientes = React.useMemo(() => {
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        return filteredClientes.slice(startIndex, endIndex)
    }, [filteredClientes, page, limit])


    const getClientConfig = (clientId: string, codSubDepar: string): DepartmentConfig => {
        return avisosConfig[`${clientId}-${codSubDepar}`] || {
            unified: false,
            vence_hoy: { enabled: false, periodicityId: 1, value: '' },
            proximo_vencimiento: { enabled: false, periodicityId: 1, value: '', days_before: 1 },
            vencido: { enabled: false, periodicityId: 1, value: '' }
        }
    }

    const handleConfigChange = (
        clientId: string,
        codSubDepar: string,
        avisoType: 'vence_hoy' | 'proximo_vencimiento' | 'vencido',
        field: string,
        value: any
    ) => {
        const key = `${clientId}-${codSubDepar}`
        setAvisosConfig(prev => {
            const currentDepConfig = prev[key] || getClientConfig(clientId, codSubDepar)
            const currentAvisoConfig = currentDepConfig[avisoType]

            return {
                ...prev,
                [key]: {
                    ...currentDepConfig,
                    [avisoType]: {
                        ...currentAvisoConfig,
                        [field]: field === 'periodicityId' ? Number(value) : value
                    }
                }
            }
        })
    }

    const handleUnifiedChange = (
        clientId: string,
        codSubDepar: string,
        field: 'enabled' | 'periodicityId' | 'value' | 'days_before',
        value: any
    ) => {
        const key = `${clientId}-${codSubDepar}`
        setAvisosConfig(prev => {
            const currentDepConfig = prev[key] || getClientConfig(clientId, codSubDepar)

            const newVal = field === 'periodicityId' || field === 'days_before' ? Number(value) : value

            const updatedConfig = { ...currentDepConfig }

            if (field === 'enabled') {
                updatedConfig.unified = newVal === true

                if (newVal === true) {
                    updatedConfig.vence_hoy.enabled = true
                    updatedConfig.proximo_vencimiento.enabled = true
                    updatedConfig.vencido.enabled = true

                    const base = updatedConfig.vence_hoy
                    updatedConfig.proximo_vencimiento.periodicityId = base.periodicityId
                    updatedConfig.proximo_vencimiento.value = base.value
                    updatedConfig.vencido.periodicityId = base.periodicityId
                    updatedConfig.vencido.value = base.value
                }

                return { ...prev, [key]: updatedConfig }
            }

            if (field !== 'days_before') {
                updatedConfig.vence_hoy = { ...updatedConfig.vence_hoy, [field]: newVal }
                updatedConfig.proximo_vencimiento = { ...updatedConfig.proximo_vencimiento, [field]: newVal }
                updatedConfig.vencido = { ...updatedConfig.vencido, [field]: newVal }
            }

            if (field === 'days_before') {
                updatedConfig.proximo_vencimiento = { ...updatedConfig.proximo_vencimiento, days_before: newVal }
            }

            return {
                ...prev,
                [key]: updatedConfig
            }
        })
    }

    const handleSaveConfig = async (clientId: string, codSubDepar: string) => {
        const key = `${clientId}-${codSubDepar}`
        const config = getClientConfig(clientId, codSubDepar)

        // Validation
        const errors: string[] = []
        const validateBlock = (name: string, block: AvisoConfig, isProximoVencimiento: boolean = false) => {
            if (!block.enabled) return

            if (!block.value || block.value.toString().trim() === '') {
                errors.push(`El valor de tiempo/hora en "${name}" es obligatorio.`)
            }
            if (isProximoVencimiento && (!(block as ProximoVencimientoConfig).days_before || (block as ProximoVencimientoConfig).days_before <= 0)) {
                errors.push(`Los días de antelación en "${name}" son obligatorios.`)
            }
        }

        validateBlock('Vence Hoy', config.vence_hoy)
        validateBlock('Próximo Vencimiento', config.proximo_vencimiento, true)
        validateBlock('Vencido', config.vencido)

        if (errors.length > 0) {
            setToast({ show: true, message: errors.join('\n'), type: 'error' })
            return
        }

        const existingId = config.id

        const formatValues = (conf: AvisoConfig) => {
            if (!conf.enabled) {
                return {
                    periodicity: null,
                    tiempo: null,
                    hora: null
                }
            }
            const isDays = Number(conf.periodicityId) === 1
            const val = conf.value
            return {
                periodicity: Number(conf.periodicityId),
                tiempo: !isDays && val ? Number(val) : null,
                hora: isDays && val ? String(val) : null
            }
        }

        const vh = formatValues(config.vence_hoy)
        const pv = formatValues(config.proximo_vencimiento)
        const venc = formatValues(config.vencido)

        const glob = config.unified ? vh : { periodicity: null, tiempo: null, hora: null }

        const payload: ConfigAvisosPayload = {
            cliente_id: clientId,
            codSubDepar: codSubDepar || '',

            // Vence Hoy
            aviso_vence_hoy: config.vence_hoy.enabled ? true : 0,
            temporicidad_vence_hoy: vh.periodicity,
            tiempo_vence_hoy: vh.tiempo,
            hora_vence_hoy: vh.hora,

            // Próximo Vencimiento
            aviso_proximo_vencimiento: config.proximo_vencimiento.enabled ? true : 0,
            temporicidad_proximo_vencimiento: pv.periodicity,
            tiempo_proximo_vencimiento: pv.tiempo,
            hora_proximo_vencimiento: pv.hora,
            dias_proximo_vencimiento: config.proximo_vencimiento.enabled ? config.proximo_vencimiento.days_before : null,

            // Vencido
            aviso_vencido: config.vencido.enabled ? true : 0,
            temporicidad_vencido: venc.periodicity,
            tiempo_vencido: venc.tiempo,
            hora_vencido: venc.hora,

            // Global
            config_global: config.unified,
            temporicidad_global: glob.periodicity,
            tiempo_global: glob.tiempo,
            hora_global: glob.hora
        }

        setSavingDepartments(prev => new Set(prev).add(key))
        try {
            console.log('Sending config payload:', payload)

            if (existingId) {
                // Update existing
                await updateConfigAvisos(existingId, payload)
                setToast({ show: true, message: 'Configuración actualizada correctamente.', type: 'success' })
            } else {
                // Create new
                const result = await createConfigAvisos(payload)
                const newId = result?.id || result

                // Store the new ID in state for future updates
                setAvisosConfig(prev => ({
                    ...prev,
                    [key]: {
                        ...config,
                        id: newId
                    }
                }))
                setToast({ show: true, message: 'Configuración creada y guardada correctamente.', type: 'success' })
            }
        } catch (error) {
            console.error('Error saving config:', error)
            setToast({ show: true, message: 'Error al guardar la configuración.', type: 'error' })
        } finally {
            setSavingDepartments(prev => {
                const updated = new Set(prev)
                updated.delete(key)
                return updated
            })
        }
    }

    const renderAvisoBlock = (
        title: string,
        type: 'vence_hoy' | 'proximo_vencimiento' | 'vencido',
        config: any,
        clientId: string,
        codSubDepar: string,
        disabled: boolean
    ) => {
        return (
            <div className={`d-flex flex-column gap-2 p-3 border rounded bg-white h-100 ${disabled ? 'bg-light opacity-50' : ''}`}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold fs-7 text-gray-800">{title}</span>
                    <div className="form-check form-check-custom form-check-solid form-check-sm">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={config.enabled}
                            disabled={disabled}
                            onChange={(e) => handleConfigChange(clientId, codSubDepar, type, 'enabled', e.target.checked)}
                        />
                    </div>
                </div>

                {config.enabled && (
                    <>
                        {type === 'proximo_vencimiento' && (
                            <div className="d-flex align-items-center mb-2">
                                <label className="form-label fs-8 text-muted me-2 mb-0">Días Antelación:</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm form-control-solid w-70px"
                                    value={config.days_before}
                                    disabled={disabled}
                                    onChange={(e) => handleConfigChange(clientId, codSubDepar, type, 'days_before', Number(e.target.value))}
                                    min="1"
                                />
                            </div>
                        )}

                        <div className="d-flex gap-2">
                            <select
                                className="form-select form-select-sm form-select-solid w-50"
                                value={config.periodicityId}
                                disabled={disabled}
                                onChange={(e) => handleConfigChange(clientId, codSubDepar, type, 'periodicityId', e.target.value)}
                            >
                                <option value="1">Días</option>
                                <option value="2">Horas</option>
                                <option value="3">Minutos</option>
                            </select>

                            <div className="w-50" style={{ height: '35px' }}>
                                {Number(config.periodicityId) === 1 ? (
                                    <input
                                        type="time"
                                        className="form-control form-control-sm form-control-solid"
                                        value={config.value}
                                        disabled={disabled}
                                        onChange={(e) => handleConfigChange(clientId, codSubDepar, type, 'value', e.target.value)}
                                    />
                                ) : (
                                    <div className="input-group input-group-sm input-group-solid h-100">
                                        <input
                                            type="number"
                                            className="form-control form-control-sm form-control-solid"
                                            value={config.value}
                                            disabled={disabled}
                                            onChange={(e) => handleConfigChange(clientId, codSubDepar, type, 'value', e.target.value)}
                                            min="0"
                                        />
                                        <span className="input-group-text px-1 text-muted" style={{ fontSize: '10px' }}>
                                            {Number(config.periodicityId) === 2 ? 'Hrs' : 'Min'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                {!config.enabled && <div className="text-muted fs-8 fst-italic mt-1">Desactivado</div>}
            </div>
        )
    }

    const renderUnifiedBlock = (
        config: DepartmentConfig,
        clientId: string,
        codSubDepar: string
    ) => {
        const unifiedActive = config.unified
        const sharedPeriod = config.vence_hoy.periodicityId
        const sharedValue = config.vence_hoy.value
        const sharedDays = config.proximo_vencimiento.days_before

        return (
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#f1faff', border: '1px solid #0095e8' }}>
                <div className="d-flex align-items-center mb-3">
                    <div className="form-check form-check-custom form-check-solid form-check-sm me-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={unifiedActive}
                            onChange={(e) => handleUnifiedChange(clientId, codSubDepar, 'enabled', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-gray-800">Activar Todos los Avisos</label>
                    </div>
                </div>

                <div className="d-flex flex-wrap gap-4 align-items-end" style={{ opacity: unifiedActive ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                    <div>
                        <label className="form-label fs-8 text-muted mb-1">Días Antelación (Próximo Vencimiento):</label>
                        <div style={{ height: '35px' }}>
                            <input
                                type="number"
                                className="form-control form-control-sm form-control-solid w-100px h-100"
                                value={sharedDays}
                                onChange={(e) => handleUnifiedChange(clientId, codSubDepar, 'days_before', e.target.value)}
                                min="1"
                                disabled={!unifiedActive}
                            />
                        </div>
                    </div>
                    <div className="w-150px">
                        <label className="form-label fs-8 text-muted mb-1">Periodicidad:</label>
                        <div style={{ height: '35px' }}>
                            <select
                                className="form-select form-select-sm form-select-solid h-100"
                                value={sharedPeriod}
                                onChange={(e) => handleUnifiedChange(clientId, codSubDepar, 'periodicityId', e.target.value)}
                                disabled={!unifiedActive}
                            >
                                <option value="1">Días</option>
                                <option value="2">Horas</option>
                                <option value="3">Minutos</option>
                            </select>
                        </div>
                    </div>
                    <div className="w-150px">
                        <label className="form-label fs-8 text-muted mb-1">Programación:</label>
                        <div style={{ height: '35px' }}>
                            {Number(sharedPeriod) === 1 ? (
                                <input
                                    type="time"
                                    className="form-control form-control-sm form-control-solid h-100"
                                    value={sharedValue}
                                    onChange={(e) => handleUnifiedChange(clientId, codSubDepar, 'value', e.target.value)}
                                    disabled={!unifiedActive}
                                />
                            ) : (
                                <div className="input-group input-group-sm input-group-solid h-100">
                                    <input
                                        type="number"
                                        className="form-control form-control-sm form-control-solid"
                                        value={sharedValue}
                                        onChange={(e) => handleUnifiedChange(clientId, codSubDepar, 'value', e.target.value)}
                                        min="0"
                                        disabled={!unifiedActive}
                                    />
                                    <span className="input-group-text px-1 text-muted" style={{ fontSize: '10px' }}>
                                        {Number(sharedPeriod) === 2 ? 'Hrs' : 'Min'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedClientValues)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setExpandedClientValues(newSet)
    }

    return (
        <div className="container-fluid" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '20px' }}>
            <div className="d-flex flex-column">
                <PageHeader
                    title="Configuración de Avisos"
                    subtitle="Gestión de notificaciones por departamento"
                    icon="bell-fill"
                    actions={
                        <div className='d-flex align-items-center gap-3'>
                            <div className='d-flex align-items-center position-relative'>
                                <i className='bi bi-search position-absolute ms-4' style={{ color: atisaStyles.colors.light, zIndex: 1 }}></i>
                                <input
                                    type='text'
                                    className='form-control ps-12'
                                    placeholder='Buscar por CIF y Cliente...'
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontFamily: atisaStyles.fonts.secondary,
                                        fontSize: '14px',
                                        width: '250px',
                                        height: '42px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}
                                />
                                {searching && (
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                                        <div className="spinner-border spinner-border-sm" role="status" style={{ color: atisaStyles.colors.primary, width: '20px', height: '20px' }}>
                                            <span className="visually-hidden">Buscando...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className='d-flex align-items-center position-relative'>
                                <i className='bi bi-funnel position-absolute ms-4' style={{ color: atisaStyles.colors.primary, zIndex: 1 }}></i>
                                <select
                                    className='form-select ps-12'
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    disabled={loadingDepartments}
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontFamily: atisaStyles.fonts.secondary,
                                        fontSize: '14px',
                                        height: '42px',
                                        width: '250px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Todos los Departamentos</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.codSubDepar || ''}>
                                            {dept.nombre} {dept.codSubDepar ? `(${dept.codSubDepar})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    }
                />

                <div className='card border-0' style={{ boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>

                    <div className='card-body p-0'>
                        <div className="table-responsive" style={{ margin: 0 }}>
                            <table className="table align-middle table-row-dashed fs-6 gy-0" style={{ fontFamily: atisaStyles.fonts.secondary, borderCollapse: 'separate', borderSpacing: '0', margin: 0, width: '100%' }}>
                                <thead>
                                    <tr className="text-start fw-bold fs-7 text-uppercase gs-0" style={{ backgroundColor: atisaStyles.colors.light, color: atisaStyles.colors.primary }}>
                                        <th className="min-w-50px" style={getTableHeaderStyles()}></th>
                                        <th className="min-w-100px" style={getTableHeaderStyles()}>ID</th>
                                        <th className="min-w-120px" style={getTableHeaderStyles()}>CIF</th>
                                        <th className="min-w-200px" style={getTableHeaderStyles()}>Cliente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={4} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : paginatedClientes.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-5 text-muted">No se encontraron clientes.</td></tr>
                                    ) : (
                                        paginatedClientes.map((cliente, index) => {
                                            const isExpanded = expandedClientValues.has(cliente.idcliente)
                                            const deps = cliente.departamentos || []
                                            return (
                                                <React.Fragment key={cliente.idcliente}>
                                                    <tr style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa', fontFamily: atisaStyles.fonts.secondary, transition: 'all 0.2s ease' }}>
                                                        <td style={getTableCellStyles()}>
                                                            <button type="button" className="btn btn-sm btn-icon btn-light btn-active-light-primary toggle h-25px w-25px" onClick={() => toggleExpand(cliente.idcliente)}>
                                                                <i className={`bi ${isExpanded ? 'bi-dash' : 'bi-plus'}`}></i>
                                                            </button>
                                                        </td>
                                                        <td style={{ ...getTableCellStyles(), color: atisaStyles.colors.primary, fontWeight: '600' }}>{cliente.idcliente}</td>
                                                        <td style={{ ...getTableCellStyles(), color: atisaStyles.colors.dark, fontWeight: '600' }}>{cliente.cif}</td>
                                                        <td style={{ ...getTableCellStyles(), color: atisaStyles.colors.dark, fontWeight: '600' }}>{cliente.razsoc}</td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={4} className="p-0">
                                                                <div className="p-5 bg-light rounded-bottom" style={{ borderLeft: `4px solid ${atisaStyles.colors.primary}` }}>
                                                                    <h5 className="mb-3 text-gray-800" style={{ fontFamily: atisaStyles.fonts.primary }}>Configuración de Departamentos</h5>
                                                                    {deps.length > 0 ? (
                                                                        <div className="table-responsive">
                                                                            <table className="table table-sm table-bordered bg-white align-middle">
                                                                                <thead className="bg-light">
                                                                                    <tr className="fw-bold text-gray-600">
                                                                                        <th className="min-w-150px">Cubos</th>
                                                                                        <th className="min-w-400px">Configuración de Avisos</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {deps.map((dep, index) => {
                                                                                        const config = getClientConfig(cliente.idcliente, dep.codSubDepar || '')
                                                                                        const isSaving = savingDepartments.has(`${cliente.idcliente}-${dep.codSubDepar}`)
                                                                                        return (
                                                                                            <tr key={dep.codSubDepar || index}>
                                                                                                <td className="fw-bold text-gray-700">{dep.codSubDepar?.substring(4)} - {dep.nombre}</td>
                                                                                                <td className="p-2">
                                                                                                    {/* Activar Todos / Unified Block */}
                                                                                                    {renderUnifiedBlock(config, cliente.idcliente, dep.codSubDepar || '')}

                                                                                                    {/* Individual Blocks */}
                                                                                                    <div className={`row g-2 ${config.unified ? 'opacity-50' : ''}`} style={config.unified ? { pointerEvents: 'none' } : {}}>
                                                                                                        <div className="col-md-4">
                                                                                                            {renderAvisoBlock('Vence Hoy', 'vence_hoy', config.vence_hoy, cliente.idcliente, dep.codSubDepar || '', config.unified)}
                                                                                                        </div>
                                                                                                        <div className="col-md-4">
                                                                                                            {renderAvisoBlock('Próximo Vencimiento', 'proximo_vencimiento', config.proximo_vencimiento, cliente.idcliente, dep.codSubDepar || '', config.unified)}
                                                                                                        </div>
                                                                                                        <div className="col-md-4">
                                                                                                            {renderAvisoBlock('Vencido', 'vencido', config.vencido, cliente.idcliente, dep.codSubDepar || '', config.unified)}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="d-flex justify-content-end mt-3">
                                                                                                        <button
                                                                                                            className="btn btn-sm btn-primary"
                                                                                                            onClick={() => handleSaveConfig(cliente.idcliente, dep.codSubDepar || '')}
                                                                                                            disabled={isSaving}
                                                                                                        >
                                                                                                            {isSaving ? (
                                                                                                                <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                                                                                                            ) : (
                                                                                                                'Guardar Configuración'
                                                                                                            )}
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        )
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-muted fst-italic">No hay departamentos asociados encontrados.</div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredClientes.length > 0 && <SharedPagination currentPage={page} totalItems={filteredClientes.length} pageSize={limit} onPageChange={setPage} />}

                        <CustomToast
                            show={toast.show}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast({ ...toast, show: false })}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ConfigAvisosPage
