import { useState } from 'react'
import * as Yup from 'yup'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import { login } from '../core/_requests'
import { useAuth } from '../core/Auth'

// ATISA UI Kit
import { Button, Input, FormSection, FormField } from '../../../../../atisa/AtisaComponents'
import { atisaStyles } from '../../../styles/atisaStyles'

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Formato de email incorrecto')
    .min(3, 'Mínimo 3 símbolos')
    .max(50, 'Máximo 50 símbolos')
    .required('El Email es obligatorio'),
  password: Yup.string()
    .min(3, 'Mínimo 3 símbolos')
    .max(50, 'Máximo 50 símbolos')
    .required('La contraseña es obligatoria'),
})

const initialValues = {
  email: 'admin@demo.com',
  password: 'demo',
}

export function Login() {
  const [loading, setLoading] = useState(false)
  const { saveAuth } = useAuth()

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true)
      try {
        const { data: auth } = await login(values.email, values.password)
        saveAuth(auth)
      } catch (error) {
        console.error(error)
        saveAuth(undefined)
        setStatus('Las credenciales ingresadas son incorrectas')
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  return (
    <form
      className='form w-100'
      onSubmit={formik.handleSubmit}
      noValidate
      id='kt_login_signin_form'
    >
      <div className='text-center mb-4'>
        <h1 className='fw-black mb-3 text-uppercase' style={{ color: 'var(--atisa-dark)', fontFamily: 'var(--font-headings)' }}>
          Iniciar Sesión
        </h1>
      </div>

      {formik.status ? (
        <div className='mb-4 alert alert-danger small fw-bold py-2 px-3 border-0' style={{ borderRadius: 'var(--radius-md)' }}>
          {formik.status}
        </div>
      ) : null}

      <FormSection>
        {/* begin::Form group */}
        <FormField label="Email" className="mb-3" required error={(formik.touched.email && formik.errors.email) || null}>
          <Input
            placeholder='Introduce tu correo'
            {...formik.getFieldProps('email')}
            type='email'
            name='email'
            autoComplete='off'
            icon="fa-regular fa-envelope"
            error={(formik.touched.email && formik.errors.email) || null}
          />
        </FormField>
        {/* end::Form group */}

        {/* begin::Form group */}
        <FormField label="Contraseña" className="mb-4" required error={(formik.touched.password && formik.errors.password) || null}>
          <Input
            type='password'
            autoComplete='off'
            {...formik.getFieldProps('password')}
            placeholder="********"
            icon="fa-solid fa-lock"
            error={(formik.touched.password && formik.errors.password) || null}
          />
        </FormField>
        {/* end::Form group */}

        <div className='d-flex flex-stack flex-wrap gap-3 fs-base fw-medium mb-4'>
          <div />
          <Link to='/auth/forgot-password' style={{ color: 'var(--atisa-primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* begin::Action */}
        <div className='d-grid mb-3 mt-4'>
          <Button
            type='submit'
            variant="primary"
            size="lg"
            disabled={formik.isSubmitting || !formik.isValid}
            icon={loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
          >
            {loading ? 'Verificando...' : 'Acceder'}
          </Button>
        </div>
        {/* end::Action */}

        <div className='text-muted text-center fw-medium mt-4' style={{ fontSize: '0.8rem' }}>
          ¿Aún no eres miembro?{' '}
          <Link to='/auth/registration' style={{ color: 'var(--atisa-accent)', textDecoration: 'none', fontWeight: 900 }}>
            Regístrate
          </Link>
        </div>
      </FormSection>
    </form>
  )
}
