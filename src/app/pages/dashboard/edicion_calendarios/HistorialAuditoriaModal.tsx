import { FC, useEffect, useState, useMemo } from 'react'
import { Modal, OverlayTrigger, Tooltip, Collapse } from 'react-bootstrap'
import { getAuditoriaCalendariosByCliente, AuditoriaCalendario } from '../../../api/auditoriaCalendarios'
import { atisaStyles } from '../../../styles/atisaStyles'
import SharedPagination from '../../../components/pagination/SharedPagination'
import Select from 'react-select'
import { getAllProcesos } from '../../../api/procesos'
import { getAllHitos } from '../../../api/hitos'
import { getAllSubdepartamentos, Subdepartamento } from '../../../api/subdepartamentos'
import { getClienteProcesosHabilitadosByCliente } from '../../../api/clienteProcesos'
import { getClienteProcesoHitosHabilitadosByProceso } from '../../../api/clienteProcesoHitos'
import { formatDateDisplay, formatDateTimeDisplay } from '../../../utils/dateFormatter'

interface Props {
  show: boolean
  onHide: () => void
  hitoId?: number
  clienteId: string
}

const HistorialAuditoriaModal: FC<Props> = ({ show, onHide, hitoId, clienteId }) => {
  const [auditoria, setAuditoria] = useState<AuditoriaCalendario[]>([])
  const [loading, setLoading] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(6)
  const [showFilters, setShowFilters] = useState(false)

  // Estados para filtros
  const [cuboFiltro, setCuboFiltro] = useState<string[]>([])
  const [procesoFiltro, setProcesoFiltro] = useState('')
  const [hitoFiltro, setHitoFiltro] = useState('')
  const [claveFiltro, setClaveFiltro] = useState('')
  const [motivoFiltro, setMotivoFiltro] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')

  // Opciones de filtros
  const [procesosCliente, setProcesosCliente] = useState<{ id: number, nombre: string }[]>([])
  const [hitosCliente, setHitosCliente] = useState<{ id: number, nombre: string }[]>([])
  const [subdepartamentos, setSubdepartamentos] = useState<Subdepartamento[]>([])


  useEffect(() => {
    if (show) {
      setAuditoria([])
      setLoading(false)
      setCurrentPage(1)
      setTotalPages(1)
      setTotalItems(0)

      const hoy = new Date()
      const haceUnAno = new Date(Date.UTC(hoy.getUTCFullYear() - 1, hoy.getUTCMonth(), hoy.getUTCDate()))

      setFechaDesde(haceUnAno.toISOString().split('T')[0])
      setFechaHasta(hoy.toISOString().split('T')[0])

      cargarFiltros()
      cargarAuditoria()
    }
  }, [show, clienteId])

  const cargarFiltros = async () => {
    try {
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

      const resHitos = await Promise.all(cpList.map((cp: any) => getClienteProcesoHitosHabilitadosByProceso(cp.id)));
      const hitosIds = new Set<number>();
      resHitos.forEach((listaHitos: any) => {
        listaHitos.forEach((h: any) => hitosIds.add(h.hito_id));
      });

      const hitosInfo = Array.from(hitosIds).map(id => {
        const hMaestro = hitos.find((h: any) => h.id === id);
        return { id, nombre: hMaestro?.nombre || `Hito ${id}` };
      });
      hitosInfo.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setHitosCliente(hitosInfo);
    } catch (error) {
      console.error("Error cargando filtros modal:", error);
    }
  }

  const cargarAuditoria = async (page: number = currentPage) => {
    setLoading(true)
    try {
      const data = await getAuditoriaCalendariosByCliente(
        clienteId,
        page,
        itemsPerPage,
        'fecha_modificacion',
        'desc',
        fechaDesde,
        fechaHasta
      )

      setAuditoria(data.auditoria_calendarios || [])
      setTotalItems(data.total)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
      setCurrentPage(page)
    } catch (error) {
      console.error('Error cargando auditoría:', error)
      setAuditoria([])
      setTotalItems(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleFiltrar = () => {
    setCurrentPage(1)
    cargarAuditoria(1)
  }

  const handlePageChange = (page: number) => {
    cargarAuditoria(page)
  }

  const formatDate = (date: string) => {
    return formatDateTimeDisplay(date)
  }

  const getCampoNombre = (campo: string) => {
    const campos: Record<string, string> = {
      'fecha_inicio': 'Fecha de Inicio',
      'fecha_fin': 'Fecha Límite',
      'hora_limite': 'Hora Límite',
      'estado': 'Estado'
    }
    return campos[campo] || campo
  }

  const usuariosUnicos = useMemo(() => {
    const users = new Set<string>();
    auditoria.forEach(item => {
      const name = item.nombre_usuario || item.usuario;
      if (name) users.add(name);
    });
    return Array.from(users).sort();
  }, [auditoria]);

  const motivosUnicos = useMemo(() => {
    const motivos = new Set<string>();
    auditoria.forEach(item => {
      if (item.motivo_descripcion) motivos.add(item.motivo_descripcion);
    });
    return Array.from(motivos).sort();
  }, [auditoria]);

  const auditoriaProcesada = useMemo(() => {
    return auditoria.filter(item => {
      const matchesCubo = cuboFiltro.length === 0 || (item.codSubDepar && cuboFiltro.includes(item.codSubDepar));
      const matchesProceso = !procesoFiltro || item.proceso_nombre === procesoFiltro;
      const matchesHito = !hitoFiltro || item.hito_nombre === hitoFiltro;
      const matchesClave = !claveFiltro || (claveFiltro === 'true' ? Boolean(item.critico) : !Boolean(item.critico));
      const matchesMotivo = !motivoFiltro || (item.motivo_descripcion === motivoFiltro);
      const matchesUsuario = !usuarioFiltro || (item.nombre_usuario === usuarioFiltro || item.usuario === usuarioFiltro);

      return matchesCubo && matchesProceso && matchesHito && matchesClave && matchesMotivo && matchesUsuario;
    });
  }, [auditoria, cuboFiltro, procesoFiltro, hitoFiltro, claveFiltro, motivoFiltro, usuarioFiltro]);

  const activeFiltersCount = [cuboFiltro.length > 0 ? '1' : '', procesoFiltro, hitoFiltro, claveFiltro, motivoFiltro, usuarioFiltro].filter(v => v !== '').length

  const clearFilters = () => {
    setCuboFiltro([])
    setProcesoFiltro('')
    setHitoFiltro('')
    setClaveFiltro('')
    setMotivoFiltro('')
    setUsuarioFiltro('')
  }

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        fullscreen={true}
        centered
        style={{
          fontFamily: atisaStyles.fonts.secondary
        }}
      >
        <Modal.Header
          style={{
            backgroundColor: atisaStyles.colors.primary,
            color: 'white',
            border: 'none',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Modal.Title
            style={{
              fontFamily: atisaStyles.fonts.primary,
              fontWeight: 'bold',
              color: 'white',
              fontSize: '1.5rem',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <i className="bi bi-clock-history me-2" style={{ color: 'white' }}></i>
            Historial de Auditoría
          </Modal.Title>
          <div
            className='btn btn-icon btn-sm'
            onClick={onHide}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <i className="bi bi-x" style={{ color: 'white', fontSize: '16px' }}></i>
          </div>
        </Modal.Header>

        <Modal.Body style={{ padding: '24px' }}>
          {/* Sección de Filtros Premium */}
          <div
            className="mb-4"
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: `1px solid ${atisaStyles.colors.light}`,
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}
          >
            <div
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: showFilters ? atisaStyles.colors.light : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div className='d-flex align-items-center gap-3'>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: atisaStyles.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <i className="bi bi-funnel-fill"></i>
                </div>
                <div>
                  <h6 style={{ margin: 0, fontWeight: '700', color: atisaStyles.colors.primary }}>Filtros de Auditoría</h6>
                  <span style={{ fontSize: '12px', color: '#7e8299' }}>
                    {activeFiltersCount > 0 ? `${activeFiltersCount} filtros activos` : 'Haz clic para expandir los filtros'}
                  </span>
                </div>
              </div>
              <div className='d-flex align-items-center gap-3'>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFilters(); }}
                    className='btn btn-link btn-sm p-0'
                    style={{ color: atisaStyles.colors.error, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
                  >
                    Limpiar Filtros
                  </button>
                )}
                <i className={`bi bi-chevron-${showFilters ? 'up' : 'down'}`} style={{ color: atisaStyles.colors.primary }}></i>
              </div>
            </div>

            <Collapse in={showFilters}>
              <div>
                <div style={{ padding: '0 20px 20px 20px', borderTop: `1px solid ${atisaStyles.colors.light}` }}>
                  <div className="row g-4 mt-1">
                    <div className="col-md-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#7e8299', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Rango de Fechas</label>
                      <div className='d-flex gap-2'>
                        <input type="date" className="form-control form-control-sm" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ fontSize: '12px' }} />
                        <input type="date" className="form-control form-control-sm" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ fontSize: '12px' }} />
                      </div>
                    </div>

                    <div className="col-md-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#7e8299', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Cubo / Línea</label>
                      <Select
                        isMulti
                        options={subdepartamentos.map(s => ({ value: s.codSubDepar || '', label: `${s.codSubDepar?.substring(4)} - ${s.nombre}` }))}
                        value={subdepartamentos.filter(s => cuboFiltro.includes(s.codSubDepar || '')).map(s => ({ value: s.codSubDepar || '', label: `${s.codSubDepar?.substring(4)} - ${s.nombre}` }))}
                        onChange={(val: any) => setCuboFiltro(val.map((o: any) => o.value))}
                        placeholder="Seleccionar..."
                        styles={{
                          control: (base) => ({ ...base, minHeight: '38px', borderRadius: '8px', borderColor: '#e4e6ef', fontSize: '12px' }),
                          multiValue: (base) => ({ ...base, backgroundColor: atisaStyles.colors.light, borderRadius: '4px' }),
                          multiValueLabel: (base) => ({ ...base, color: atisaStyles.colors.primary, fontWeight: '600' })
                        }}
                      />
                    </div>

                    <div className="col-md-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#7e8299', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Proceso</label>
                      <select className='form-select form-select-sm' value={procesoFiltro} onChange={(e) => setProcesoFiltro(e.target.value)} style={{ borderRadius: '8px', fontSize: '12px' }}>
                        <option value="">Cualquiera</option>
                        {procesosCliente.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#7e8299', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Hito</label>
                      <select className='form-select form-select-sm' value={hitoFiltro} onChange={(e) => setHitoFiltro(e.target.value)} style={{ borderRadius: '8px', fontSize: '12px' }}>
                        <option value="">Cualquiera</option>
                        {hitosCliente.map(h => <option key={h.id} value={h.nombre}>{h.nombre}</option>)}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#7e8299', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Motivo</label>
                      <select className='form-select form-select-sm' value={motivoFiltro} onChange={(e) => setMotivoFiltro(e.target.value)} style={{ borderRadius: '8px', fontSize: '12px' }}>
                        <option value="">Todos</option>
                        {motivosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#7e8299', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Usuario</label>
                      <select className='form-select form-select-sm' value={usuarioFiltro} onChange={(e) => setUsuarioFiltro(e.target.value)} style={{ borderRadius: '8px', fontSize: '12px' }}>
                        <option value="">Cualquiera</option>
                        {usuariosUnicos.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>

                    <div className="col-md-6 d-flex align-items-end justify-content-end gap-2">
                      <button className="btn btn-sm btn-primary px-6" onClick={handleFiltrar} style={{ borderRadius: '8px', fontWeight: '600' }}>
                        <i className="bi bi-search me-2"></i> Aplicar Rango Fechas
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Collapse>
          </div>

          {/* Lista de auditoría */}
          {loading ? (
            <div className="text-center py-4">
              <div
                className="spinner-border"
                role="status"
                style={{
                  color: atisaStyles.colors.primary,
                  width: '2rem',
                  height: '2rem'
                }}
              >
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-2" style={{ color: atisaStyles.colors.dark }}>
                Cargando historial de auditoría...
              </p>
            </div>
          ) : auditoria.length === 0 ? (
            <div
              className="text-center py-5"
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: `2px dashed ${atisaStyles.colors.light}`
              }}
            >
              <i
                className="bi bi-info-circle"
                style={{
                  fontSize: '48px',
                  color: atisaStyles.colors.primary,
                  marginBottom: '16px'
                }}
              ></i>
              <h5 style={{ color: atisaStyles.colors.primary, marginBottom: '8px' }}>
                No hay registros de auditoría
              </h5>
              <p style={{ color: atisaStyles.colors.dark, margin: 0 }}>
                No se encontraron cambios registrados en el período seleccionado.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                border: `1px solid ${atisaStyles.colors.light}`,
                overflow: 'hidden'
              }}
            >
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
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Cubo</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Línea</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Proceso</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Hito</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Origen</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap', textAlign: 'center' }}>Clave</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>F/H Ant.</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>F/H Act.</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Motivo</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>F. Act.</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap' }}>Usuario</th>
                      <th style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', fontSize: '14px', padding: '16px 12px', border: 'none', backgroundColor: atisaStyles.colors.primary, color: 'white', whiteSpace: 'nowrap', textAlign: 'center', width: '60px' }}>Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriaProcesada.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                        }}
                      >
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <div style={{ fontWeight: '600' }}>{item.codSubDepar ? item.codSubDepar.substring(4) : '-'}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <div style={{ fontWeight: '500' }}>{item.nombre_subdepar || '-'}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>
                          <div style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.proceso_nombre}>
                            {item.proceso_nombre}
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>
                          <div style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.hito_nombre}>
                            {item.hito_nombre}
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <span className="badge" style={{ backgroundColor: 'rgba(0,161,222,0.1)', color: atisaStyles.colors.primary, border: `1px solid rgba(0,161,222,0.3)` }}>
                            {item.tipo || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                          {item.critico ? (
                            <i className="bi bi-star-fill text-warning" title="Hito Clave"></i>
                          ) : (
                            <i className="bi bi-dash text-muted" title="No Clave"></i>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <code style={{ backgroundColor: '#f8f9fa', padding: '3px 6px', borderRadius: '4px', color: '#6c757d', border: '1px solid #dee2e6', whiteSpace: 'nowrap' }}>
                            {formatDateDisplay(item.fecha_limite_anterior || item.valor_anterior)}
                          </code>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <code style={{ backgroundColor: '#e8f5e9', padding: '3px 6px', borderRadius: '4px', color: '#105021', border: '1px solid #c8e6c9', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            {formatDateDisplay(item.fecha_limite_actual || item.valor_nuevo)}
                          </code>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
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
                        <td style={{ padding: '12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {formatDate(item.fecha_modificacion)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={(item.nombre_usuario || item.usuario)?.trim()}>
                            {(item.nombre_usuario || item.usuario)?.trim()}
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle' }}>
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
            </div>
          )}

          {/* Controles de paginación */}
          {auditoria.length > 0 && totalPages > 1 && (
            <div className="mt-4">
              <SharedPagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </Modal.Body>

        <Modal.Footer
          style={{
            backgroundColor: '#f8f9fa',
            border: 'none',
            padding: '16px 24px'
          }}
        >
          <button
            className="btn"
            onClick={onHide}
            style={{
              backgroundColor: atisaStyles.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              padding: '8px 16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
            }}
          >
            <i className="bi bi-x-circle me-2"></i>
            Cerrar
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default HistorialAuditoriaModal
