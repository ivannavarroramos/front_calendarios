import React, { FC, ReactNode } from 'react'
import { atisaStyles } from '../../styles/atisaStyles'

interface PageHeaderProps {
    title: string
    subtitle?: string
    icon?: string
    actions?: ReactNode
    backButton?: ReactNode
    className?: string
}

const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, icon, actions, backButton, className = '' }) => {
    return (
        <div
            className={`d-flex align-items-center justify-content-between ${className}`}
            style={{
                backgroundColor: atisaStyles.colors.primary,
                color: 'white',
                padding: '24px 32px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 80, 92, 0.15)',
                width: '100%',
                marginBottom: '32px'
            }}
        >
            <div className="flex-grow-1 d-flex align-items-center">
                {backButton && (
                    <div className="me-4">
                        {backButton}
                    </div>
                )}
                {icon && (
                    <i
                        className={`bi bi-${icon} me-4`}
                        style={{ fontSize: '32px', color: 'white' }}
                    ></i>
                )}
                <div className="d-flex flex-column justify-content-center">
                    <h1
                        className="fw-bolder fs-2 m-0"
                        style={{
                            fontFamily: atisaStyles.fonts.primary,
                            color: 'white',
                            lineHeight: 1.2
                        }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <small
                            className="fs-7 fw-normal mt-1"
                            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                            {subtitle}
                        </small>
                    )}
                </div>
            </div>

            {actions && (
                <div className="d-flex align-items-center gap-3 ms-4">
                    {actions}
                </div>
            )}
        </div>
    )
}

export default PageHeader
