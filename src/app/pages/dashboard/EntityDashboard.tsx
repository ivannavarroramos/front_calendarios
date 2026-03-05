// src/app/pages/dashboard/EntityDashboard.js

import React from 'react';
import { Link } from 'react-router-dom';
import { atisaStyles } from '../../styles/atisaStyles';

const entities = [
  { name: 'Hitos', route: '/hitos', icon: 'flag' },
  { name: 'Procesos', route: '/procesos', icon: 'flow' },
  { name: 'Plantillas', route: '/plantillas', icon: 'copy' },
  { name: 'Clientes', route: '/clientes', icon: 'user' },
  { name: 'Metadatos', route: '/metadatos', icon: 'gear' }
];

const EntityDashboard = () => {
  return (
    <div>
      <div
        className="row g-5 g-xl-8"
        style={{
          fontFamily: atisaStyles.fonts.secondary
        }}
      >
        {entities.map((entity, index) => (
          <div className="col-xl-3" key={index}>
            <Link
              to={entity.route}
              className="card hoverable"
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                border: `1px solid ${atisaStyles.colors.light}`,
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 80, 92, 0.2)'
                e.currentTarget.style.borderColor = atisaStyles.colors.secondary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 80, 92, 0.1)'
                e.currentTarget.style.borderColor = atisaStyles.colors.light
              }}
            >
              <div
                className="card-body d-flex flex-column"
                style={{
                  padding: '24px',
                  height: '100%'
                }}
              >
                <div
                  className="d-flex align-items-center mb-3"
                  style={{
                    marginBottom: '16px'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: atisaStyles.colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px',
                      boxShadow: '0 4px 12px rgba(0, 80, 92, 0.2)'
                    }}
                  >
                    <i
                      className={`bi bi-${entity.icon === 'flag' ? 'flag' :
                        entity.icon === 'flow' ? 'diagram-3' :
                          entity.icon === 'copy' ? 'file-earmark-text' :
                            entity.icon === 'user' ? 'people' : 'flag'}`}
                      style={{
                        fontSize: '24px',
                        color: 'white'
                      }}
                    ></i>
                  </div>
                  <h3
                    className="text-dark"
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      color: atisaStyles.colors.primary,
                      fontWeight: 'bold',
                      fontSize: '1.5rem',
                      margin: 0
                    }}
                  >
                    {entity.name}
                  </h3>
                </div>
                <p
                  className="text-muted"
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: atisaStyles.colors.dark,
                    fontSize: '14px',
                    margin: 0,
                    lineHeight: '1.5'
                  }}
                >
                  Gestionar {entity.name.toLowerCase()}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EntityDashboard;
