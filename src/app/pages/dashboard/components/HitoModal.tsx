import { FC, useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap'
import { Hito } from '../../../api/hitos'
import { atisaStyles } from '../../../styles/atisaStyles'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (hito: Omit<Hito, 'id'>) => void
  hito: Hito | null
}

const HitoModal: FC<Props> = ({ show, onHide, onSave, hito }) => {
  const initialFormState = {
    nombre: '',
    descripcion: null,
    fecha_limite: new Date().toISOString().split('T')[0],
    hora_limite: '00:00',
    obligatorio: 0,
    tipo: 'Atisa', // Valor por defecto válido ya que es requerido
    critico: 0
  }

  const [formData, setFormData] = useState<Omit<Hito, 'id' | 'habilitado'>>(initialFormState)

  useEffect(() => {
    if (show && hito) {
      setFormData({
        nombre: hito.nombre,
        descripcion: hito.descripcion,
        fecha_limite: hito.fecha_limite,
        hora_limite: hito.hora_limite,
        obligatorio: hito.obligatorio,
        tipo: hito.tipo,
        critico: hito.critico
      })
    } else {
      setFormData(initialFormState)
    }
  }, [show, hito])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Preparar los datos asegurando tipos correctos
    const dataToSave = {
      ...formData,
      descripcion: formData.descripcion?.trim() || null,
      hora_limite: formData.hora_limite || '00:00',
      habilitado: 1 // Siempre habilitado por defecto
    }

    onSave(dataToSave)
    setFormData(initialFormState)
    onHide()
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName='modal-dialog modal-dialog-centered mw-650px'
      style={{
        fontFamily: atisaStyles.fonts.secondary
      }}
    >
      <form onSubmit={handleSubmit}>
        <Modal.Header
          style={{
            backgroundColor: atisaStyles.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px 12px 0 0'
          }}
        >
          <Modal.Title
            style={{
              fontFamily: atisaStyles.fonts.primary,
              fontWeight: 'bold',
              color: 'white',
              fontSize: '1.5rem'
            }}
          >
            <i className="bi bi-flag-fill me-2"></i>
            {hito ? 'Editar' : 'Nuevo'} Hito
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
              className='form-control form-control-solid'
              placeholder='Nombre del hito'
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              maxLength={255}
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
              <i className="bi bi-diagram-3 me-2"></i>
              Tipo
            </label>
            <select
              className='form-select form-select-solid'
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
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
              <option value='Atisa'>Atisa</option>
              <option value='Cliente'>Cliente</option>
              <option value="Terceros">Terceros</option>
            </select>
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
              Fecha Límite
            </label>
            <input
              type='date'
              className='form-control form-control-solid'
              value={formData.fecha_limite}
              onChange={(e) => setFormData({ ...formData, fecha_limite: e.target.value })}
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

          <div className='fv-row mb-4'>
            <label
              className='fw-bold fs-6 mb-2'
              style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontSize: '16px'
              }}
            >
              <i className="bi bi-clock me-2"></i>
              Hora límite
            </label>
            <input
              type='time'
              className='form-control form-control-solid'
              value={formData.hora_limite || '00:00'}
              onChange={(e) => setFormData({ ...formData, hora_limite: e.target.value || '00:00' })}
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
              placeholder='Descripción del hito (opcional)'
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value || null })}
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

          <div className='fv-row mb-4'>
            <div className='form-check form-switch'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={formData.obligatorio === 1}
                onChange={(e) => setFormData({ ...formData, obligatorio: e.target.checked ? 1 : 0 })}
                id='obligatorio'
                style={{
                  width: '48px',
                  height: '24px'
                }}
              />
              <label
                className='form-check-label'
                htmlFor='obligatorio'
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  color: atisaStyles.colors.dark,
                  fontSize: '16px',
                  fontWeight: '600',
                  marginLeft: '8px'
                }}
              >
                <i className="bi bi-exclamation-triangle me-2"></i>
                Obligatorio
              </label>
            </div>
          </div>

          <div className='fv-row mb-4'>
            <div className='form-check form-switch'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={formData.critico === 1}
                onChange={(e) => setFormData({ ...formData, critico: e.target.checked ? 1 : 0 })}
                id='critico'
                style={{
                  width: '48px',
                  height: '24px'
                }}
              />
              <label
                className='form-check-label'
                htmlFor='critico'
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  color: atisaStyles.colors.dark,
                  fontSize: '16px',
                  fontWeight: '600',
                  marginLeft: '8px'
                }}
              >
                <i className="bi bi-exclamation-octagon me-2"></i>
                Crítico
              </label>
            </div>
          </div>
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
            {hito ? 'Actualizar' : 'Crear'}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

export default HitoModal
