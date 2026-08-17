import React, { useState, useRef, useEffect } from 'react';
import {
    Loader2,
    AlertCircle,
    CheckCircle,
    ChevronDown
} from 'lucide-react';

import '../styles/AdminForm.css';

const AdminForm = ({
    fields = [],
    formData = {},
    errors = {},
    passwordStrength = '',
    onChange,
    onSubmit,
    submitText = 'Lưu dữ liệu',
    loading = false,
    filePreviews = {}
}) => {

    // State cho custom select dropdown
    const [openDropdowns, setOpenDropdowns] = useState({});
    const dropdownRefs = useRef({});

    /**
     * Toggle dropdown
     */
    const toggleDropdown = (fieldName) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
    };

    /**
     * Đóng dropdown khi click outside
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(openDropdowns).forEach((fieldName) => {
                if (openDropdowns[fieldName] && 
                    dropdownRefs.current[fieldName] && 
                    !dropdownRefs.current[fieldName].contains(event.target)) {
                    setOpenDropdowns(prev => ({
                        ...prev,
                        [fieldName]: false
                    }));
                }
            });
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdowns]);

    /**
     * Kiểm tra field có giá trị hay không
     */
    const hasValue = (fieldName) => {
        const value = formData[fieldName];
        return (
            value !== undefined &&
            value !== null &&
            value !== ''
        );
    };

    /**
     * Render trạng thái hợp lệ
     */
    const isValidField = (fieldName) => {
        return (
            !errors?.[fieldName] &&
            hasValue(fieldName)
        );
    };

    /**
     * Class input
     */
    const getInputClassName = (fieldName, baseClass = 'admin-form-input') => {
        if (errors?.[fieldName]) {
            return `${baseClass} error`;
        }
        if (isValidField(fieldName)) {
            return `${baseClass} success`;
        }
        return baseClass;
    };

    /**
     * Render error
     */
    const renderError = (fieldName) => {
        if (!errors?.[fieldName]) {
            return null;
        }
        return (
            <p className="admin-form-error">
                <AlertCircle size={15} />
                <span>{errors[fieldName]}</span>
            </p>
        );
    };

    /**
     * Render success
     */
    const renderSuccess = (fieldName) => {
        if (!isValidField(fieldName)) {
            return null;
        }
        return (
            <div className="admin-form-success">
                <CheckCircle size={15} />
                <span>Hợp lệ</span>
            </div>
        );
    };

    /**
     * Render password strength
     */
    const renderPasswordStrength = (field) => {
        if (field.name !== 'password' || !formData.password) {
            return null;
        }
        return (
            <div className="password-strength-wrapper">
                <div className={`password-strength-bar ${passwordStrength || ''}`}>
                    <span className="password-strength-fill" />
                </div>
                <span className={`password-strength-text ${passwordStrength || ''}`}>
                    {passwordStrength === 'weak' && 'Mật khẩu yếu'}
                    {passwordStrength === 'medium' && 'Mật khẩu trung bình'}
                    {passwordStrength === 'strong' && 'Mật khẩu mạnh'}
                </span>
            </div>
        );
    };

    /**
     * Render file preview
     */
    const renderFilePreview = (field) => {
        const preview = filePreviews?.[field.name];
        if (!preview) return null;

        let imageWidth = '120px';
        if (field.name === 'user_avatar') imageWidth = '60px';
        if (field.name === 'movie_poster') imageWidth = '80px';

        return (
            <div className="admin-file-preview">
                <img
                    src={preview.url}
                    alt={field.label || field.name}
                    className={field.name === 'user_avatar' ? 'admin-file-preview-image avatar' : 'admin-file-preview-image'}
                    style={{ width: imageWidth }}
                />
                {preview.name && (
                    <span className="admin-file-preview-name">{preview.name}</span>
                )}
            </div>
        );
    };

    /**
     * Render Custom Select (có scrollbar)
     */
    const renderCustomSelect = (field) => {
        const fieldName = field.name;
        const isOpen = openDropdowns[fieldName] || false;
        const selectedValue = formData[fieldName] ?? '';
        const selectedOption = field.options?.find(opt => String(opt.value) === String(selectedValue));
        const fieldError = errors?.[fieldName];
        const isValid = isValidField(fieldName);

        // Xác định class cho trigger
        let triggerClassName = 'admin-custom-select-trigger';
        if (isOpen) triggerClassName += ' open';
        if (fieldError) triggerClassName += ' error';
        if (isValid) triggerClassName += ' success';

        return (
            <div
                key={fieldName}
                className="admin-form-group"
                ref={(el) => (dropdownRefs.current[fieldName] = el)}
            >
                {field.label && (
                    <label className="admin-form-label">
                        {field.label}
                        {field.required && <span className="admin-required">*</span>}
                    </label>
                )}

                <div className="admin-custom-select-wrapper">
                    <div 
                        className={triggerClassName}
                        onClick={() => !field.disabled && toggleDropdown(fieldName)}
                    >
                        <span className="admin-custom-select-value">
                            {selectedOption?.label || field.placeholder || 'Chọn...'}
                        </span>
                        <ChevronDown size={18} className={`admin-custom-select-arrow ${isOpen ? 'rotate' : ''}`} />
                    </div>

                    {isOpen && !field.disabled && (
                        <div className="admin-custom-select-dropdown">
                            {field.placeholder && (
                                <div 
                                    className={`admin-custom-select-option ${!selectedValue ? 'selected' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange({ target: { name: fieldName, value: '' } });
                                        toggleDropdown(fieldName);
                                    }}
                                >
                                    {field.placeholder}
                                </div>
                            )}
                            {field.options?.map((option) => (
                                <div
                                    key={option.value}
                                    className={`admin-custom-select-option ${String(selectedValue) === String(option.value) ? 'selected' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange({ target: { name: fieldName, value: option.value } });
                                        toggleDropdown(fieldName);
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {renderError(fieldName)}
                {renderSuccess(fieldName)}
            </div>
        );
    };

    /**
     * Render từng field
     */
    const renderField = (field) => {
        const fieldName = field.name;

        /* ================================================
           FILE
        ================================================= */
        if (field.type === 'file') {
            return (
                <div key={fieldName} className="admin-form-group">
                    {field.label && (
                        <label htmlFor={fieldName} className="admin-form-label">
                            {field.label}
                            {field.required && <span className="admin-required">*</span>}
                        </label>
                    )}
                    <input
                        id={fieldName}
                        type="file"
                        name={fieldName}
                        accept={field.accept || undefined}
                        onChange={onChange}
                        className={`admin-form-input admin-file-input ${errors?.[fieldName] ? 'error' : ''}`}
                    />
                    {renderFilePreview(field)}
                    {renderError(fieldName)}
                </div>
            );
        }

        /* ================================================
           TEXTAREA
        ================================================= */
        if (field.type === 'textarea') {
            return (
                <div key={fieldName} className="admin-form-group">
                    {field.label && (
                        <label htmlFor={fieldName} className="admin-form-label">
                            {field.label}
                            {field.required && <span className="admin-required">*</span>}
                        </label>
                    )}
                    <textarea
                        id={fieldName}
                        name={fieldName}
                        value={formData[fieldName] ?? ''}
                        placeholder={field.placeholder || ''}
                        onChange={onChange}
                        rows={field.rows || 5}
                        required={field.required || false}
                        disabled={field.disabled || false}
                        className={getInputClassName(fieldName, 'admin-form-textarea')}
                    />
                    {renderError(fieldName)}
                    {renderSuccess(fieldName)}
                </div>
            );
        }

        /* ================================================
           SELECT - DÙNG CUSTOM SELECT CÓ SCROLL
        ================================================= */
        if (field.type === 'select') {
            return renderCustomSelect(field);
        }

        /* ================================================
           CHECKBOX GROUP
        ================================================= */
        if (field.type === 'checkbox') {
            const currentValues = formData[fieldName] || [];
            const fieldError = errors?.[fieldName];

            return (
                <div key={fieldName} className="admin-form-group">
                    {field.label && (
                        <label className="admin-form-label">
                            {field.label}
                            {field.required && <span className="admin-required">*</span>}
                        </label>
                    )}
                    <div className="admin-checkbox-grid">
                        {field.options?.map((option) => (
                            <label key={option.value} className="admin-checkbox-item">
                                <input
                                    type="checkbox"
                                    name={fieldName}
                                    value={option.value}
                                    checked={currentValues.map(Number).includes(Number(option.value))}
                                    onChange={onChange}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                    {renderError(fieldName)}
                    {currentValues.length > 0 && !fieldError && (
                        <div className="admin-form-success">
                            <CheckCircle size={15} />
                            <span>Đã chọn {currentValues.length} mục</span>
                        </div>
                    )}
                </div>
            );
        }

        /* ================================================
           CHECKBOX-SELECT - CÓ SCROLLBAR
        ================================================= */
        if (field.type === 'checkbox-select') {
            const currentValues = formData[fieldName] || [];
            const fieldError = errors?.[fieldName];

            return (
                <div key={fieldName} className="admin-form-group">
                    {field.label && (
                        <label className="admin-form-label">
                            {field.label}
                            {field.required && <span className="admin-required">*</span>}
                        </label>
                    )}
                    <div className={`admin-checkbox-select-wrapper ${fieldError ? 'error' : ''}`}>
                        <div className="admin-checkbox-select-list">
                            {field.options?.map((option) => (
                                <label
                                    key={option.value}
                                    className={`admin-checkbox-select-item ${currentValues.map(Number).includes(Number(option.value)) ? 'checked' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        name={fieldName}
                                        value={option.value}
                                        checked={currentValues.map(Number).includes(Number(option.value))}
                                        onChange={onChange}
                                    />
                                    <span className="admin-checkbox-select-label">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {renderError(fieldName)}
                    {currentValues.length > 0 && !fieldError && (
                        <div className="admin-form-success">
                            <CheckCircle size={15} />
                            <span>Đã chọn {currentValues.length} phòng</span>
                        </div>
                    )}
                </div>
            );
        }

        /* ================================================
           INPUT THƯỜNG
        ================================================= */
        return (
            <div key={fieldName} className="admin-form-group">
                {field.label && (
                    <label htmlFor={fieldName} className="admin-form-label">
                        {field.label}
                        {field.required && <span className="admin-required">*</span>}
                    </label>
                )}
                <input
                    id={fieldName}
                    type={field.type || 'text'}
                    name={fieldName}
                    value={formData[fieldName] ?? ''}
                    placeholder={field.placeholder || ''}
                    onChange={onChange}
                    required={field.required || false}
                    disabled={field.disabled || false}
                    min={field.min}
                    max={field.max}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    step={field.step}
                    autoComplete={field.autoComplete || undefined}
                    className={getInputClassName(fieldName, 'admin-form-input')}
                />
                {renderPasswordStrength(field)}
                {renderError(fieldName)}
                {renderSuccess(fieldName)}
            </div>
        );
    };

    return (
        <form
            className="admin-form"
            onSubmit={onSubmit}
            noValidate
        >
            <div className="admin-form-fields">
                {fields.map(renderField)}
            </div>

            <div className="admin-form-footer">
                <button
                    type="submit"
                    className={`admin-form-submit-btn ${loading ? 'loading' : ''}`}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="admin-btn-spinner" />
                            <span>Đang xử lý...</span>
                        </>
                    ) : (
                        <span>{submitText}</span>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AdminForm;