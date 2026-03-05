import React, { FC, useState, useEffect } from 'react'
import { Modal } from 'react-bootstrap'
import { Cliente } from '../../../api/clientes'
import { Plantilla } from '../../../api/plantillas'
import { GenerarCalendarioParams } from '../../../api/clienteProcesos'
import Select from 'react-select'
import { getProcesosByPlantilla } from '../../../api/plantillaProcesos'
import { Proceso } from '../../../api/procesos'
import { atisaStyles } from '../../../styles/atisaStyles'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (calendarios: GenerarCalendarioParams[]) => void
  plantillas: Plantilla[]
  selectedCliente: Cliente | null
  procesosList: Proceso[]
}

const ClienteProcesosModal: FC<Props> = ({
  show,
  onHide,
  onSave,
  plantillas,
  selectedCliente,
  procesosList,
}) => {
  const [formData, setFormData] = useState({
    plantillaId: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
  })
  const [procesos, setProcesos] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [plantillaError, setPlantillaError] = useState('')

  // Resetear formulario al cerrar el modal
  useEffect(() => {
    if (!show) {
      setFormData({
        plantillaId: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
      })
      setProcesos([])
      setProcesos([])
      setLoading(false)
      setPlantillaError('')
    }
  }, [show])

  const handlePlantillaChange = async (option: any) => {
    setFormData({ ...formData, plantillaId: option?.value || '' })
    if (option?.value) {
      try {
        setLoading(true)
        const procesosDePlantilla = await getProcesosByPlantilla(option.value)
        const procesoIds = procesosDePlantilla.map(p => p.proceso_id)
        setProcesos(procesoIds)

        if (procesoIds.length === 0) {
          setPlantillaError('La plantilla seleccionada no tiene procesos asignados.')
        } else {
          setPlantillaError('')
        }
      } catch (error) {
        console.error('Error al cargar los procesos:', error)
        setProcesos([])
        setPlantillaError('Error al cargar los procesos de la plantilla.')
      } finally {
        setLoading(false)
      }
    } else {
      setProcesos([])
      setPlantillaError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCliente || !formData.plantillaId || !procesos.length || !formData.fecha_inicio) return

    const calendarios = procesos.map(procesoId => ({
      cliente_id: selectedCliente.idcliente,
      proceso_id: procesoId,
      fecha_inicio: formData.fecha_inicio,
    }))

    onSave(calendarios)

    // Limpiar tras guardar correctamente
    setFormData({
      plantillaId: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
    setProcesos([])
  }

  const getProcesosInfo = (procesoId: number) => {
    return procesosList.find(p => p.id === procesoId)?.nombre || `Proceso ${procesoId}`
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      style={{
        fontFamily: atisaStyles.fonts.secondary
      }}
    >
      <Modal.Header
        style={{
          backgroundColor: atisaStyles.colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: '12px 12px 0 0',
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
          <i className="bi bi-calendar-plus me-2" style={{ color: 'white' }}></i>
          Generar Calendario
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
      <Modal.Body
        style={{
          backgroundColor: 'white',
          padding: '24px'
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className='row mb-4'>
            <div className='col-md-6'>
              <label
                className='form-label required'
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                <i className="bi bi-building me-2"></i>
                Cliente
              </label>
              <input
                type='text'
                className='form-control form-control-solid'
                value={selectedCliente?.razsoc || ''}
                readOnly
                style={{
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  height: '48px',
                  backgroundColor: '#f8f9fa'
                }}
              />
            </div>
            <div className='col-md-6'>
              <label
                className='form-label required'
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                <i className="bi bi-file-earmark-text me-2"></i>
                Plantilla
              </label>
              <Select
                value={(() => {
                  const id = Number(formData.plantillaId)
                  const match = plantillas.find(p => p.id === id)
                  return match ? { value: match.id, label: match.nombre } : null
                })()}
                onChange={handlePlantillaChange}
                options={plantillas.map(p => ({
                  value: p.id,
                  label: p.nombre
                }))}
                noOptionsMessage={() => "No hay plantillas disponibles"}
                placeholder="Seleccione una plantilla"
                isLoading={loading}
                styles={{
                  control: (base) => ({
                    ...base,
                    border: `2px solid ${atisaStyles.colors.light}`,
                    borderRadius: '8px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontSize: '14px',
                    minHeight: '48px',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: atisaStyles.colors.accent
                    }
                  }),
                  option: (base, state) => ({
                    ...base,
                    fontFamily: atisaStyles.fonts.secondary,
                    backgroundColor: state.isSelected ? atisaStyles.colors.primary : 'white',
                    color: state.isSelected ? 'white' : atisaStyles.colors.dark,
                    '&:hover': {
                      backgroundColor: state.isSelected ? atisaStyles.colors.primary : atisaStyles.colors.light
                    }
                  })
                }}
              />
              {plantillaError && (
                <div className="alert alert-danger mt-3" style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  padding: '12px 16px',
                  marginBottom: '0',
                  borderRadius: '8px',
                  border: '1px solid #f5c6cb',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '1.2rem', color: '#721c24' }}></i>
                  {plantillaError}
                </div>
              )}
              {loading && (
                <div
                  className="text-muted mt-2"
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    fontSize: '14px'
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Cargando procesos...
                </div>
              )}
              {procesos.length > 0 && (
                <div className="mt-4">
                  <h6
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      color: atisaStyles.colors.primary,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '12px'
                    }}
                  >
                    <i className="bi bi-list-check me-2"></i>
                    Procesos seleccionados: {procesos.length}
                  </h6>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: `2px solid ${atisaStyles.colors.light}`,
                    borderRadius: '8px',
                    backgroundColor: 'white'
                  }}>
                    <ul className="list-group list-group-flush">
                      {procesos.map((procesoId) => (
                        <li
                          key={procesoId}
                          className="list-group-item"
                          style={{
                            fontFamily: atisaStyles.fonts.secondary,
                            color: atisaStyles.colors.dark,
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            padding: '12px 16px'
                          }}
                        >
                          <i className="bi bi-gear me-2" style={{ color: atisaStyles.colors.accent }}></i>
                          {getProcesosInfo(procesoId)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='fv-row mb-4'>
            <label
              className='required fw-bold fs-6 mb-2'
              style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontSize: '16px'
              }}
            >
              <i className="bi bi-calendar-x me-2"></i>
              Fecha Inicio
            </label>
            <input
              type='date'
              className='form-control form-control-solid'
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
              required
              style={{
                border: `2px solid ${atisaStyles.colors.light}`,
                borderRadius: '8px',
                fontFamily: atisaStyles.fonts.secondary,
                fontSize: '14px',
                height: '48px',
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

        </form>
      </Modal.Body>
      <Modal.Footer
        style={{
          backgroundColor: '#f8f9fa',
          border: 'none',
          borderRadius: '0 0 12px 12px',
          padding: '20px 24px'
        }}
      >
        <button
          type='button'
          className='btn'
          onClick={onHide}
          style={{
            backgroundColor: 'transparent',
            color: atisaStyles.colors.dark,
            border: `2px solid ${atisaStyles.colors.light}`,
            borderRadius: '8px',
            fontFamily: atisaStyles.fonts.secondary,
            fontWeight: '600',
            padding: '10px 20px',
            fontSize: '14px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
            e.currentTarget.style.color = atisaStyles.colors.primary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = atisaStyles.colors.dark
          }}
        >
          <i className="bi bi-x-circle me-2"></i>
          Cancelar
        </button>
        <button
          type='button'
          className='btn'
          onClick={handleSubmit}
          disabled={!selectedCliente || !formData.plantillaId || !formData.fecha_inicio || procesos.length === 0}
          style={{
            backgroundColor: atisaStyles.colors.secondary,
            border: `2px solid ${atisaStyles.colors.secondary}`,
            color: 'white',
            fontFamily: atisaStyles.fonts.secondary,
            fontWeight: '600',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            marginLeft: '12px',
            boxShadow: '0 4px 15px rgba(156, 186, 57, 0.3)',
            opacity: (!selectedCliente || !formData.plantillaId || !formData.fecha_inicio || procesos.length === 0) ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
              e.currentTarget.style.borderColor = atisaStyles.colors.accent
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 161, 222, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.borderColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(156, 186, 57, 0.3)'
            }
          }}
        >
          <i className="bi bi-calendar-plus me-2"></i>
          Generar
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default ClienteProcesosModal
