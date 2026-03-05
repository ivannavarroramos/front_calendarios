import React from 'react';

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    icon?: string;
    children: React.ReactNode;
}
export const FormSection: React.FC<FormSectionProps>;

export interface FormInfoBannerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'info' | 'warning' | 'success' | 'danger';
}
export const FormInfoBanner: React.FC<FormInfoBannerProps>;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    outline?: boolean;
}

export const Button: React.FC<ButtonProps>;

export interface FormFieldProps {
    label?: string;
    required?: boolean;
    error?: string | null;
    children: React.ReactNode;
    className?: string;
}

export const FormField: React.FC<FormFieldProps>;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: string;
    error?: string | null;
}

export const Input: React.FC<InputProps>;

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options?: { label: string; value: string | number }[];
    icon?: string;
}

export const Select: React.FC<SelectProps>;

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    id: string;
}

export const Checkbox: React.FC<CheckboxProps>;

export interface SearchableSelectOption {
    value: string;
    label: string;
    description?: string;
    category?: string;
}

export interface SearchableSelectProps {
    label: string;
    options: SearchableSelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps>;

export interface DataTableColumn {
    label: string;
    key: string;
    render?: (value: any, row: any) => React.ReactNode;
}

export interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
    columns?: DataTableColumn[];
    data?: any[];
    onAction?: (type: 'view' | 'edit' | 'delete', row: any) => void;
    title?: string;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    extraRowActions?: (row: any) => React.ReactNode;
}

export const DataTable: React.FC<DataTableProps>;

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps>;

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    outline?: boolean;
}

export const Badge: React.FC<BadgeProps>;

export interface ToastProps {
    title: string;
    message: string;
    variant?: 'success' | 'danger' | 'warning';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps>;

export interface CalendarViewProps {
    year: number;
    month: number;
    fechas?: any[];
    onDateSelect?: (date: Date) => void;
    onDeleteFecha?: (fecha: any) => void;
    showAnnualView?: boolean;
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
    onPrevYear?: () => void;
    onNextYear?: () => void;
    onToggleView?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps>;

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
    totalItems?: number;
    pageSize?: number;
}

export const Pagination: React.FC<PaginationProps>;

export interface EmptyStateProps {
    message?: string;
    icon?: string;
    children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps>;

export interface ListCardProps extends React.HTMLAttributes<HTMLDivElement> {
    active?: boolean;
    children: React.ReactNode;
}
export const ListCard: React.FC<ListCardProps>;
