import React from 'react';
import {
    Loader2,
    AlertCircle,
    CheckCircle
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
                    {passwordStrength === 'weak' && 'Mật khẩu yếu'}

                    {passwordStrength === 'medium' &&
                        'Mật khẩu trung bình'}

                    {passwordStrength === 'strong' &&
                        'Mật khẩu mạnh'}
                </span>

            </div>
        );
    };

    /**
     * Render file preview
     */
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
                        accept={field.accept || undefined}
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

        /* ================================================
           TEXTAREA
        ================================================= */

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
                        value={formData[fieldName] ?? ''}
                        placeholder={
                            field.placeholder || ''
                        }
                        onChange={onChange}
                        rows={field.rows || 5}
                        required={field.required || false}
                        disabled={field.disabled || false}
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

        /* ================================================
           SELECT
        ================================================= */

        if (field.type === 'select') {
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

                    <select
                        id={fieldName}
                        name={fieldName}
                        value={formData[fieldName] ?? ''}
                        onChange={onChange}
                        required={field.required || false}
                        disabled={field.disabled || false}
                        className={getInputClassName(
                            fieldName,
                            'admin-form-select'
                        )}
                    >

                        {field.placeholder && (
                            <option value="">
                                {field.placeholder}
                            </option>
                        )}

                        {field.options?.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </option>
                        ))}

                    </select>

                    {renderError(fieldName)}

                    {renderSuccess(fieldName)}

                </div>
            );
        }

        /* ================================================
           INPUT THƯỜNG
        ================================================= */

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
                    type={field.type || 'text'}
                    name={fieldName}
                    value={formData[fieldName] ?? ''}
                    placeholder={
                        field.placeholder || ''
                    }
                    onChange={onChange}
                    required={field.required || false}
                    disabled={field.disabled || false}
                    min={field.min}
                    max={field.max}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    step={field.step}
                    autoComplete={
                        field.autoComplete || undefined
                    }
                    className={getInputClassName(
                        fieldName,
                        'admin-form-input'
                    )}
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

            {/* =================================================
                FIELDS
            ================================================= */}

            <div className="admin-form-fields">
                {fields.map(renderField)}
            </div>

            {/* =================================================
                FOOTER
                Chỉ chứa nút submit.
                Hủy/Xác nhận thuộc AdminModal.
            ================================================= */}

            <div className="admin-form-footer">

                <button
                    type="submit"
                    className={`admin-form-submit-btn ${
                        loading ? 'loading' : ''
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