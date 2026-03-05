import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/auth';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../modules/auth/core/Auth';
import { atisaStyles } from '../styles/atisaStyles';
import { SSO_LOGIN_URL, getSSOLoginUrl } from '../modules/auth/core/_requests';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const { saveAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Usar authService que ahora está unificado con el sistema de Metronic
      const response = await authService.login(username, apiKey);

      saveAuth({
        api_token: response.access_token,
        refreshToken: response.refresh_token
      });

      setSuccess('Login exitoso');
      navigate('/clientes-documental-calendario');
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError('Error al iniciar sesión');
    }
  };



  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounceSubtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
        `}
      </style>
      <div
        className="container-fluid h-screen p-5 overflow-hidden"
        style={{
          fontFamily: atisaStyles.fonts.secondary,
          background: `linear-gradient(135deg, ${atisaStyles.colors.light} 0%, #f8f9fa 50%, ${atisaStyles.colors.light} 100%)`,
          minHeight: '100vh'
        }}
      >
        <div className="row justify-content-center h-100">
          <div className="col-md-5 col-lg-4 col-xl-3 flex flex-col justify-center h-full">
            <div
              className="relative overflow-hidden"
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 80, 92, 0.15)',
                border: `2px solid ${atisaStyles.colors.light}`,
                padding: '40px 32px',
                animation: 'fadeIn 0.6s ease-out'
              }}
            >
              {/* Header con logo según guía técnica */}
              <div
                className="text-center mb-8 pb-6"
                style={{
                  paddingBottom: '24px'
                }}
              >
                <img
                  src="/Atisa_logo+tagline_color_positivo_RGB_300 (1).png"
                  alt="ATISA Logo"
                  style={{
                    width: '100%',
                    maxWidth: '240px',
                    height: 'auto',
                    margin: '0 auto',
                    display: 'block'
                  }}
                />
                <p
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: atisaStyles.colors.dark,
                    margin: '16px 0 0 0',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    opacity: 0.8
                  }}
                >
                  Gestión Calendario / Documental
                </p>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    color: '#721c24',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <i className="bi bi-exclamation-triangle me-2" style={{ fontSize: '18px', color: '#721c24' }}></i>
                  {error}
                </div>
              )}
              {success && (
                <div
                  style={{
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    color: '#155724',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <i className="bi bi-check-circle me-2" style={{ fontSize: '18px', color: '#155724' }}></i>
                  {success}
                </div>
              )}

              <Form onSubmit={handleLogin}>
                <Form.Group style={{ marginBottom: '24px' }}>
                  <Form.Label
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      color: atisaStyles.colors.primary,
                      fontWeight: 'bold',
                      fontSize: '14px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <i
                      className="bi bi-person me-2"
                      style={{
                        fontSize: '16px',
                        color: atisaStyles.colors.primary
                      }}
                    ></i>
                    Usuario
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Ingrese su nombre de usuario"
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      padding: '12px 16px',
                      height: '48px',
                      border: `2px solid ${atisaStyles.colors.light}`,
                      borderRadius: '12px',
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
                </Form.Group>

                <Form.Group style={{ marginBottom: '32px' }}>
                  <Form.Label
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      color: atisaStyles.colors.primary,
                      fontWeight: 'bold',
                      fontSize: '14px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <i
                      className="bi bi-key me-2"
                      style={{
                        fontSize: '16px',
                        color: atisaStyles.colors.primary
                      }}
                    ></i>
                    API Key
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    placeholder="Ingrese su clave API"
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      padding: '12px 16px',
                      height: '48px',
                      border: `2px solid ${atisaStyles.colors.light}`,
                      borderRadius: '12px',
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
                </Form.Group>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const { data } = await getSSOLoginUrl();
                        if (data.auth_url) {
                          window.location.href = data.auth_url;
                        }
                      } catch (err) {
                        console.error('Error fetching SSO URL:', err);
                        setError('No se pudo iniciar el flujo de SSO');
                      }
                    }}
                    style={{
                      backgroundColor: '#00505C',
                      border: 'none',
                      borderRadius: '12px',
                      height: '48px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      fontSize: '16px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(0, 80, 92, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 80, 92, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 80, 92, 0.3)'
                    }}
                  >
                    <i
                      className="bi bi-microsoft me-2"
                      style={{ fontSize: '18px', color: 'white' }}
                    ></i>
                    Iniciar sesión con Microsoft (SSO)
                  </Button>

                  <div className='separator separator-content my-4 text-center'>
                    <span className='w-150px text-gray-500 fw-semibold fs-7'>o con credenciales</span>
                  </div>

                  <Button
                    type="submit"
                    style={{
                      backgroundColor: atisaStyles.colors.secondary,
                      border: 'none',
                      borderRadius: '12px',
                      height: '48px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      fontSize: '16px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(156, 186, 57, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 161, 222, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(156, 186, 57, 0.3)'
                    }}
                  >
                    <i
                      className="bi bi-box-arrow-in-right me-2"
                      style={{ fontSize: '18px', color: 'white' }}
                    ></i>
                    Iniciar Sesión
                  </Button>

                </div>
              </Form>
            </div>
          </div>
        </div>


      </div>
    </>
  );
};
