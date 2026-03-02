import { FC, useState, useEffect, useMemo } from 'react'
import { Modal } from 'react-bootstrap'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Hito } from '../../../api/hitos'
import { getClientesPorHito, Cliente } from '../../../api/clientes'
import { updateMasivoHitos } from '../../../api/clienteProcesoHitos'
import { atisaStyles, getTableHeaderStyles, getTableCellStyles } from '../../../styles/atisaStyles'
import SharedPagination from '../../../components/pagination/SharedPagination'
import { useAuth } from '../../../modules/auth'
import { MOTIVOS_AUDITORIA, MotivoAuditoria } from '../../../api/auditoriaCalendarios'

type Props = {
    show: boolean
    onHide: () => void
    hito: Hito | null
    onSuccess: (message: string) => void
    onError: (message: string) => void
}

const ActualizaMasivaHitosModal: FC<Props> = ({ show, onHide, hito, onSuccess, onError }) => {
    const [loading, setLoading] = useState(false)
    const [loadingClientes, setLoadingClientes] = useState(false)
    const [allClientes, setAllClientes] = useState<Cliente[]>([])
    const [selectedClientes, setSelectedClientes] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)

    const { currentUser, auth } = useAuth()

    // Ordenación
    const [sortField, setSortField] = useState<string>('razsoc')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Formulario
    const formik = useFormik({
        initialValues: {
            fecha_desde: '',
            fecha_hasta: '',
            nueva_fecha: '',
            nueva_hora: '',
            observaciones: '',
            motivo: 0,
        },
        validationSchema: Yup.object({
            fecha_desde: Yup.string().required('La fecha de corte desde es obligatoria'),
            fecha_hasta: Yup.string(),
            nueva_fecha: Yup.string().required('La nueva fecha límite es obligatoria'),
            nueva_hora: Yup.string(),
            observaciones: Yup.string(),
            motivo: Yup.number().required('El motivo es obligatorio').min(1, 'El motivo es obligatorio').max(4),
        }),
        onSubmit: async (values) => {
            if (!hito) return
            if (selectedClientes.length === 0) {
                onError('Debes seleccionar al menos una empresa')
                return
            }

            setLoading(true)

            let codSubDepar: string | undefined = undefined;
            let currentUsername = currentUser?.username || 'Desconocido';
            if (auth?.api_token) {
                try {
                    const decodedToken = JSON.parse(atob(auth.api_token.split('.')[1]));
                    codSubDepar = decodedToken.codSubDepar;
                    if (decodedToken.numeross) currentUsername = decodedToken.numeross;
                    else if (decodedToken.username) currentUsername = decodedToken.username;
                    else if (decodedToken.sub) currentUsername = decodedToken.sub;
                } catch (error) {
                    console.warn('Error decodificando token JWT para codSubDepar en actualización masiva:', error);
                }
            }

            try {
                const payload: any = {
                    hito_id: hito.id,
                    empresa_ids: selectedClientes,
                    fecha_desde: values.fecha_desde,
                    fecha_hasta: values.fecha_hasta,
                    nueva_fecha: values.nueva_fecha,
                    nueva_hora: values.nueva_hora || undefined,
                    usuario: currentUsername,
                    observaciones: values.observaciones || undefined,
                    codSubDepar: codSubDepar,
                    motivo: values.motivo
                }

                await updateMasivoHitos(payload)
                onSuccess('Actualización masiva completada correctamente')
                onHide()

            } catch (error: any) {
                console.error('Error en update masivo:', error)
                const msg = error?.response?.data?.detail || 'Error al realizar la actualización masiva'
                onError(msg)
            } finally {
                setLoading(false)
            }
        },
    })

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearchTerm])

    // Load clients on show
    useEffect(() => {
        if (show) {
            loadAllClientes()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    // Reset when opening/closing modal
    useEffect(() => {
        if (show) {
            setSelectedClientes([])
            formik.resetForm()
        } else {
            setSearchTerm('')
            setDebouncedSearchTerm('')
            setCurrentPage(1)
            setAllClientes([])
            setSortField('razsoc')
            setSortDirection('asc')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const loadAllClientes = async () => {
        if (!hito) return

        try {
            setLoadingClientes(true)
            // Cargar TODOS los clientes (limit alto) para gestión cliente-side
            const response = await getClientesPorHito(
                hito.id,
                1,
                10000,
                '',
                'razsoc',
                'asc'
            )
            setAllClientes(response.clientes || [])

        } catch (error) {
            console.error('Error al cargar clientes:', error)
            onError('Error al cargar listado de empresas')
            setAllClientes([])
        } finally {
            setLoadingClientes(false)
        }
    }

    // Lógica Cliente-Side: Filtrado, Ordenación y Paginación

    // 1. Filtrado
    const filteredClientes = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return allClientes

        const lowerSearch = debouncedSearchTerm.toLowerCase()
        return allClientes.filter(c =>
            (c.razsoc && c.razsoc.toLowerCase().includes(lowerSearch)) ||
            (c.cif && c.cif.toLowerCase().includes(lowerSearch))
        )
    }, [allClientes, debouncedSearchTerm])

    // 2. Ordenación
    const sortedClientes = useMemo(() => {
        return [...filteredClientes].sort((a: any, b: any) => {
            const aVal = a[sortField] || ''
            const bVal = b[sortField] || ''

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
            return 0
        })
    }, [filteredClientes, sortField, sortDirection])

    // 3. Paginación
    const totalItems = sortedClientes.length
    const currentClientes = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        const end = start + itemsPerPage
        return sortedClientes.slice(start, end)
    }, [sortedClientes, currentPage, itemsPerPage])

    // Selección
    const allCurrentPageSelected = currentClientes.length > 0 && currentClientes.every(c => selectedClientes.includes(c.idcliente))
    // Verificar si TODOS los filtrados están seleccionados (para el botón Select All global)
    // const allFilteredSelected = filteredClientes.length > 0 && filteredClientes.every(c => selectedClientes.includes(c.idcliente))

    const handleSelectCurrentPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Añadir los de la página actual que no estén ya seleccionados
            const newSelected = [...selectedClientes]
            currentClientes.forEach(c => {
                if (!newSelected.includes(c.idcliente)) {
                    newSelected.push(c.idcliente)
                }
            })
            setSelectedClientes(newSelected)
        } else {
            // Quitar los de la página actual
            const idsToRemove = currentClientes.map(c => c.idcliente)
            setSelectedClientes(selectedClientes.filter(id => !idsToRemove.includes(id)))
        }
    }

    const handleSelectAllFiltered = () => {
        // Seleccionar todos los que coinciden con el filtro
        const allIds = filteredClientes.map(c => c.idcliente)
        // Combinar con los que ya estaban seleccionados (uvas de otra busqueda si existieran, aunque aqui reemplazamos lógica)
        // La lógica "Select All" suele ser "Select visible set".
        // Vamos a reemplazar la selección con "todos los filtrados", o mergear?
        // Mergear es más seguro si el usuario quiere acumular selecciones de diferentes búsquedas.
        const newSelected = [...new Set([...selectedClientes, ...allIds])]
        setSelectedClientes(newSelected)
    }

    const handleClearSelection = () => {
        setSelectedClientes([])
    }

    const handleSelectClient = (id: string) => {
        if (selectedClientes.includes(id)) {
            setSelectedClientes(selectedClientes.filter(cId => cId !== id))
        } else {
            setSelectedClientes([...selectedClientes, id])
        }
    }

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
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

    return (
        <Modal
            show={show}
            onHide={onHide}
            aria-labelledby='kt_modal_actualiza_masiva'
            dialogClassName='modal-dialog modal-dialog-centered mw-900px'
            backdrop="static"
            keyboard={false}
            contentClassName='shadow-lg'
            style={{
                fontFamily: atisaStyles.fonts.secondary
            }}
        >
            <form onSubmit={formik.handleSubmit} className='form d-flex flex-column h-100'>
                {/* Header */}
                <div
                    className='d-flex justify-content-between align-items-center p-5 border-bottom'
                    style={{
                        background: 'linear-gradient(135deg, #00505c 0%, #007b8a 100%)',
                        borderRadius: '12px 12px 0 0',
                    }}
                >
                    <div className="d-flex flex-column">
                        <h2
                            style={{
                                fontFamily: atisaStyles.fonts.primary,
                                fontWeight: 'bold',
                                color: 'white',
                                margin: 0,
                                fontSize: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className="bi bi-calendar-range-fill fs-2 text-white opacity-75"></i>
                            Actualización masiva de fecha / hora límite
                        </h2>
                        {hito && (
                            <span className="text-white opacity-75 ms-10 mt-1 fs-7">
                                Hito: <strong>{hito?.nombre}</strong>
                            </span>
                        )}
                    </div>

                    <div
                        className='btn btn-icon btn-sm btn-active-color-primary btn-color-white bg-white bg-opacity-10 bg-hover-opacity-20'
                        onClick={onHide}
                        style={{
                            width: '32px',
                            height: '32px',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}
                    >
                        <i className="bi bi-x fs-2"></i>
                    </div>
                </div>

                <div className='modal-body scroll-y px-8 py-6' style={{ maxHeight: '70vh' }}>

                    {/* Sección de Fechas */}
                    <div className="card shadow-sm border border-gray-200 mb-8" style={{ backgroundColor: '#f8f9fa' }}>
                        <div className="card-body p-6">
                            <h5 className="fw-bold mb-5 d-flex align-items-center" style={{ color: atisaStyles.colors.primary, fontFamily: atisaStyles.fonts.primary }}>
                                <span
                                    className="badge me-3 flex-shrink-0"
                                    style={{ backgroundColor: atisaStyles.colors.light, color: atisaStyles.colors.primary }}
                                >
                                    1
                                </span>
                                Configuración de Fechas
                            </h5>

                            <div className='row g-5 mb-5'>
                                <div className='col-md-6 fv-row'>
                                    <label
                                        className='required fw-bold fs-6 mb-2'
                                        style={{ fontFamily: atisaStyles.fonts.primary, color: atisaStyles.colors.primary }}
                                    >
                                        F. Corte Desde
                                    </label>
                                    <div className="position-relative">
                                        <i className="bi bi-calendar-event position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: atisaStyles.colors.primary }}></i>
                                        <input
                                            type='date'
                                            className='form-control form-control-solid ps-10'
                                            placeholder='Seleccionar fecha...'
                                            value={formik.values.fecha_desde}
                                            onChange={formik.handleChange}
                                            name="fecha_desde"
                                            style={{
                                                height: '42px',
                                                borderColor: formik.errors.fecha_desde && formik.touched.fecha_desde ? atisaStyles.colors.error : undefined,
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </div>
                                    {formik.touched.fecha_desde && formik.errors.fecha_desde && (
                                        <div className='mt-1 fs-7' style={{ color: atisaStyles.colors.error }}>{formik.errors.fecha_desde}</div>
                                    )}
                                </div>

                                <div className='col-md-6 fv-row'>
                                    <label
                                        className='fw-bold fs-6 mb-2'
                                        style={{ fontFamily: atisaStyles.fonts.primary, color: atisaStyles.colors.primary }}
                                    >
                                        F. Corte Hasta <span className="text-muted fw-normal fs-7">(Opcional)</span>
                                    </label>
                                    <div className="position-relative">
                                        <i className="bi bi-calendar-event position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: atisaStyles.colors.primary }}></i>
                                        <input
                                            type='date'
                                            className='form-control form-control-solid ps-10'
                                            placeholder='Seleccionar fecha...'
                                            value={formik.values.fecha_hasta}
                                            onChange={formik.handleChange}
                                            name="fecha_hasta"
                                            style={{ height: '42px', borderRadius: '8px' }}
                                        />
                                    </div>
                                    {formik.touched.fecha_hasta && formik.errors.fecha_hasta && (
                                        <div className='mt-1 fs-7' style={{ color: atisaStyles.colors.error }}>{formik.errors.fecha_hasta}</div>
                                    )}
                                </div>
                            </div>

                            <div className="separator separator-dashed my-5"></div>

                            <div className='row g-5'>
                                <div className='col-md-6 fv-row'>
                                    <label
                                        className='required fw-bold fs-6 mb-2'
                                        style={{ fontFamily: atisaStyles.fonts.primary, color: atisaStyles.colors.primary }}
                                    >
                                        Nueva Fecha Límite
                                    </label>
                                    <div className="position-relative">
                                        <i className="bi bi-calendar-check position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: atisaStyles.colors.secondary }}></i>
                                        <input
                                            type='date'
                                            className='form-control form-control-solid ps-10'
                                            placeholder='Seleccionar fecha...'
                                            value={formik.values.nueva_fecha}
                                            onChange={formik.handleChange}
                                            name="nueva_fecha"
                                            style={{ height: '42px', borderRadius: '8px', border: `1px solid ${atisaStyles.colors.secondary}` }}
                                        />
                                    </div>
                                    {formik.touched.nueva_fecha && formik.errors.nueva_fecha && (
                                        <div className='mt-1 fs-7' style={{ color: atisaStyles.colors.error }}>{formik.errors.nueva_fecha}</div>
                                    )}
                                </div>

                                <div className='col-md-6 fv-row'>
                                    <label
                                        className='fw-bold fs-6 mb-2'
                                        style={{ fontFamily: atisaStyles.fonts.primary, color: atisaStyles.colors.primary }}
                                    >
                                        Nueva Hora Límite
                                    </label>
                                    <div className="position-relative">
                                        <i className="bi bi-clock position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: atisaStyles.colors.secondary }}></i>
                                        <input
                                            type='time'
                                            className='form-control form-control-solid ps-10'
                                            placeholder='Seleccionar hora...'
                                            value={formik.values.nueva_hora}
                                            onChange={formik.handleChange}
                                            name="nueva_hora"
                                            style={{ height: '42px', borderRadius: '8px', border: `1px solid ${atisaStyles.colors.secondary}` }}
                                        />
                                    </div>
                                    {formik.touched.nueva_hora && formik.errors.nueva_hora && (
                                        <div className='mt-1 fs-7' style={{ color: atisaStyles.colors.error }}>{formik.errors.nueva_hora}</div>
                                    )}
                                </div>
                            </div>

                            <div className="separator separator-dashed my-5"></div>

                            {/* Motivo de Auditoría */}
                            <div className='row g-5'>
                                <div className="col-12 fv-row position-relative">
                                    <label
                                        className='required fw-bold fs-6 mb-2'
                                        style={{ fontFamily: atisaStyles.fonts.primary, color: atisaStyles.colors.primary }}
                                    >
                                        Motivo de modificación
                                    </label>
                                    <div className="position-relative">
                                        <i className="bi bi-flag position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: atisaStyles.colors.primary }}></i>
                                        <select
                                            className='form-select form-select-solid ps-10'
                                            name="motivo"
                                            value={formik.values.motivo}
                                            onChange={formik.handleChange}
                                            style={{ height: '42px', borderRadius: '8px' }}
                                        >
                                            <option value={0} disabled>Seleccione un motivo...</option>
                                            {MOTIVOS_AUDITORIA.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.id}. {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {formik.touched.motivo && formik.errors.motivo && (
                                        <div className='mt-1 fs-7' style={{ color: atisaStyles.colors.error }}>{formik.errors.motivo}</div>
                                    )}
                                </div>
                            </div>

                            <div className="separator separator-dashed my-5"></div>

                            <div className='row g-5'>
                                <div className='col-12 fv-row'>
                                    <label
                                        className='fw-bold fs-6 mb-2'
                                        style={{ fontFamily: atisaStyles.fonts.primary, color: atisaStyles.colors.primary }}
                                    >
                                        Observaciones <span className="text-muted fw-normal fs-7">(Opcional)</span>
                                    </label>
                                    <div className="position-relative">
                                        <i className="bi bi-chat-text position-absolute top-50 start-0 translate-middle-y ms-3 mb-4" style={{ color: atisaStyles.colors.primary }}></i>
                                        <textarea
                                            className='form-control form-control-solid ps-10'
                                            placeholder='Motivo del cambio...'
                                            value={formik.values.observaciones}
                                            onChange={formik.handleChange}
                                            name="observaciones"
                                            style={{ borderRadius: '8px', minHeight: '42px', height: '42px' }}
                                        />
                                    </div>
                                    {formik.touched.observaciones && formik.errors.observaciones && (
                                        <div className='mt-1 fs-7' style={{ color: atisaStyles.colors.error }}>{formik.errors.observaciones}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección de Selección de Empresas */}
                    <div className="d-flex flex-column">
                        <h5 className="fw-bold mb-4 d-flex align-items-center" style={{ color: atisaStyles.colors.primary, fontFamily: atisaStyles.fonts.primary }}>
                            <span
                                className="badge me-3 flex-shrink-0"
                                style={{ backgroundColor: atisaStyles.colors.light, color: atisaStyles.colors.primary }}
                            >
                                2
                            </span>
                            Selección de Empresas
                        </h5>

                        <div className='d-flex align-items-center mb-4 gap-3'>
                            <div className="position-relative flex-grow-1">
                                <span className="position-absolute top-50 translate-middle-y ms-3">
                                    <i className="bi bi-search" style={{ color: atisaStyles.colors.light }}></i>
                                </span>
                                <input
                                    type='text'
                                    className='form-control form-control-solid ps-10'
                                    placeholder='Buscar por Razón Social o CIF...'
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        border: `2px solid ${atisaStyles.colors.light}`,
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontFamily: atisaStyles.fonts.secondary
                                    }}
                                />
                            </div>
                        </div>

                        {/* Barra de Selección (Contador y Acciones masivas) */}
                        <div
                            style={{
                                backgroundColor: atisaStyles.colors.light,
                                padding: '12px 16px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: `1px solid ${atisaStyles.colors.accent}`
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                    <span
                                        style={{
                                            fontFamily: atisaStyles.fonts.secondary,
                                            color: atisaStyles.colors.primary,
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            marginRight: '16px'
                                        }}
                                    >
                                        <i className="bi bi-check-circle me-2"></i>
                                        Empresas seleccionadas: {selectedClientes.length}
                                    </span>
                                    {filteredClientes.length > 0 && (
                                        <span
                                            style={{
                                                fontFamily: atisaStyles.fonts.secondary,
                                                color: atisaStyles.colors.dark,
                                                fontSize: '12px'
                                            }}
                                        >
                                            de {filteredClientes.length} empresas disponibles
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex gap-2">
                                    {filteredClientes.length > 0 && selectedClientes.length < filteredClientes.length && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            onClick={handleSelectAllFiltered}
                                            style={{
                                                backgroundColor: atisaStyles.colors.accent,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                padding: '4px 8px',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                                e.currentTarget.style.transform = 'translateY(-1px)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                                e.currentTarget.style.transform = 'translateY(0)'
                                            }}
                                        >
                                            <i className="bi bi-check-all me-1"></i>
                                            Seleccionar todas
                                        </button>
                                    )}
                                    {selectedClientes.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            onClick={handleClearSelection}
                                            style={{
                                                backgroundColor: 'transparent',
                                                color: atisaStyles.colors.dark,
                                                border: `1px solid ${atisaStyles.colors.dark}`,
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                padding: '4px 8px',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = atisaStyles.colors.dark
                                                e.currentTarget.style.color = 'white'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                                e.currentTarget.style.color = atisaStyles.colors.dark
                                            }}
                                        >
                                            <i className="bi bi-x me-1"></i>
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>


                        <div className='table-responsive border rounded-3 position-relative' style={{ borderColor: atisaStyles.colors.light }}>
                            {loadingClientes ? (
                                <div className='d-flex justify-content-center align-items-center py-10'>
                                    <div
                                        className='spinner-border mb-3'
                                        role='status'
                                        style={{ width: '3rem', height: '3rem', color: atisaStyles.colors.primary }}
                                    ></div>
                                    <div className="fw-semibold ms-3" style={{ color: atisaStyles.colors.primary }}>Cargando empresas...</div>
                                </div>
                            ) : (
                                <table className='table table-hover align-middle gs-0 gy-3 mb-0' style={{ width: '100%' }}>
                                    <thead className="sticky-top" style={{ zIndex: 1 }}>
                                        <tr className="fw-bold fs-6">
                                            <th className="ps-4 w-50px py-3" style={getTableHeaderStyles()}>
                                                <div className='form-check form-check-sm form-check-custom form-check-solid'>
                                                    <input
                                                        className='form-check-input cursor-pointer'
                                                        type='checkbox'
                                                        checked={allCurrentPageSelected}
                                                        onChange={handleSelectCurrentPage}
                                                        style={{
                                                            border: `1px solid ${atisaStyles.colors.primary}`,
                                                            backgroundColor: allCurrentPageSelected ? atisaStyles.colors.secondary : 'transparent'
                                                        }}
                                                    />
                                                </div>
                                            </th>
                                            <th
                                                className="py-3 cursor-pointer"
                                                onClick={() => handleSort('razsoc')}
                                                style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                                    e.currentTarget.style.color = 'white'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                                                    e.currentTarget.style.color = atisaStyles.colors.primary
                                                }}
                                            >
                                                Empresa {getSortIcon('razsoc')}
                                            </th>
                                            <th
                                                className="py-3 cursor-pointer"
                                                onClick={() => handleSort('cif')}
                                                style={{ ...getTableHeaderStyles(), transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                                    e.currentTarget.style.color = 'white'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                                                    e.currentTarget.style.color = atisaStyles.colors.primary
                                                }}
                                            >
                                                CIF {getSortIcon('cif')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentClientes.length > 0 ? (
                                            currentClientes.map((cliente, index) => {
                                                const isSelected = selectedClientes.includes(cliente.idcliente);
                                                return (
                                                    <tr
                                                        key={cliente.idcliente}
                                                        style={{
                                                            cursor: 'pointer',
                                                            backgroundColor: isSelected ? 'rgba(156, 186, 57, 0.15)' : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onClick={(e) => {
                                                            if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                                                handleSelectClient(cliente.idcliente)
                                                            }
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.backgroundColor = atisaStyles.colors.light
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
                                                        <td className='ps-4' style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                            <div className='form-check form-check-sm form-check-custom form-check-solid'>
                                                                <input
                                                                    className='form-check-input'
                                                                    type='checkbox'
                                                                    checked={isSelected}
                                                                    onChange={() => handleSelectClient(cliente.idcliente)}
                                                                    style={{
                                                                        border: `1px solid ${atisaStyles.colors.primary}`,
                                                                        backgroundColor: isSelected ? atisaStyles.colors.secondary : 'transparent'
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                            <div className="d-flex flex-column">
                                                                <span
                                                                    className={`fw-bold fs-6`}
                                                                    style={{ color: isSelected ? atisaStyles.colors.secondary : atisaStyles.colors.primary }}
                                                                >
                                                                    {cliente.razsoc}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                                                            <span className='fw-bold fs-7' style={{ color: atisaStyles.colors.dark }}>
                                                                {cliente.cif || '-'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className='text-center py-10' style={{ backgroundColor: 'white' }}>
                                                    <div className="d-flex flex-column align-items-center">
                                                        <i className="bi bi-search fs-3x mb-3" style={{ color: atisaStyles.colors.light }}></i>
                                                        <span className='fs-6 fw-semibold' style={{ color: atisaStyles.colors.primary }}>
                                                            {debouncedSearchTerm ? 'No se encontraron empresas coincidentes.' : 'No hay empresas disponibles.'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Paginación */}
                        <div className="mt-4 d-flex justify-content-between align-items-center flex-wrap">
                            <div className="text-gray-600 fs-7" style={{ fontFamily: atisaStyles.fonts.secondary }}>
                                Mostrando <span className="fw-bold text-dark">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="fw-bold text-dark">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="fw-bold text-dark">{totalItems}</span> registros
                            </div>
                            <SharedPagination
                                currentPage={currentPage}
                                totalItems={totalItems}
                                pageSize={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>
                </div>

                <Modal.Footer
                    className='py-4 px-8 border-top'
                    style={{
                        borderRadius: '0 0 12px 12px',
                        backgroundColor: '#f8f9fa'
                    }}
                >
                    <button
                        type='button'
                        className='btn me-3'
                        onClick={onHide}
                        disabled={loading}
                        style={{
                            backgroundColor: 'white',
                            color: atisaStyles.colors.primary,
                            border: `2px solid ${atisaStyles.colors.primary}`,
                            borderRadius: '8px',
                            fontWeight: '600'
                        }}
                    >
                        Cancelar
                    </button>

                    <button
                        type='submit'
                        className='btn'
                        disabled={loading || selectedClientes.length === 0}
                        style={{
                            backgroundColor: selectedClientes.length === 0 ? '#6c757d' : atisaStyles.colors.secondary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            boxShadow: selectedClientes.length > 0 ? '0 4px 15px rgba(156, 186, 57, 0.3)' : 'none'
                        }}
                    >
                        {loading ? (
                            <>
                                <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true'></span>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle me-2 text-white"></i>
                                Actualizar {selectedClientes.length > 0 ? `(${selectedClientes.length})` : ''}
                            </>
                        )}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    )
}

export default ActualizaMasivaHitosModal
