import {FC, useEffect, useState} from 'react'
import {Modal} from 'react-bootstrap'
import {Plantilla} from '../../../api/plantillas'
import { atisaStyles } from '../../../styles/atisaStyles'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (plantilla: Omit<Plantilla, 'id'>) => void
  plantilla: Plantilla | null
}

const PlantillaModal: FC<Props> = ({show, onHide, onSave, plantilla}) => {
  const [formData, setFormData] = useState<Omit<Plantilla, 'id'>>({
    nombre: '',
    descripcion: null
  })

  useEffect(() => {
    if (plantilla) {
      setFormData({
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: null
      })
    }
  }, [plantilla, show])

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName='modal-dialog modal-dialog-centered mw-650px'
      style={{
        fontFamily: atisaStyles.fonts.secondary
      }}
    >
      <form
        onSubmit={e => {
          e.preventDefault()
          onSave({
            ...formData,
            descripcion: formData.descripcion ?? '' // Siempre enviar string
          })
        }}
      >
        <Modal.Header
          style={{
            backgroundColor: atisaStyles.colors.primary,
            color: 'white',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            padding: '20px 24px'
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
            <i
              className="bi bi-file-earmark-text"
              style={{
                fontSize: '24px',
                color: 'white'
              }}
            ></i>
            {plantilla ? 'Editar' : 'Nueva'} Plantilla
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
            padding: '32px 24px',
            borderRadius: '0 0 12px 12px'
          }}
        >
          <div
            className='fv-row mb-7'
            style={{ marginBottom: '24px' }}
          >
            <label
              className='required fw-bold fs-6 mb-2'
              style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="bi bi-tag" style={{ fontSize: '14px', color: atisaStyles.colors.accent }}></i>
              Nombre
              <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type='text'
              className='form-control form-control-solid'
              placeholder='Nombre de la plantilla'
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              required
              maxLength={255}
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                fontSize: '14px',
                padding: '12px 16px',
                border: `2px solid ${atisaStyles.colors.light}`,
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                backgroundColor: 'white'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = atisaStyles.colors.accent
                e.target.style.boxShadow = `0 0 0 3px ${atisaStyles.colors.accent}20`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = atisaStyles.colors.light
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div
            className='fv-row mb-7'
            style={{ marginBottom: '24px' }}
          >
            <label
              className='fw-bold fs-6 mb-2'
              style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="bi bi-file-text" style={{ fontSize: '14px', color: atisaStyles.colors.accent }}></i>
              Descripción
            </label>
            <textarea
              className='form-control form-control-solid'
              placeholder='Descripción de la plantilla'
              rows={3}
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value || null})}
              maxLength={255}
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                fontSize: '14px',
                padding: '12px 16px',
                border: `2px solid ${atisaStyles.colors.light}`,
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                backgroundColor: 'white',
                resize: 'vertical'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = atisaStyles.colors.accent
                e.target.style.boxShadow = `0 0 0 3px ${atisaStyles.colors.accent}20`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = atisaStyles.colors.light
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
        </Modal.Body>

        <Modal.Footer
          style={{
            backgroundColor: '#f8f9fa',
            border: 'none',
            padding: '20px 24px',
            borderRadius: '0 0 12px 12px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
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
            <i className="bi bi-x-circle me-2" style={{ fontSize: '14px', color: atisaStyles.colors.dark }}></i>
            Cancelar
          </button>
          <button
            type='submit'
            className='btn'
            style={{
              backgroundColor: atisaStyles.colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              padding: '10px 20px',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(156, 186, 57, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 161, 222, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 186, 57, 0.3)'
            }}
          >
            <i
              className={`bi ${plantilla ? 'bi-check-circle' : 'bi-plus-circle'} me-2`}
              style={{ fontSize: '14px', color: 'white' }}
            ></i>
            {plantilla ? 'Actualizar' : 'Crear'}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

export default PlantillaModal
