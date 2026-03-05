import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from "react-dom";

/**
 * ATISA UI KIT - REACT PREMIUM LIBRARY (v1.5.0) - COMPACT EDITION
 * Re-diseñado para alta densidad de información en sistemas de nóminas.
 */

const cls = (...classes) => classes.filter(Boolean).join(' ');

// --- 1. BOTONES (Button & ButtonGroup) ---
export const Button = ({ variant = 'primary', size = 'md', children, className = '', icon, outline = false, ...props }) => {
    const compactStyles = {
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        fontSize: size === 'sm' ? '0.75rem' : size === 'lg' ? '1rem' : '0.825rem',
        padding: size === 'md' ? '0.45rem 1rem' : size === 'sm' ? '0.25rem 0.65rem' : '0.75rem 1.75rem',
        minHeight: size === 'sm' ? '28px' : size === 'md' ? '36px' : '44px'
    };

    const vClass = outline ? `btn-outline-${variant}` : `btn-${variant}`;

    const inlineBg = (variant === 'primary' && !outline) ? { backgroundColor: 'var(--atisa-accent)', border: 'none', color: 'white' } : {};
    const inlineAccent = (variant === 'secondary' && !outline) ? { backgroundColor: 'var(--atisa-primary)', border: 'none', color: 'white' } : {};

    return (
        <button
            className={cls('btn', vClass, className)}
            style={{ ...compactStyles, ...inlineBg, ...inlineAccent }}
            {...props}
        >
            {icon && <span style={{ fontSize: '0.85em' }}>{icon}</span>}
            {children}
        </button>
    );
};

// --- 2. FORMULARIOS (Inputs, Checkbox, Radio, Switches, Selects) ---

/**
 * FormSection: Sección estándar de formulario con borde azul corporativo y título.
 * USAR EN TODOS LOS FORMULARIOS para garantizar consistencia visual.
 */
export const FormSection = ({ title, icon, children, ...props }) => (
    <div className="card border-0 shadow-sm p-3 mb-0" style={{ borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--atisa-primary)' }} {...props}>
        {(title || icon) && (
            <p className="fw-black text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--atisa-primary)', margin: 0 }}>
                {icon && <i className={cls(icon, 'me-1')}></i>}
                {title}
            </p>
        )}
        {children}
    </div>
);

/**
 * FormInfoBanner: Banner informativo estándar en formularios.
 */
export const FormInfoBanner = ({ children, variant = 'info', ...props }) => {
    const colors = {
        info: { bg: 'rgba(0, 161, 222, 0.07)', color: 'var(--atisa-primary)' },
        warning: { bg: 'rgba(255, 193, 7, 0.1)', color: 'var(--atisa-warning)' },
        success: { bg: 'rgba(156, 186, 57, 0.1)', color: 'var(--atisa-dark)' },
        danger: { bg: 'rgba(220, 53, 69, 0.08)', color: 'var(--atisa-danger)' },
    };
    const { bg, color } = colors[variant] || colors.info;
    return (
        <div className="d-flex align-items-center gap-2 py-2 px-3 small mb-0"
            style={{ backgroundColor: bg, color, borderRadius: 'var(--radius-md)', fontWeight: 600 }} {...props}>
            <i className="fa-solid fa-circle-info flex-shrink-0"></i>
            <span>{children}</span>
        </div>
    );
};

export const FormField = ({ label, required = false, error = null, children, className = '' }) => (
    <div className={cls('mb-2', className)}>
        {label && (
            <label className={cls('form-label d-block mb-1', required && 'required')} style={{ fontWeight: 700, color: 'var(--atisa-dark)', fontSize: '0.8rem' }}>
                {label}
            </label>
        )}
        {children}
        {error && <div className="text-danger mt-1 fw-bold" style={{ fontSize: '0.7rem' }}>{error}</div>}
    </div>
);

export const Input = ({ icon, error = null, ...props }) => (
    <div className="position-relative">
        {icon && (
            <i
                className={cls(icon, 'position-absolute')}
                style={{
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--atisa-primary)',
                    zIndex: 5,
                    fontSize: '0.85rem'
                }}
            ></i>
        )}
        <input
            className={cls('form-control shadow-none', error && 'is-invalid')}
            style={{
                paddingLeft: icon ? '2.25rem' : '0.75rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--atisa-border)',
                height: '34px', /* Compact height for forms */
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem'
            }}
            {...props}
        />
    </div>
);

export const Select = ({ options = [], icon, ...props }) => (
    <div className="position-relative">
        {icon && (
            <i
                className={cls(icon, 'position-absolute')}
                style={{
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--atisa-primary)',
                    zIndex: 5,
                    fontSize: '0.85rem'
                }}
            ></i>
        )}
        <select
            className="form-select shadow-none"
            style={{
                paddingLeft: icon ? '2.25rem' : '0.75rem',
                backgroundColor: '#F8FAFC',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--atisa-border)',
                fontSize: '0.825rem'
            }}
            {...props}
        >
            {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export const Checkbox = ({ label, id, className = '', ...props }) => (
    <div className={cls('form-check d-flex align-items-center gap-2', className)}>
        <input
            className="form-check-input"
            type="checkbox"
            id={id}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer', marginTop: 0 }}
            {...props}
        />
        {label && (
            <label
                className="form-check-label fw-bold text-dark mb-0"
                htmlFor={id}
                style={{ fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
            >
                {label}
            </label>
        )}
    </div>
);

// --- 3. SEARCHABLE SELECT (SENIOR COMPACT) ---
export const SearchableSelect = ({ label, options = [], value, onChange, placeholder = "Seleccionar...", searchPlaceholder = "Buscar...", error, disabled = false, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [pos, setPos] = useState({});
    const ref = useRef(null);
    const dropRef = useRef(null);

    const selected = options.find(o => o.value === value);
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.description && o.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const updatePos = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({ top: rect.bottom + window.scrollY + 2, left: rect.left, width: rect.width });
        }
    };

    const handleToggle = () => {
        if (disabled) return;
        updatePos();
        setIsOpen(!isOpen);
        if (!isOpen) setSearchTerm("");
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && !ref.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <FormField label={label} error={error} className={className}>
            <div className="position-relative w-100" ref={ref}>
                <button
                    type="button"
                    className={cls("form-control d-flex align-items-center justify-content-between shadow-none", error && "is-invalid")}
                    style={{
                        backgroundColor: '#F8FAFC',
                        height: '34px',
                        textAlign: 'left',
                        border: isOpen ? '1px solid var(--atisa-primary)' : '1px solid var(--atisa-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.825rem',
                        padding: '0 0.75rem'
                    }}
                    onClick={handleToggle}
                    disabled={disabled}
                >
                    <div className="overflow-hidden">
                        {selected ? (
                            <span className="fw-bold">{selected.label}</span>
                        ) : (
                            <span className="text-muted">{placeholder}</span>
                        )}
                    </div>
                    <i className={cls("fa-solid fa-chevron-down opacity-50 transition-all", isOpen && "rotate-180")} style={{ fontSize: '0.7rem' }}></i>
                </button>

                {isOpen && createPortal(
                    <div
                        ref={dropRef}
                        className="bg-white border shadow-lg overflow-hidden animate-fade-in"
                        style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, borderRadius: 'var(--radius-md)' }}
                    >
                        <div className="p-1 border-bottom">
                            <input
                                autoFocus
                                className="form-control form-control-sm border-0 bg-light shadow-none"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ fontSize: '0.75rem' }}
                            />
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filtered.length === 0 ? (
                                <div className="p-2 text-center text-muted small">Sin resultados</div>
                            ) : (
                                filtered.map((o, i) => (
                                    <button
                                        key={o.value}
                                        type="button"
                                        className={cls("w-100 border-0 p-2 text-start transition-all", o.value === value ? "bg-light" : "bg-white")}
                                        style={{ borderBottom: '1px solid var(--atisa-border)' }}
                                        onClick={() => { onChange(o.value); setIsOpen(false); }}
                                    >
                                        <div className="fw-bold" style={{ fontSize: '0.75rem', color: o.value === value ? 'var(--atisa-primary)' : 'var(--atisa-dark)' }}>{o.label}</div>
                                        {o.description && <div className="small text-muted text-truncate" style={{ fontSize: '0.65rem' }}>{o.description}</div>}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </FormField>
    );
};

// --- 4. TABLAS Y DATATABLES (ULTRA COMPACT SENIOR) ---
export const DataTable = ({ columns = [], data = [], onAction, title, actions, footer, extraRowActions, ...props }) => (
    <div className="card shadow-sm border-0 bg-white" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', borderTop: '4px solid var(--atisa-primary)' }} {...props}>
        {(title || actions) && (
            <div className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid var(--atisa-border)' }}>
                <h5 className="m-0 fw-black" style={{ fontFamily: 'var(--font-headings)', color: 'var(--atisa-dark)' }}>{title}</h5>
                <div className="d-flex gap-2">{actions}</div>
            </div>
        )}
        <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ tableLayout: 'auto' }}>
                <thead className="bg-light">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} className="py-2 px-3 border-bottom-0 text-uppercase small fw-black text-muted-50" style={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                                {col.label}
                            </th>
                        ))}
                        {onAction && <th className="py-2 px-3 border-bottom-0 text-end text-uppercase small fw-black text-muted-50" style={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>ACCIONES</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr><td colSpan={columns.length + (onAction ? 1 : 0)} className="py-4 text-center text-muted small">No se encontraron registros.</td></tr>
                    ) : data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-bottom border-light">
                            {columns.map((col, colIndex) => (
                                <td key={colIndex} className="py-1 px-3 fw-medium text-dark" style={{ fontSize: '0.775rem' }}>
                                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                                </td>
                            ))}
                            {onAction && (
                                <td className="py-1 px-3 text-end">
                                    <div className="d-flex justify-content-end gap-1">
                                        {extraRowActions && extraRowActions(row)}
                                        <button className="btn-icon" title="Editar" onClick={() => onAction('edit', row)}><i className="fa-solid fa-pen" style={{ color: 'var(--atisa-primary)' }}></i></button>
                                        <button className="btn-icon" title="Eliminar" onClick={() => onAction('delete', row)}><i className="fa-solid fa-trash text-danger"></i></button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {footer && <div className="card-footer bg-white py-2 px-3 border-top" style={{ borderTop: '1px solid var(--atisa-border)', fontSize: '0.75rem' }}>{footer}</div>}
    </div>
);

// --- 4b. PAGINACIÓN ATISA ---
export const Pagination = ({ currentPage, totalPages, onPageChange, disabled = false, totalItems, pageSize }) => {
    if (!totalPages || totalPages <= 1) return null;

    const getPages = () => {
        const delta = 2;
        const range = [];
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }
        if (currentPage - delta > 2) range.unshift('...');
        if (currentPage + delta < totalPages - 1) range.push('...');
        range.unshift(1);
        if (totalPages > 1) range.push(totalPages);
        return range;
    };

    const btnStyle = (active) => ({
        minWidth: '28px', height: '28px', borderRadius: 'var(--radius-md)',
        border: active ? 'none' : '1px solid var(--atisa-border)',
        backgroundColor: active ? 'var(--atisa-primary)' : '#F8FAFC',
        color: active ? '#fff' : 'var(--atisa-dark)',
        fontWeight: active ? 700 : 500,
        fontSize: '0.7rem', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease', opacity: disabled ? 0.5 : 1,
        padding: '0 0.35rem',
    });

    return (
        <div className="d-flex align-items-center justify-content-between w-100">
            <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>
                Página {currentPage} de {totalPages}
                {totalItems != null && pageSize != null && ` · ${totalItems} registros`}
            </span>
            <div className="d-flex gap-1 align-items-center">
                <button style={btnStyle(false)} onClick={() => onPageChange(currentPage - 1)} disabled={disabled || currentPage === 1} title="Anterior">
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.6rem' }}></i>
                </button>
                {getPages().map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} style={{ fontSize: '0.7rem', color: 'var(--atisa-muted)', padding: '0 0.25rem' }}>…</span>
                    ) : (
                        <button key={p} style={btnStyle(p === currentPage)} onClick={() => onPageChange(p)} disabled={disabled}>
                            {p}
                        </button>
                    )
                )}
                <button style={btnStyle(false)} onClick={() => onPageChange(currentPage + 1)} disabled={disabled || currentPage === totalPages} title="Siguiente">
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.6rem' }}></i>
                </button>
            </div>
        </div>
    );
};

// --- 4c. EMPTY STATE ATISA ---
export const EmptyState = ({ message = 'No hay registros disponibles.', icon = 'fa-solid fa-inbox', children }) => (
    <div className="text-center py-5 text-muted">
        <i className={cls(icon, 'mb-3 opacity-25')} style={{ fontSize: '2.5rem', display: 'block' }}></i>
        <p className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>{message}</p>
        {children && <div style={{ fontSize: '0.75rem' }}>{children}</div>}
    </div>
);

// --- 5. MODALES (Compact Space) ---
export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', ...props }) => {
    if (!isOpen) return null;
    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 1055 }}>
            <div className={`modal-dialog modal-dialog-centered modal-${size}`} {...props}>
                <div className="modal-content border-0 shadow-lg border-top border-accent border-4" style={{ borderRadius: 'var(--radius-lg)' }}>
                    <div className="modal-header py-2 px-3" style={{ borderBottom: '1px solid var(--atisa-border)' }}>
                        <h6 className="modal-title m-0 fw-black" style={{ fontFamily: 'var(--font-headings)', color: 'var(--atisa-dark)' }}>{title}</h6>
                        <button type="button" className="btn-close shadow-none" style={{ width: '0.5em', height: '0.5em', fontSize: '0.75rem' }} onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-3 bg-white">
                        {children}
                    </div>
                    {footer && (
                        <div className="modal-footer bg-light py-2 px-3" style={{ borderTop: '1px solid var(--atisa-border)' }}>
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 6. BADGES (Micro-Badge) ---
export const Badge = ({ children, variant = 'primary' }) => {
    const config = {
        primary: { bg: 'rgba(0, 161, 222, 0.1)', color: 'var(--atisa-primary)' },
        success: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--atisa-success)' },
        warning: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--atisa-warning)' },
        danger: { bg: 'rgba(220, 38, 38, 0.1)', color: 'var(--atisa-danger)' }
    }[variant] || { bg: '#eee', color: '#666' };

    return (
        <span className="badge px-2 py-1 fw-bold" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '4px', fontSize: '0.625rem' }}>
            {children}
        </span>
    );
};

// --- 7. CALENDAR VIEW (REUSABLE ATISA CALENDAR) ---
export const CalendarView = ({
    year,
    month,
    fechas = [],
    onDateSelect,
    onDeleteFecha,
    showAnnualView,
    onPrevMonth,
    onNextMonth,
    onPrevYear,
    onNextYear,
    onToggleView
}) => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const generateDays = (y, m) => {
        const firstDay = new Date(y, m, 1);
        const firstDayOfWeek = firstDay.getDay(); // 0 = Sun
        const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - daysToSubtract);

        const days = [];
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);

            // Evitar problemas de timezone ajustando explícitamente el YYYY-MM-DD local
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

            const isCurrentMonth = currentDate.getMonth() === m;
            const isToday = currentDate.toDateString() === new Date().toDateString();
            const holiday = fechas.find(f => f.fecha === dateStr);

            days.push({
                date: currentDate,
                isCurrentMonth,
                isToday,
                isHoliday: !!holiday,
                holidayData: holiday || null
            });
        }
        return days;
    };

    const renderDayClasses = (day, small = false) => {
        const base = small ? 'calendar-day-compact-small' : 'calendar-day';
        const classes = [base];
        if (!day.isCurrentMonth) classes.push('other-month');
        if (day.isToday) classes.push('today');
        if (day.isHoliday) {
            classes.push('holiday');
            if (day.holidayData.isFromPadre) classes.push('holiday-from-padre');
            else if (day.holidayData.isFromCcaa) classes.push('holiday-from-ccaa');
            else if (day.holidayData.isFromLocal) classes.push('holiday-from-local');
        }
        return classes.join(' ');
    };

    const handleDayClick = (day) => {
        if (!day.isCurrentMonth) return;
        if (onDateSelect) onDateSelect(day.date);
    };

    const handleDelete = (e, day) => {
        e.stopPropagation();
        if (onDeleteFecha && day.holidayData && day.holidayData.id) {
            onDeleteFecha(day.holidayData);
        }
    };

    return (
        <div className="calendar-wrapper">
            {/* Header / Controles */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2">
                    <Button variant="light" size="sm" onClick={onPrevMonth} disabled={showAnnualView}>
                        <i className="fa-solid fa-chevron-left"></i>
                    </Button>
                    <span className="fw-bold" style={{ minWidth: '100px', textAlign: 'center', fontSize: '1.1rem' }}>
                        {monthNames[month]}
                    </span>
                    <Button variant="light" size="sm" onClick={onNextMonth} disabled={showAnnualView}>
                        <i className="fa-solid fa-chevron-right"></i>
                    </Button>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <Button variant="light" size="sm" onClick={onPrevYear}>
                        <i className="fa-solid fa-minus"></i>
                    </Button>
                    <span className="fw-black mx-2 text-primary" style={{ fontSize: '1.25rem' }}>
                        {year}
                    </span>
                    <Button variant="light" size="sm" onClick={onNextYear}>
                        <i className="fa-solid fa-plus"></i>
                    </Button>
                </div>

                <div className="view-toggle">
                    <Button
                        type="button"
                        variant={showAnnualView ? "primary" : "light"}
                        onClick={onToggleView}
                        size="sm"
                        icon={<i className="fa-solid fa-calendar"></i>}
                    >
                        {showAnnualView ? "Vista Mensual" : "Vista Anual"}
                    </Button>
                </div>
            </div>

            {/* Calendario Contenedor Principal */}
            <div className="calendar-container">
                {!showAnnualView ? (
                    <div className="calendar-grid">
                        <div className="weekdays">
                            {weekDays.map(day => (
                                <div key={day} className="weekday">{day}</div>
                            ))}
                        </div>
                        <div className="days-grid">
                            {generateDays(year, month).map((day, idx) => (
                                <div
                                    key={`day-${idx}`}
                                    className={renderDayClasses(day, false)}
                                    onClick={() => handleDayClick(day)}
                                    title={day.isHoliday ? day.holidayData.nombre : ''}
                                >
                                    <div className="day-number">{day.date.getDate()}</div>
                                    {day.isHoliday && (
                                        <>
                                            <div
                                                className={`holiday-indicator ${(!day.holidayData.isFromPadre && !day.holidayData.isFromCcaa) ? 'delete-icon' : ''}`}
                                                onClick={(e) => {
                                                    if (!day.holidayData.isFromPadre && !day.holidayData.isFromCcaa) handleDelete(e, day);
                                                }}
                                                title={day.holidayData.isFromPadre ? "Principal" : day.holidayData.isFromCcaa ? "CCAA" : "Eliminar"}
                                            >
                                                {day.holidayData.isFromPadre || day.holidayData.isFromCcaa ? '📅' : '🗑️'}
                                            </div>
                                            <div className="holiday-name">{day.holidayData.nombre}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="annual-calendar-container">
                        <div className="annual-calendar-grid">
                            {Array.from({ length: 12 }, (_, mIdx) => {
                                const mDays = generateDays(year, mIdx);
                                return (
                                    <div key={mIdx} className="month-calendar-compact">
                                        <h4 className="month-title-compact">{monthNames[mIdx]}</h4>
                                        <div className="weekdays-compact-small">
                                            {weekDays.map(day => <div key={day} className="weekday-compact-small">{day}</div>)}
                                        </div>
                                        <div className="days-grid-compact-small">
                                            {mDays.map((day, idx) => (
                                                <div
                                                    key={`m-day-${idx}`}
                                                    className={renderDayClasses(day, true)}
                                                    onClick={() => {
                                                        if (day.isCurrentMonth && onDateSelect) onDateSelect(day.date);
                                                    }}
                                                    title={day.isHoliday ? day.holidayData.nombre : ''}
                                                >
                                                    <div className="day-number-small">{day.date.getDate()}</div>
                                                    {day.isHoliday && (
                                                        <div className="holiday-indicators-small">
                                                            {day.holidayData.isFromPadre && <div className="holiday-indicator-small padre" title="Principal">P</div>}
                                                            {day.holidayData.isFromCcaa && <div className="holiday-indicator-small ccaa" title="CCAA">C</div>}
                                                            {(!day.holidayData.isFromPadre && !day.holidayData.isFromCcaa) && (
                                                                <div
                                                                    className="holiday-indicator-small local delete-icon-small"
                                                                    onClick={(e) => handleDelete(e, day)}
                                                                >
                                                                    🗑️
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 8. LIST CARD (ATISA COMPACT) ---
export const ListCard = ({ children, active = false, className = '', ...props }) => (
    <div
        className={cls('card border-0 shadow-sm p-3 transition-all', className)}
        style={{
            borderRadius: 'var(--radius-md)',
            borderLeft: active ? '3px solid var(--atisa-accent)' : '3px solid var(--atisa-primary)',
            backgroundColor: active ? 'rgba(var(--atisa-accent-rgb, 156, 186, 57), 0.05)' : 'var(--atisa-bg-card, #ffffff)'
        }}
        {...props}
    >
        {children}
    </div>
);
