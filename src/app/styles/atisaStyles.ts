export const atisaStyles = {
  colors: {
    primary: '#00505C',      // Verde oscuro (Corporativo Principal)
    secondary: '#9CBA39',    // Verde claro (Corporativo)
    accent: '#00A1DE',       // Azul (Corporativo)
    white: '#FFFFFF',        // Blanco
    danger: '#DC2626',       // Rojo (Semántica)
    error: '#DC2626',        // Alias para semántica
    warning: '#F59E0B',      // Ámbar (Semántica)
    info: '#00A1DE',         // Azul (Semántica)
    success: '#9CBA39',      // Verde (Semántica)
    background: '#F0F4F7',   // Fondo neutro
    dark: '#00505C',         // Consistent with primary
    light: '#FFFFFF',        // Consistent with white
  },
  fonts: {
    primary: 'Aleo, Georgia, serif',
    secondary: 'Lato, Arial, sans-serif',
  },
  toast: {
    success: {
      background: '#9CBA39',
      borderLeft: '#7AB800',
      textColor: '#ffffff',
      iconColor: '#00505C',
    },
    error: {
      background: '#D9214E',
      borderLeft: '#B11B40',
      textColor: '#ffffff',
      iconColor: '#ffffff',
    },
    warning: {
      background: '#F1E800',
      borderLeft: '#d4d000',
      textColor: '#00505C',
      iconColor: '#00505C',
    },
    info: {
      background: '#00A1DE',
      borderLeft: '#0065BD',
      textColor: '#ffffff',
      iconColor: '#ffffff',
    },
  }
}

// Función para obtener estilos de botón primario
export const getPrimaryButtonStyles = (isHovered: boolean = false) => ({
  backgroundColor: isHovered ? atisaStyles.colors.accent : atisaStyles.colors.secondary,
  border: `2px solid ${isHovered ? atisaStyles.colors.accent : atisaStyles.colors.secondary}`,
  color: 'white',
  fontFamily: atisaStyles.fonts.secondary,
  fontWeight: '600',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  cursor: 'pointer'
})

// Función para obtener estilos de botón secundario
export const getSecondaryButtonStyles = (isHovered: boolean = false) => ({
  backgroundColor: 'transparent',
  border: `2px solid ${isHovered ? atisaStyles.colors.primary : 'white'}`,
  color: isHovered ? atisaStyles.colors.primary : 'white',
  fontFamily: atisaStyles.fonts.secondary,
  fontWeight: '600',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  cursor: 'pointer'
})

// Función para obtener estilos de header de tabla
export const getTableHeaderStyles = () => ({
  backgroundColor: atisaStyles.colors.light,
  color: atisaStyles.colors.primary,
  fontFamily: atisaStyles.fonts.primary,
  fontWeight: 'bold',
  padding: '16px 8px',
  borderBottom: `3px solid ${atisaStyles.colors.primary}`,
  borderLeft: 'none',
  borderRight: 'none'
})

// Función para obtener estilos de celda de tabla
export const getTableCellStyles = () => ({
  padding: '12px 8px',
  color: atisaStyles.colors.dark,
  borderBottom: `1px solid ${atisaStyles.colors.light}`,
  borderLeft: 'none',
  borderRight: 'none',
  fontFamily: atisaStyles.fonts.secondary
})

// Función para obtener estilos de badge
export const getBadgeStyles = (isSuccess: boolean) => ({
  backgroundColor: isSuccess ? atisaStyles.colors.secondary : atisaStyles.colors.accent,
  color: 'white',
  fontFamily: atisaStyles.fonts.secondary,
  fontWeight: '600',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '12px'
})

// Función para obtener estilos de dropdown
export const getDropdownStyles = () => ({
  backgroundColor: 'white',
  border: `2px solid ${atisaStyles.colors.light}`,
  borderRadius: '8px',
  boxShadow: '0 8px 25px rgba(0, 80, 92, 0.3)',
  zIndex: 99999,
  minWidth: '160px',
  maxWidth: '200px'
})

// Función para obtener estilos de botón de acciones
export const getActionsButtonStyles = (isHovered: boolean = false) => ({
  backgroundColor: isHovered ? atisaStyles.colors.accent : atisaStyles.colors.primary,
  border: `2px solid ${isHovered ? atisaStyles.colors.accent : atisaStyles.colors.primary}`,
  color: 'white',
  fontFamily: atisaStyles.fonts.secondary,
  fontWeight: '600',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '12px',
  transition: 'all 0.3s ease',
  cursor: 'pointer'
})
