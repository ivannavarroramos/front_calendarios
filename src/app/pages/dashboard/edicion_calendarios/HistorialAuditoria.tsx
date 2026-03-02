import { FC, useEffect, useState, useMemo } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { getAuditoriaCalendariosByCliente, AuditoriaCalendario, MOTIVOS_AUDITORIA } from '../../../api/auditoriaCalendarios'
import { getClienteById } from '../../../api/clientes'
import { getClienteProcesosHabilitadosByCliente } from '../../../api/clienteProcesos'
import { getClienteProcesoHitosHabilitadosByProceso } from '../../../api/clienteProcesoHitos'
import { getAllProcesos } from '../../../api/procesos'
import { getAllHitos } from '../../../api/hitos'
import { getAllSubdepartamentos, Subdepartamento } from '../../../api/subdepartamentos'
import Select from 'react-select'
import { KTCard, KTCardBody } from '../../../../_metronic/helpers'
import { atisaStyles, getSecondaryButtonStyles, getTableHeaderStyles, getTableCellStyles } from '../../../styles/atisaStyles'
import SharedPagination from '../../../components/pagination/SharedPagination'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDateDisplay, formatDateTimeDisplay } from '../../../utils/dateFormatter'

const HistorialAuditoria: FC = () => {
    const { clienteId } = useParams<{ clienteId: string }>()
    const navigate = useNavigate()

    const [auditoria, setAuditoria] = useState<AuditoriaCalendario[]>([])
    const [loading, setLoading] = useState(false)
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    const [clienteNombre, setClienteNombre] = useState<string>('')
    const [procesosCliente, setProcesosCliente] = useState<{ id: number, nombre: string }[]>([])
    const [hitosCliente, setHitosCliente] = useState<{ id: number, nombre: string }[]>([])
    const [subdepartamentos, setSubdepartamentos] = useState<Subdepartamento[]>([])

    // Filtros front-end para envío al backend
    const [showFilters, setShowFilters] = useState(false)
    const [cuboFiltro, setCuboFiltro] = useState<string[]>([])
    const [procesoFiltro, setProcesoFiltro] = useState('')
    const [hitoFiltro, setHitoFiltro] = useState('')
    const [claveFiltro, setClaveFiltro] = useState('')
    const [obligatorioFiltro, setObligatorioFiltro] = useState('')
    const [fechaAntFiltro, setFechaAntFiltro] = useState('')
    const [fechaActFiltro, setFechaActFiltro] = useState('')
    const [motivoFiltro, setMotivoFiltro] = useState('')
    const [momentoFiltro, setMomentoFiltro] = useState('')
    const [usuarioFiltro, setUsuarioFiltro] = useState('')

    // Ordenamiento
    const [sortField, setSortField] = useState<string>('fecha_modificacion')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    useEffect(() => {
        if (clienteId) {
            const hoy = new Date()
            const haceUnAno = new Date(Date.UTC(hoy.getUTCFullYear() - 1, hoy.getUTCMonth(), hoy.getUTCDate()))
            setFechaDesde(haceUnAno.toISOString().split('T')[0])
            setFechaHasta('')

            // Cargar información del cliente (nombre, procesos, hitos)
            const cargarFiltrosCliente = async () => {
                try {
                    const clienteData = await getClienteById(clienteId);
                    setClienteNombre(clienteData.razsoc || '');

                    const [{ procesos }, { hitos }, resSubdeps] = await Promise.all([
                        getAllProcesos(),
                        getAllHitos(),
                        getAllSubdepartamentos(undefined, 1000, undefined, 'asc')
                    ]);

                    setSubdepartamentos(resSubdeps.subdepartamentos || []);

                    const resCP = await getClienteProcesosHabilitadosByCliente(clienteId);
                    const cpList = resCP.clienteProcesos || resCP;

                    const procsUnique = Array.from(new Map(
                        cpList.map((cp: any) => {
                            const pMaestro = procesos.find((p: any) => p.id === cp.proceso_id);
                            return [cp.proceso_id, {
                                id: cp.proceso_id,
                                nombre: pMaestro?.nombre || `Proceso ${cp.proceso_id}`
                            }];
                        })
                    ).values()) as { id: number, nombre: string }[];

                    procsUnique.sort((a, b) => a.nombre.localeCompare(b.nombre));
                    setProcesosCliente(procsUnique);

                    const promesasHitos = cpList.map((cp: any) => getClienteProcesoHitosHabilitadosByProceso(cp.id));
                    const resHitos = await Promise.all(promesasHitos);

                    const hitosIds = new Set<number>();
                    resHitos.forEach((listaHitos: any) => {
                        listaHitos.forEach((h: any) => hitosIds.add(h.hito_id));
                    });

                    const hitosInfo = Array.from(hitosIds).map(id => {
                        const hMaestro = hitos.find((h: any) => h.id === id);
                        return {
                            id,
                            nombre: hMaestro?.nombre || `Hito ${id}`
                        };
                    });
                    hitosInfo.sort((a, b) => a.nombre.localeCompare(b.nombre));
                    setHitosCliente(hitosInfo);

                } catch (error) {
                    console.error("Error cargando info de filtros del cliente:", error);
                }
            };
            cargarFiltrosCliente();
        }
    }, [clienteId])

    useEffect(() => {
        if (clienteId && fechaDesde) {
            cargarAuditoria()
        }
    }, [clienteId, fechaDesde, fechaHasta, sortField, sortDirection])

    const cargarAuditoria = async () => {
        if (!clienteId) return
        setLoading(true)
        try {
            const data = await getAuditoriaCalendariosByCliente(
                clienteId,
                1,
                10000,
                sortField,
                sortDirection,
                fechaDesde,
                fechaHasta
            )

            setAuditoria(data.auditoria_calendarios || [])
            setCurrentPage(1)
        } catch (error) {
            console.error('Error cargando auditoría:', error)
            setAuditoria([])
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setCuboFiltro([])
        setProcesoFiltro('')
        setHitoFiltro('')
        setClaveFiltro('')
        setObligatorioFiltro('')
        setFechaAntFiltro('')
        setFechaActFiltro('')
        setMotivoFiltro('')
        setMomentoFiltro('')
        setUsuarioFiltro('')
        setCurrentPage(1)
    }

    const formatDate = (date: string) => {
        return formatDateTimeDisplay(date)
    }

    const getCuboString = (item: AuditoriaCalendario) => item.codSubDepar ? `${item.codSubDepar.substring(4)} - ${item.nombre_subdepar || '-'}` : (item.nombre_subdepar || '-')
    const getValorAnterior = (item: AuditoriaCalendario) => {
        if (item.campo_modificado === 'fecha_limite' || item.campo_modificado === 'fecha_fin') return formatDateDisplay(item.fecha_limite_anterior || item.valor_anterior)
        const val = item.valor_anterior || '-'
        if (item.campo_modificado === 'hora_limite' && val !== '-' && val.length >= 5) return val.substring(0, 5)
        return val
    }
    const getValorActual = (item: AuditoriaCalendario) => {
        if (item.campo_modificado === 'fecha_limite' || item.campo_modificado === 'fecha_fin') return formatDateDisplay(item.fecha_limite_actual || item.valor_nuevo)
        const val = item.valor_nuevo || '-'
        if (item.campo_modificado === 'hora_limite' && val !== '-' && val.length >= 5) return val.substring(0, 5)
        return val
    }

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
        setCurrentPage(1)
    }

    const getSortIcon = (field: string) => {
        if (sortField !== field) {
            return (
                <span className='ms-1'>
                    <i
                        className='bi bi-arrow-down-up'
                        style={{
                            fontSize: '12px',
                            color: atisaStyles.colors.primary,
                            opacity: 0.6
                        }}
                    ></i>
                </span>
            )
        }
        return (
            <span className='ms-1'>
                <i
                    className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`}
                    style={{
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                ></i>
            </span>
        )
    }

    // Calcula si hay filtros activos para mostrar el count
    const activeFiltersCount = [cuboFiltro.length > 0 ? '1' : '', procesoFiltro, hitoFiltro, claveFiltro, obligatorioFiltro, fechaAntFiltro, fechaActFiltro, motivoFiltro, momentoFiltro, usuarioFiltro].filter(v => v !== '').length

    const usuariosUnicos = useMemo(() => {
        const users = new Set<string>();
        auditoria.forEach(item => {
            const name = item.nombre_usuario || item.usuario;
            if (name) users.add(name);
        });
        return Array.from(users).sort();
    }, [auditoria]);

    const momentosUnicos = useMemo(() => {
        const moments = new Set<string>();
        auditoria.forEach(item => {
            if (item.momento_cambio) moments.add(item.momento_cambio);
        });
        return Array.from(moments).sort();
    }, [auditoria]);

    const motivosUnicos = useMemo(() => {
        const motivos = new Set<string>();
        auditoria.forEach(item => {
            if (item.motivo_descripcion) motivos.add(item.motivo_descripcion);
        });
        return Array.from(motivos).sort();
    }, [auditoria]);

    // Filtrado y Ordenación local
    const auditoriaProcesada = useMemo(() => {
        const filtered = auditoria.filter(item => {
            const matchesCubo = cuboFiltro.length === 0 || (item.codSubDepar && cuboFiltro.includes(item.codSubDepar));
            const matchesProceso = !procesoFiltro || item.proceso_nombre === procesoFiltro;
            const matchesHito = !hitoFiltro || item.hito_nombre === hitoFiltro;
            const matchesClave = !claveFiltro || (claveFiltro === 'true' ? Boolean(item.critico) : !Boolean(item.critico));
            const matchesObligatorio = !obligatorioFiltro || (obligatorioFiltro === 'true' ? Boolean(item.obligatorio) : !Boolean(item.obligatorio));
            const matchesFechaAnt = !fechaAntFiltro || (item.fecha_limite_anterior && item.fecha_limite_anterior.includes(fechaAntFiltro));
            const matchesFechaAct = !fechaActFiltro || (item.fecha_limite_actual && item.fecha_limite_actual.includes(fechaActFiltro));
            const matchesMotivo = !motivoFiltro || (item.motivo_descripcion && item.motivo_descripcion === motivoFiltro);
            const matchesMomento = !momentoFiltro || (item.momento_cambio === momentoFiltro);
            const matchesUsuario = !usuarioFiltro || (item.nombre_usuario === usuarioFiltro || item.usuario === usuarioFiltro);

            return matchesCubo && matchesProceso && matchesHito && matchesClave && matchesObligatorio && matchesFechaAnt && matchesFechaAct && matchesMotivo && matchesMomento && matchesUsuario;
        });

        // Aplicar ordenación
        return [...filtered].sort((a, b) => {
            let aValue: any = a[sortField as keyof typeof a];
            let bValue: any = b[sortField as keyof typeof b];

            // Manejo especial para fechas si es necesario
            if (sortField === 'fecha_modificacion' || sortField === 'fecha_limite_actual' || sortField === 'fecha_limite_anterior') {
                aValue = aValue ? new Date(aValue).getTime() : 0;
                bValue = bValue ? new Date(bValue).getTime() : 0;
            }

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [auditoria, cuboFiltro, procesoFiltro, hitoFiltro, claveFiltro, obligatorioFiltro, fechaAntFiltro, fechaActFiltro, motivoFiltro, momentoFiltro, usuarioFiltro, sortField, sortDirection]);

    // Paginación local
    const paginatedAuditoria = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return auditoriaProcesada.slice(startIndex, startIndex + itemsPerPage);
    }, [auditoriaProcesada, currentPage, itemsPerPage]);

    const totalPagesLocal = Math.ceil(auditoriaProcesada.length / itemsPerPage);

    return (
        <div
            className="calendario-cliente-container"
            style={{
                fontFamily: atisaStyles.fonts.secondary,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                backgroundColor: '#f5f8fa',
                overflow: 'hidden',
                margin: 0,
                width: '100%'
            }}
        >
            <header
                className="calendario-header"
                style={{
                    background: 'linear-gradient(135deg, #00505c 0%, #007b8a 100%)',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(0, 80, 92, 0.15)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    width: '100%'
                }}
            >
                <div
                    className="header-title-section"
                    style={{
                        padding: '32px 24px'
                    }}
                >
                    <div
                        className="header-content"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center',
                            gap: '1rem',
                            maxWidth: '100%',
                            margin: '0 auto'
                        }}
                    >
                        {/* Columna izquierda: Botón Volver */}
                        <div className='d-flex align-items-center gap-3' style={{ justifyContent: 'flex-start' }}>
                            <button
                                className="back-button"
                                onClick={() => navigate(`/edicion-calendario/${clienteId}`)}
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
                                <i className="bi bi-arrow-left me-2" style={{ color: 'inherit' }}></i>
                                Volver a Edición
                            </button>
                        </div>

                        {/* Columna centro: Título y Cliente */}
                        <div
                            className="title-section"
                            style={{
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <h1
                                style={{
                                    fontFamily: atisaStyles.fonts.primary,
                                    fontWeight: 'bold',
                                    color: 'white',
                                    margin: 0,
                                    fontSize: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="bi bi-clock-history" style={{ color: 'white' }}></i>
                                Historial de Auditoría
                            </h1>
                            <p
                                style={{
                                    fontFamily: atisaStyles.fonts.secondary,
                                    color: atisaStyles.colors.light,
                                    margin: '8px 0 0 0',
                                    fontSize: '1.2rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%'
                                }}
                            >
                                {clienteNombre || clienteId}
                            </p>
                        </div>

                        {/* Columna derecha: Acciones */}
                        <div
                            className="header-actions"
                            style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                justifyContent: 'flex-end'
                            }}
                        >
                            {activeFiltersCount > 0 && (
                                <span style={{
                                    backgroundColor: '#f1416c',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '2px 10px',
                                    fontSize: '12px',
                                    fontWeight: '700'
                                }}>
                                    {activeFiltersCount}
                                </span>
                            )}
                            <button
                                className="btn btn-sm"
                                onClick={() => setShowFilters(!showFilters)}
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
                                <i className="bi bi-funnel" style={{ color: 'white' }}></i>
                                Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div
                className="main-layout"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '0rem',
                    width: '100%',
                    overflow: 'auto'
                }}
            >
                <main
                    className="content-area"
                    style={{
                        width: '100%',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '0',
                        boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                        minHeight: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >




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
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="bi bi-funnel-fill" style={{ color: 'white', fontSize: '18px' }}></i>
                                <span style={{ color: 'white', fontFamily: atisaStyles.fonts.primary, fontWeight: '700', fontSize: '1.2rem' }}>Filtros</span>
                            </div>
                            <button
                                onClick={() => setShowFilters(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>

                        {/* Contenido del drawer */}
                        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Búsqueda General - Eliminada a petición */}

                            {/* Fechas de actualización */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Creación Desde</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Creación Hasta</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                                    />
                                </div>
                            </div>

                            {/* Línea / Cubo */}
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Cubo / Línea</label>
                                <Select
                                    isMulti
                                    options={subdepartamentos.map((subdep) => ({
                                        value: subdep.codSubDepar || '',
                                        label: `${subdep.codSubDepar?.substring(4)} - ${subdep.nombre}`
                                    }))}
                                    value={subdepartamentos
                                        .filter((subdep) => cuboFiltro.includes(subdep.codSubDepar || ''))
                                        .map((subdep) => ({
                                            value: subdep.codSubDepar || '',
                                            label: `${subdep.codSubDepar?.substring(4)} - ${subdep.nombre}`
                                        }))}
                                    onChange={(newValue) => {
                                        setCuboFiltro(newValue.map((option) => option.value))
                                    }}
                                    placeholder="Seleccionar cubo..."
                                    noOptionsMessage={() => "No hay opciones"}
                                    menuPortalTarget={document.body}
                                    styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                            borderColor: 'rgba(255, 255, 255, 0.25)',
                                            color: 'white',
                                            minHeight: '36px',
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
                                        placeholder: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }),
                                        input: (base) => ({ ...base, color: 'white' }),
                                        singleValue: (base) => ({ ...base, color: 'white' }),
                                        indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(255, 255, 255, 0.3)' }),
                                        dropdownIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', ':hover': { color: 'white' } }),
                                        clearIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', ':hover': { color: 'white' } })
                                    }}
                                />
                            </div>

                            {/* Proceso */}
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Proceso</label>
                                <Select
                                    options={procesosCliente.map(p => ({ value: p.nombre, label: p.nombre }))}
                                    value={procesoFiltro ? { value: procesoFiltro, label: procesoFiltro } : null}
                                    onChange={(opt: any) => setProcesoFiltro(opt ? opt.value : '')}
                                    isClearable
                                    placeholder="Seleccionar proceso..."
                                    menuPortalTarget={document.body}
                                    styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                            borderColor: 'rgba(255, 255, 255, 0.25)',
                                            color: 'white',
                                            minHeight: '36px',
                                            borderRadius: '8px'
                                        }),
                                        menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                            color: atisaStyles.colors.dark,
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }),
                                        placeholder: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }),
                                        input: (base) => ({ ...base, color: 'white' }),
                                        singleValue: (base) => ({ ...base, color: 'white' }),
                                        indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(255, 255, 255, 0.3)' }),
                                        dropdownIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)' }),
                                        clearIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)' })
                                    }}
                                />
                            </div>

                            {/* Hito */}
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Hito</label>
                                <Select
                                    options={hitosCliente.map(h => ({ value: h.nombre, label: h.nombre }))}
                                    value={hitoFiltro ? { value: hitoFiltro, label: hitoFiltro } : null}
                                    onChange={(opt: any) => setHitoFiltro(opt ? opt.value : '')}
                                    isClearable
                                    placeholder="Seleccionar hito..."
                                    menuPortalTarget={document.body}
                                    styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                            borderColor: 'rgba(255, 255, 255, 0.25)',
                                            color: 'white',
                                            minHeight: '36px',
                                            borderRadius: '8px'
                                        }),
                                        menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                            color: atisaStyles.colors.dark,
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }),
                                        placeholder: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }),
                                        input: (base) => ({ ...base, color: 'white' }),
                                        singleValue: (base) => ({ ...base, color: 'white' }),
                                        indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(255, 255, 255, 0.3)' }),
                                        dropdownIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)' }),
                                        clearIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)' })
                                    }}
                                />
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

                            {/* Fechas Límite Ant/Act */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Lím. Anterior</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="DD/MM/YYYY"
                                        value={fechaAntFiltro}
                                        onChange={(e) => setFechaAntFiltro(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && cargarAuditoria()}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Fecha Lím. Actual</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="DD/MM/YYYY"
                                        value={fechaActFiltro}
                                        onChange={(e) => setFechaActFiltro(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && cargarAuditoria()}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px' }}
                                    />
                                </div>
                            </div>

                            {/* Motivo y Usuario */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Motivo</label>
                                    <Select
                                        options={motivosUnicos.map(m => ({ value: m, label: m }))}
                                        value={motivoFiltro ? { value: motivoFiltro, label: motivoFiltro } : null}
                                        onChange={(opt: any) => setMotivoFiltro(opt ? opt.value : '')}
                                        isClearable
                                        placeholder="Seleccionar..."
                                        menuPortalTarget={document.body}
                                        styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                            control: (base) => ({
                                                ...base,
                                                backgroundColor: 'rgba(255,255,255,0.12)',
                                                borderColor: 'rgba(255,255,255,0.25)',
                                                color: 'white',
                                                borderRadius: '8px',
                                                minHeight: '34px',
                                                height: '34px'
                                            }),
                                            valueContainer: (base) => ({ ...base, height: '34px', padding: '0 8px' }),
                                            indicatorsContainer: (base) => ({ ...base, height: '34px' }),
                                            menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                                color: atisaStyles.colors.dark,
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }),
                                            placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }),
                                            singleValue: (base) => ({ ...base, color: 'white', fontSize: '13px' }),
                                            input: (base) => ({ ...base, color: 'white' }),
                                            clearIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', ':hover': { color: 'white' } })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Usuario</label>
                                    <Select
                                        options={usuariosUnicos.map(u => ({ value: u, label: u }))}
                                        value={usuarioFiltro ? { value: usuarioFiltro, label: usuarioFiltro } : null}
                                        onChange={(opt: any) => setUsuarioFiltro(opt ? opt.value : '')}
                                        isClearable
                                        placeholder="Seleccionar..."
                                        menuPortalTarget={document.body}
                                        styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                            control: (base) => ({
                                                ...base,
                                                backgroundColor: 'rgba(255,255,255,0.12)',
                                                borderColor: 'rgba(255,255,255,0.25)',
                                                color: 'white',
                                                borderRadius: '8px',
                                                minHeight: '34px',
                                                height: '34px'
                                            }),
                                            valueContainer: (base) => ({ ...base, height: '34px', padding: '0 8px' }),
                                            indicatorsContainer: (base) => ({ ...base, height: '34px' }),
                                            menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                                color: atisaStyles.colors.dark,
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }),
                                            placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }),
                                            singleValue: (base) => ({ ...base, color: 'white', fontSize: '13px' }),
                                            input: (base) => ({ ...base, color: 'white' }),
                                            clearIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', ':hover': { color: 'white' } })
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Momento del Cambio */}
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>Momento del Cambio</label>
                                <Select
                                    options={momentosUnicos.map(m => ({ value: m, label: m }))}
                                    value={momentoFiltro ? { value: momentoFiltro, label: momentoFiltro } : null}
                                    onChange={(opt: any) => setMomentoFiltro(opt ? opt.value : '')}
                                    isClearable
                                    placeholder="Seleccionar..."
                                    menuPortalTarget={document.body}
                                    styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: 'rgba(255,255,255,0.12)',
                                            borderColor: 'rgba(255,255,255,0.25)',
                                            color: 'white',
                                            borderRadius: '8px',
                                            minHeight: '34px',
                                            height: '34px'
                                        }),
                                        valueContainer: (base) => ({ ...base, height: '34px', padding: '0 8px' }),
                                        indicatorsContainer: (base) => ({ ...base, height: '34px' }),
                                        menu: (base) => ({ ...base, backgroundColor: 'white', zIndex: 9999 }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? atisaStyles.colors.light : 'white',
                                            color: atisaStyles.colors.dark,
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }),
                                        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }),
                                        singleValue: (base) => ({ ...base, color: 'white', fontSize: '13px' }),
                                        input: (base) => ({ ...base, color: 'white' }),
                                        clearIndicator: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.7)', ':hover': { color: 'white' } })
                                    }}
                                />
                            </div>

                        </div>

                        {/* Footer del drawer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255,255,255,0.15)',
                            display: 'flex',
                            gap: '10px',
                            flexShrink: 0
                        }}>
                            <button
                                className="btn btn-sm flex-grow-1"
                                onClick={clearFilters}
                                style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)', fontWeight: '600' }}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i> Limpiar filtros
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className='d-flex justify-content-center py-5'>
                            <div
                                className='spinner-border'
                                role='status'
                                style={{
                                    color: atisaStyles.colors.primary,
                                    width: '3rem',
                                    height: '3rem'
                                }}
                            >
                                <span className='visually-hidden'>Cargando...</span>
                            </div>
                        </div>
                    ) : auditoriaProcesada.length === 0 ? (
                        <div
                            className='text-center py-5'
                            style={{
                                backgroundColor: atisaStyles.colors.light,
                                borderRadius: '0',
                                border: `2px dashed ${atisaStyles.colors.primary}`,
                                padding: '40px 20px',
                                margin: '16px',
                            }}
                        >
                            <i
                                className='bi bi-info-circle'
                                style={{
                                    fontSize: '48px',
                                    color: atisaStyles.colors.primary,
                                    marginBottom: '16px'
                                }}
                            ></i>
                            <h4
                                style={{
                                    fontFamily: atisaStyles.fonts.primary,
                                    color: atisaStyles.colors.primary,
                                    marginBottom: '8px'
                                }}
                            >
                                No hay registros de auditoría
                            </h4>
                            <p
                                style={{
                                    fontFamily: atisaStyles.fonts.secondary,
                                    color: atisaStyles.colors.dark,
                                    margin: 0
                                }}
                            >
                                No se encontraron cambios registrados en el período y filtros seleccionados.
                            </p>
                        </div>
                    ) : (
                        <div className='table-responsive' style={{ margin: 0 }}>
                            <table
                                className='table align-middle table-row-dashed fs-6 gy-0'
                                style={{
                                    fontFamily: atisaStyles.fonts.secondary,
                                    borderCollapse: 'separate',
                                    borderSpacing: '0',
                                    margin: 0,
                                    width: '100%'
                                }}
                            >
                                <thead>
                                    <tr
                                        className='text-start fw-bold fs-7 text-uppercase gs-0'
                                        style={{
                                            backgroundColor: atisaStyles.colors.light,
                                            color: atisaStyles.colors.primary
                                        }}
                                    >
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('cubo')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Cubo {getSortIcon('cubo')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('nombre_subdepar')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Línea {getSortIcon('nombre_subdepar')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('proceso')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Proceso {getSortIcon('proceso')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('hito')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Hito {getSortIcon('hito')}</th>

                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('fecha_limite_anterior')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>F/H Anterior {getSortIcon('fecha_limite_anterior')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('fecha_limite_actual')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>F/H Actual {getSortIcon('fecha_limite_actual')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('motivo')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Motivo {getSortIcon('motivo')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('momento_cambio')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Momento {getSortIcon('momento_cambio')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('fecha_modificacion')} style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>Actualización {getSortIcon('fecha_modificacion')}</th>
                                        <th className='cursor-pointer user-select-none' onClick={() => handleSort('usuario')} style={{ ...getTableHeaderStyles(), textAlign: 'center', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.accent; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = atisaStyles.colors.light; e.currentTarget.style.color = atisaStyles.colors.primary }}>User {getSortIcon('usuario')}</th>
                                        <th style={{ ...getTableHeaderStyles(), textAlign: 'center', width: '60px' }}>Obs.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedAuditoria.map((item: AuditoriaCalendario, index: number) => (
                                        <tr
                                            key={item.id}
                                            style={{
                                                backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                                                fontFamily: atisaStyles.fonts.secondary,
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                                                e.currentTarget.style.transform = 'translateY(-1px)'
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                                                e.currentTarget.style.transform = 'translateY(0)'
                                                e.currentTarget.style.boxShadow = 'none'
                                            }}
                                        >
                                            <td style={{ ...getTableCellStyles(), fontWeight: '600' }}>{item.codSubDepar ? item.codSubDepar.substring(4) : '-'}</td>
                                            <td style={{ ...getTableCellStyles(), fontWeight: '500' }}>{item.nombre_subdepar || '-'}</td>
                                            <td style={getTableCellStyles()}>
                                                <div style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }} title={item.proceso_nombre}>
                                                    {item.proceso_nombre}
                                                </div>
                                            </td>
                                            <td style={getTableCellStyles()}>
                                                <div className='d-flex align-items-center gap-2' style={{ position: 'relative', paddingLeft: (Boolean(item.critico) || Boolean(item.obligatorio)) ? '10px' : '0' }}>
                                                    {Boolean(item.critico) && (
                                                        <div style={{ position: 'absolute', left: '-12px', top: '-10px', bottom: '-10px', width: '5px', backgroundColor: atisaStyles.colors.error, borderRadius: '0 3px 3px 0' }} />
                                                    )}
                                                    {!Boolean(item.critico) && Boolean(item.obligatorio) && (
                                                        <div style={{ position: 'absolute', left: '-12px', top: '-10px', bottom: '-10px', width: '5px', backgroundColor: atisaStyles.colors.accent, borderRadius: '0 3px 3px 0' }} />
                                                    )}
                                                    <span style={{ fontWeight: Boolean(item.critico) ? '700' : '500', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.hito_nombre}>
                                                        {item.hito_nombre}
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
                                            <td style={getTableCellStyles()}>
                                                <code style={{ backgroundColor: '#f8f9fa', padding: '3px 6px', borderRadius: '4px', color: '#6c757d', border: '1px solid #dee2e6', whiteSpace: 'nowrap' }}>
                                                    {getValorAnterior(item)}
                                                </code>
                                            </td>
                                            <td style={getTableCellStyles()}>
                                                <code style={{ backgroundColor: '#e8f5e9', padding: '3px 6px', borderRadius: '4px', color: '#105021', border: '1px solid #c8e6c9', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                                                    {getValorActual(item)}
                                                </code>
                                            </td>
                                            <td style={getTableCellStyles()}>
                                                <span style={{
                                                    backgroundColor: 'rgba(0,161,222,0.1)',
                                                    color: atisaStyles.colors.primary,
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    border: `1px solid rgba(0,161,222,0.3)`,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {item.motivo_descripcion || 'Configuración'}
                                                </span>
                                            </td>
                                            <td style={getTableCellStyles()}>
                                                {item.momento_cambio ? (
                                                    <span style={{
                                                        backgroundColor: item.momento_cambio.includes('antes') ? 'rgba(0, 190, 100, 0.1)' : (item.momento_cambio.includes('después') ? 'rgba(220, 50, 50, 0.1)' : '#f8f9fa'),
                                                        color: item.momento_cambio.includes('antes') ? '#00A144' : (item.momento_cambio.includes('después') ? '#dc3545' : '#6c757d'),
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        textTransform: 'capitalize',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {item.momento_cambio}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td style={getTableCellStyles()}>
                                                {formatDate(item.fecha_modificacion)}
                                            </td>
                                            <td style={{ ...getTableCellStyles(), textAlign: 'center' }}>
                                                <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-user-${item.id}`} style={{ zIndex: 9999 }}>{(item.nombre_usuario || item.usuario)?.trim() || '-'}</Tooltip>}>
                                                    <button type="button" className="btn btn-icon btn-sm" style={{ background: 'transparent', border: 'none', padding: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                        <i className="bi bi-person-badge-fill" style={{ color: atisaStyles.colors.primary, fontSize: '20px' }}></i>
                                                    </button>
                                                </OverlayTrigger>
                                            </td>
                                            <td style={{ ...getTableCellStyles(), textAlign: 'center' }}>
                                                {item.observaciones ? (
                                                    <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-obs-${item.id}`} style={{ maxWidth: '300px', zIndex: 9999 }}>{item.observaciones}</Tooltip>}>
                                                        <button type="button" className="btn btn-icon btn-sm" style={{ background: 'transparent', border: 'none', padding: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                            <i className="bi bi-chat-square-text-fill" style={{ color: '#dc3545', fontSize: '20px' }}></i>
                                                        </button>
                                                    </OverlayTrigger>
                                                ) : (
                                                    <i className="bi bi-chat-square" style={{ color: '#dee2e6', fontSize: '20px' }}></i>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Controles de paginación de backend */}
                    {auditoriaProcesada.length > 0 && (
                        <div className="p-4 pt-0">
                            <SharedPagination
                                currentPage={currentPage}
                                totalItems={auditoriaProcesada.length}
                                pageSize={itemsPerPage}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

export default HistorialAuditoria
