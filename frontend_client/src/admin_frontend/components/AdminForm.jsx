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

    // ==========================================================
    // STATE
    // ==========================================================

    const [openDropdowns, setOpenDropdowns] = useState({});
    const dropdownRefs = useRef({});

    // ==========================================================
    // HELPER
    // ==========================================================

    /**
     * Chuẩn hóa giá trị để so sánh.
     *
     * Quan trọng với room_type:
     * 2D / 3D / VIP / IMAX
     */
    const normalizeValue = (value) => {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value).trim().toUpperCase();
    };

    /**
     * Kiểm tra một option có đang được chọn hay không.
     *
     * Hỗ trợ cả:
     * - ID dạng number
     * - ID dạng string
     * - room_type dạng string
     */
    const isOptionChecked = (currentValues, optionValue) => {
        if (!Array.isArray(currentValues)) {
            return false;
        }

        return currentValues.some(
            (value) =>
                normalizeValue(value) === normalizeValue(optionValue)
        );
    };

    // ==========================================================
    // CUSTOM SELECT
    // ==========================================================

    const toggleDropdown = (fieldName) => {
        setOpenDropdowns((prev) => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
    };

    // ==========================================================
    // CLICK OUTSIDE
    // ==========================================================

    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(openDropdowns).forEach((fieldName) => {
                if (
                    openDropdowns[fieldName] &&
                    dropdownRefs.current[fieldName] &&
                    !dropdownRefs.current[fieldName].contains(event.target)
                ) {
                    setOpenDropdowns((prev) => ({
                        ...prev,
                        [fieldName]: false
                    }));
                }
            });
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, [openDropdowns]);

    // ==========================================================
    // KIỂM TRA FIELD
    // ==========================================================

    const hasValue = (fieldName) => {
        const value = formData[fieldName];

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return (
            value !== undefined &&
            value !== null &&
            value !== ''
        );
    };

    const isValidField = (fieldName) => {
        return (
            !errors?.[fieldName] &&
            hasValue(fieldName)
        );
    };

    // ==========================================================
    // INPUT CLASS
    // ==========================================================

    const getInputClassName = (
        fieldName,
        baseClass = 'admin-form-input'
    ) => {
        if (errors?.[fieldName]) {
            return `${baseClass} error`;
        }

        if (isValidField(fieldName)) {
            return `${baseClass} success`;
        }

        return baseClass;
    };

    // ==========================================================
    // ERROR
    // ==========================================================

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

    // ==========================================================
    // SUCCESS
    // ==========================================================

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

    // ==========================================================
    // PASSWORD STRENGTH
    // ==========================================================

    const renderPasswordStrength = (field) => {
        if (
            field.name !== 'password' ||
            !formData.password
        ) {
            return null;
        }

        return (
            <div className="password-strength-wrapper">
                <div
                    className={`password-strength-bar ${
                        passwordStrength || ''
                    }`}
                >
                    <span className="password-strength-fill" />
                </div>

                <span
                    className={`password-strength-text ${
                        passwordStrength || ''
                    }`}
                >
                    {passwordStrength === 'weak' &&
                        'Mật khẩu yếu'}

                    {passwordStrength === 'medium' &&
                        'Mật khẩu trung bình'}

                    {passwordStrength === 'strong' &&
                        'Mật khẩu mạnh'}
                </span>
            </div>
        );
    };

    // ==========================================================
    // FILE PREVIEW
    // ==========================================================

    const renderFilePreview = (field) => {
        const preview = filePreviews?.[field.name];

        if (!preview) {
            return null;
        }

        let imageWidth = '120px';

        if (field.name === 'user_avatar') {
            imageWidth = '60px';
        }

        if (field.name === 'movie_poster') {
            imageWidth = '80px';
        }

        return (
            <div className="admin-file-preview">
                <img
                    src={preview.url}
                    alt={field.label || field.name}
                    className={
                        field.name === 'user_avatar'
                            ? 'admin-file-preview-image avatar'
                            : 'admin-file-preview-image'
                    }
                    style={{
                        width: imageWidth
                    }}
                />

                {preview.name && (
                    <span className="admin-file-preview-name">
                        {preview.name}
                    </span>
                )}
            </div>
        );
    };

    // ==========================================================
    // CUSTOM SELECT
    // ==========================================================

    const renderCustomSelect = (field) => {
        const fieldName = field.name;

        const isOpen =
            openDropdowns[fieldName] || false;

        const selectedValue =
            formData[fieldName] ?? '';

        const selectedOption =
            field.options?.find(
                (option) =>
                    String(option.value) ===
                    String(selectedValue)
            );

        const fieldError =
            errors?.[fieldName];

        const isValid =
            isValidField(fieldName);

        let triggerClassName =
            'admin-custom-select-trigger';

        if (isOpen) {
            triggerClassName += ' open';
        }

        if (fieldError) {
            triggerClassName += ' error';
        }

        if (isValid) {
            triggerClassName += ' success';
        }

        return (
            <div
                key={fieldName}
                className="admin-form-group"
                ref={(element) => {
                    dropdownRefs.current[fieldName] =
                        element;
                }}
            >
                {field.label && (
                    <label className="admin-form-label">
                        {field.label}

                        {field.required && (
                            <span className="admin-required">
                                *
                            </span>
                        )}
                    </label>
                )}

                <div className="admin-custom-select-wrapper">
                    <div
                        className={triggerClassName}
                        onClick={() =>
                            !field.disabled &&
                            toggleDropdown(fieldName)
                        }
                    >
                        <span className="admin-custom-select-value">
                            {selectedOption?.label ||
                                field.placeholder ||
                                'Chọn...'}
                        </span>

                        <ChevronDown
                            size={18}
                            className={`admin-custom-select-arrow ${
                                isOpen
                                    ? 'rotate'
                                    : ''
                            }`}
                        />
                    </div>

                    {isOpen &&
                        !field.disabled && (
                            <div className="admin-custom-select-dropdown">
                                {field.placeholder && (
                                    <div
                                        className={`admin-custom-select-option ${
                                            !selectedValue
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={(event) => {
                                            event.stopPropagation();

                                            onChange({
                                                target: {
                                                    name: fieldName,
                                                    value: ''
                                                }
                                            });

                                            toggleDropdown(
                                                fieldName
                                            );
                                        }}
                                    >
                                        {field.placeholder}
                                    </div>
                                )}

                                {field.options?.map(
                                    (option) => (
                                        <div
                                            key={
                                                option.value
                                            }
                                            className={`admin-custom-select-option ${
                                                String(
                                                    selectedValue
                                                ) ===
                                                String(
                                                    option.value
                                                )
                                                    ? 'selected'
                                                    : ''
                                            }`}
                                            onClick={(
                                                event
                                            ) => {
                                                event.stopPropagation();

                                                onChange({
                                                    target: {
                                                        name: fieldName,
                                                        value: option.value
                                                    }
                                                });

                                                toggleDropdown(
                                                    fieldName
                                                );
                                            }}
                                        >
                                            {option.label}
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                </div>

                {renderError(fieldName)}
                {renderSuccess(fieldName)}
            </div>
        );
    };

    // ==========================================================
    // RENDER FIELD
    // ==========================================================

    const renderField = (field) => {
        const fieldName = field.name;

        // ======================================================
        // FILE
        // ======================================================

        if (field.type === 'file') {
            return (
                <div
                    key={fieldName}
                    className="admin-form-group"
                >
                    {field.label && (
                        <label
                            htmlFor={fieldName}
                            className="admin-form-label"
                        >
                            {field.label}

                            {field.required && (
                                <span className="admin-required">
                                    *
                                </span>
                            )}
                        </label>
                    )}

                    <input
                        id={fieldName}
                        type="file"
                        name={fieldName}
                        accept={
                            field.accept ||
                            undefined
                        }
                        onChange={onChange}
                        className={`admin-form-input admin-file-input ${
                            errors?.[fieldName]
                                ? 'error'
                                : ''
                        }`}
                    />

                    {renderFilePreview(field)}
                    {renderError(fieldName)}
                </div>
            );
        }

        // ======================================================
        // TEXTAREA
        // ======================================================

        if (field.type === 'textarea') {
            return (
                <div
                    key={fieldName}
                    className="admin-form-group"
                >
                    {field.label && (
                        <label
                            htmlFor={fieldName}
                            className="admin-form-label"
                        >
                            {field.label}

                            {field.required && (
                                <span className="admin-required">
                                    *
                                </span>
                            )}
                        </label>
                    )}

                    <textarea
                        id={fieldName}
                        name={fieldName}
                        value={
                            formData[fieldName] ?? ''
                        }
                        placeholder={
                            field.placeholder || ''
                        }
                        onChange={onChange}
                        rows={
                            field.rows || 5
                        }
                        required={
                            field.required || false
                        }
                        disabled={
                            field.disabled || false
                        }
                        className={getInputClassName(
                            fieldName,
                            'admin-form-textarea'
                        )}
                    />

                    {renderError(fieldName)}
                    {renderSuccess(fieldName)}
                </div>
            );
        }

        // ======================================================
        // SELECT
        // ======================================================

        if (field.type === 'select') {
            return renderCustomSelect(field);
        }

        // ======================================================
        // CHECKBOX GROUP
        // ======================================================

        if (field.type === 'checkbox') {
            const currentValues =
                Array.isArray(
                    formData[fieldName]
                )
                    ? formData[fieldName]
                    : [];

            const fieldError =
                errors?.[fieldName];

            return (
                <div
                    key={fieldName}
                    className="admin-form-group"
                >
                    {field.label && (
                        <label className="admin-form-label">
                            {field.label}

                            {field.required && (
                                <span className="admin-required">
                                    *
                                </span>
                            )}
                        </label>
                    )}

                    <div className="admin-checkbox-grid">
                        {field.options?.map(
                            (option) => {
                                /*
                                 * QUAN TRỌNG:
                                 *
                                 * Mỗi checkbox chỉ checked
                                 * nếu value của CHÍNH NÓ
                                 * nằm trong currentValues.
                                 *
                                 * Ví dụ:
                                 *
                                 * ['2D']
                                 *
                                 * => 2D checked
                                 * => 3D unchecked
                                 * => VIP unchecked
                                 * => IMAX unchecked
                                 */
                                const isChecked =
                                    isOptionChecked(
                                        currentValues,
                                        option.value
                                    );

                                return (
                                    <label
                                        key={
                                            option.value
                                        }
                                        className={`admin-checkbox-item ${
                                            isChecked
                                                ? 'checked'
                                                : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name={
                                                fieldName
                                            }
                                            value={
                                                option.value
                                            }
                                            checked={
                                                isChecked
                                            }
                                            disabled={
                                                field.disabled ||
                                                false
                                            }
                                            onChange={
                                                onChange
                                            }
                                        />

                                        <span>
                                            {
                                                option.label
                                            }
                                        </span>
                                    </label>
                                );
                            }
                        )}
                    </div>

                    {renderError(fieldName)}

                    {currentValues.length >
                        0 &&
                        !fieldError && (
                            <div className="admin-form-success">
                                <CheckCircle
                                    size={15}
                                />

                                <span>
                                    Đã chọn{' '}
                                    {
                                        currentValues.length
                                    }{' '}
                                    mục
                                </span>
                            </div>
                        )}
                </div>
            );
        }

        // ======================================================
        // CHECKBOX SELECT
        // ======================================================

        if (
            field.type ===
            'checkbox-select'
        ) {
            const currentValues =
                Array.isArray(
                    formData[fieldName]
                )
                    ? formData[fieldName]
                    : [];

            const fieldError =
                errors?.[fieldName];

            return (
                <div
                    key={fieldName}
                    className="admin-form-group"
                >
                    {field.label && (
                        <label className="admin-form-label">
                            {field.label}

                            {field.required && (
                                <span className="admin-required">
                                    *
                                </span>
                            )}
                        </label>
                    )}

                    <div
                        className={`admin-checkbox-select-wrapper ${
                            fieldError
                                ? 'error'
                                : ''
                        }`}
                    >
                        <div className="admin-checkbox-select-list">
                            {field.options?.map(
                                (option) => {
                                    const isChecked =
                                        isOptionChecked(
                                            currentValues,
                                            option.value
                                        );

                                    return (
                                        <label
                                            key={
                                                option.value
                                            }
                                            className={`admin-checkbox-select-item ${
                                                isChecked
                                                    ? 'checked'
                                                    : ''
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                name={
                                                    fieldName
                                                }
                                                value={
                                                    option.value
                                                }
                                                checked={
                                                    isChecked
                                                }
                                                disabled={
                                                    field.disabled ||
                                                    false
                                                }
                                                onChange={
                                                    onChange
                                                }
                                            />

                                            <span className="admin-checkbox-select-label">
                                                {
                                                    option.label
                                                }
                                            </span>
                                        </label>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    {renderError(fieldName)}

                    {currentValues.length >
                        0 &&
                        !fieldError && (
                            <div className="admin-form-success">
                                <CheckCircle
                                    size={15}
                                />

                                <span>
                                    Đã chọn{' '}
                                    {
                                        currentValues.length
                                    }{' '}
                                    phòng
                                </span>
                            </div>
                        )}
                </div>
            );
        }

        // ======================================================
        // INPUT THƯỜNG
        // ======================================================

        return (
            <div
                key={fieldName}
                className="admin-form-group"
            >
                {field.label && (
                    <label
                        htmlFor={fieldName}
                        className="admin-form-label"
                    >
                        {field.label}

                        {field.required && (
                            <span className="admin-required">
                                *
                            </span>
                        )}
                    </label>
                )}

                <input
                    id={fieldName}
                    type={
                        field.type || 'text'
                    }
                    name={fieldName}
                    value={
                        formData[fieldName] ??
                        ''
                    }
                    placeholder={
                        field.placeholder || ''
                    }
                    onChange={onChange}
                    required={
                        field.required || false
                    }
                    disabled={
                        field.disabled || false
                    }
                    min={field.min}
                    max={field.max}
                    minLength={
                        field.minLength
                    }
                    maxLength={
                        field.maxLength
                    }
                    step={field.step}
                    autoComplete={
                        field.autoComplete ||
                        undefined
                    }
                    className={getInputClassName(
                        fieldName,
                        'admin-form-input'
                    )}
                />

                {renderPasswordStrength(
                    field
                )}

                {renderError(fieldName)}
                {renderSuccess(fieldName)}
            </div>
        );
    };

    // ==========================================================
    // RENDER FORM
    // ==========================================================

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
                    className={`admin-form-submit-btn ${
                        loading
                            ? 'loading'
                            : ''
                    }`}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2
                                size={18}
                                className="admin-btn-spinner"
                            />

                            <span>
                                Đang xử lý...
                            </span>
                        </>
                    ) : (
                        <span>
                            {submitText}
                        </span>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AdminForm;