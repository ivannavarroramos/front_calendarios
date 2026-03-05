import {FC, useEffect, useState} from 'react'
import {Modal} from 'react-bootstrap'
import {Proceso} from '../../../api/procesos'
import {atisaStyles} from '../../../styles/atisaStyles'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (proceso: Omit<Proceso, 'id'>) => void
  proceso: Proceso | null
}

const ProcesoModal: FC<Props> = ({show, onHide, onSave, proceso}) => {
  const [formData, setFormData] = useState<Omit<Proceso, 'id'>>({
    nombre: '',
    descripcion: null,
    frecuencia: 1,
    temporalidad: 'mes',
    habilitado: 1,
  })

  useEffect(() => {
    if (proceso) {
      setFormData({
        nombre: proceso.nombre,
        descripcion: proceso.descripcion,
        frecuencia: proceso.frecuencia,
        temporalidad: proceso.temporalidad,
        habilitado: proceso.habilitado,
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: null,
        frecuencia: 1,
        temporalidad: 'mes',
        habilitado: 1,
      })
    }
  }, [proceso, show])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby='kt_modal_1'
      dialogClassName='modal-dialog modal-dialog-centered mw-650px'
      style={{
        fontFamily: atisaStyles.fonts.secondary
      }}
    >
      <form onSubmit={handleSubmit} id='kt_modal_add_proceso_form' className='form'>
        <Modal.Header
          className='modal-header'
          style={{
            backgroundColor: atisaStyles.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px 12px 0 0'
          }}
        >
          <Modal.Title
            className='fw-bolder'
            style={{
              fontFamily: atisaStyles.fonts.primary,
              fontWeight: 'bold',
              color: 'white',
              fontSize: '1.5rem'
            }}
          >
            <i className="bi bi-gear-fill me-2"></i>
            {proceso ? 'Editar' : 'Nuevo'} Proceso
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
          className='modal-body scroll-y mx-5 mx-xl-15 my-7'
          style={{
            backgroundColor: 'white',
            padding: '24px'
          }}
        >
          <div className='d-flex flex-column scroll-y me-n7 pe-7'>
            <div className='fv-row mb-4'>
              <label
                className='required fw-bold fs-6 mb-2'
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontSize: '16px'
                }}
              >
                <i className="bi bi-tag me-2"></i>
                Nombre
              </label>
              <input
                type='text'
                className='form-control form-control-solid mb-3 mb-lg-0'
                placeholder='Nombre del proceso'
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
                maxLength={150}
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

            <div className='fv-row mb-4'>
              <label
                className='required fw-bold fs-6 mb-2'
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontSize: '16px'
                }}
              >
                <i className="bi bi-calendar-range me-2"></i>
                Temporalidad
              </label>
              <select
                className='form-select form-select-solid'
                value={formData.temporalidad}
                onChange={(e) => setFormData({...formData, temporalidad: e.target.value})}
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
              >
                <option value='mes'>Mensual</option>
                <option value='trimestre'>Trimestral</option>
                <option value='semestre'>Semestral</option>
                <option value='año'>Anual</option>
              </select>
            </div>

            <div className='fv-row mb-4'>
              <label
                className='fw-bold fs-6 mb-2'
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontSize: '16px'
                }}
              >
                <i className="bi bi-chat-text me-2"></i>
                Descripción
              </label>
              <textarea
                className='form-control form-control-solid'
                rows={3}
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value || null})}
                maxLength={255}
                style={{
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
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
          className='modal-footer'
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
            type='submit'
            className='btn'
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
              boxShadow: '0 4px 15px rgba(156, 186, 57, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
              e.currentTarget.style.borderColor = atisaStyles.colors.accent
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 161, 222, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.borderColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(156, 186, 57, 0.3)'
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            <span className='indicator-label'>{proceso ? 'Actualizar' : 'Guardar'}</span>
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

export default ProcesoModal
