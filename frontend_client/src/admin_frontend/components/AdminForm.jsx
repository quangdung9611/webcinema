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

    loading = false

}) => {

    return (

        <form
            className="admin-form"
            onSubmit={onSubmit}
        >

            {
                fields.map((field) => (

                    <div
                        className="admin-form-group"
                        key={field.name}
                    >

                        {/* LABEL */}
                        <label className="admin-form-label">
                            {field.label}
                        </label>

                        {/* =====================================================
                            FILE INPUT (FIX MỚI)
                        ===================================================== */}
                        {
                            field.type === 'file' && (

                                <>
                                    <input
                                        type="file"
                                        name={field.name}
                                        onChange={onChange}
                                        className="admin-form-input"
                                    />

                                    {/* ERROR */}
                                    {
                                        errors?.[field.name] && (
                                            <p className="admin-form-error">
                                                <AlertCircle size={15} />
                                                {errors[field.name]}
                                            </p>
                                        )
                                    }

                                </>
                            )
                        }

                        {/* INPUT */}
                        {
                            field.type !== 'textarea' &&
                            field.type !== 'select' &&
                            field.type !== 'file' && (

                                <>

                                    <input
                                        type={field.type || 'text'}

                                        name={field.name}

                                        value={
                                            formData[field.name] ?? ''
                                        }

                                        placeholder={
                                            field.placeholder || ''
                                        }

                                        onChange={onChange}

                                        required={
                                            field.required || false
                                        }

                                        className={`
                                            admin-form-input
                                            ${
                                                errors?.[field.name]
                                                    ? 'error'
                                                    : (formData[field.name] !== '' &&
                                                       formData[field.name] !== undefined &&
                                                       formData[field.name] !== null)
                                                        ? 'success'
                                                        : ''
                                            }
                                        `}
                                    />

                                    {/* PASSWORD STRENGTH */}
                                    {
                                        field.name === 'password' &&
                                        formData.password && (

                                            <div className="password-strength-wrapper">

                                                <div
                                                    className={`
                                                        password-strength-bar
                                                        ${passwordStrength}
                                                    `}
                                                />

                                                <span
                                                    className={`
                                                        password-strength-text
                                                        ${passwordStrength}
                                                    `}
                                                >

                                                    {
                                                        passwordStrength === 'weak'
                                                            ? 'Mật khẩu yếu'
                                                            : passwordStrength === 'medium'
                                                                ? 'Mật khẩu trung bình'
                                                                : 'Mật khẩu mạnh'
                                                    }

                                                </span>

                                            </div>

                                        )
                                    }

                                    {/* ERROR */}
                                    {
                                        errors?.[field.name] && (

                                            <p className="admin-form-error">

                                                <AlertCircle size={15} />

                                                {errors[field.name]}

                                            </p>

                                        )
                                    }

                                    {/* SUCCESS */}
                                    {
                                        !errors?.[field.name] &&
                                        formData[field.name] !== '' &&
                                        formData[field.name] !== undefined &&
                                        formData[field.name] !== null && (

                                            <div className="admin-form-success">

                                                <CheckCircle size={15} />

                                                Hợp lệ

                                            </div>

                                        )
                                    }

                                </>

                            )
                        }

                        {/* TEXTAREA */}
                        {
                            field.type === 'textarea' && (

                                <>

                                    <textarea
                                        name={field.name}

                                        value={
                                            formData[field.name] ?? ''
                                        }

                                        placeholder={
                                            field.placeholder || ''
                                        }

                                        onChange={onChange}

                                        rows={5}

                                        required={
                                            field.required || false
                                        }

                                        className={`
                                            admin-form-textarea
                                            ${
                                                errors?.[field.name]
                                                    ? 'error'
                                                    : (formData[field.name] !== '' &&
                                                       formData[field.name] !== undefined &&
                                                       formData[field.name] !== null)
                                                        ? 'success'
                                                        : ''
                                            }
                                        `}
                                    />

                                    {/* ERROR */}
                                    {
                                        errors?.[field.name] && (

                                            <p className="admin-form-error">

                                                <AlertCircle size={15} />

                                                {errors[field.name]}

                                            </p>

                                        )
                                    }

                                    {/* SUCCESS */}
                                    {
                                        !errors?.[field.name] &&
                                        formData[field.name] !== '' &&
                                        formData[field.name] !== undefined &&
                                        formData[field.name] !== null && (

                                            <div className="admin-form-success">

                                                <CheckCircle size={15} />

                                                Hợp lệ

                                            </div>

                                        )
                                    }

                                </>

                            )
                        }

                        {/* SELECT */}
                        {
                            field.type === 'select' && (

                                <>

                                    <select
                                        name={field.name}

                                        value={
                                            formData[field.name] ?? ''
                                        }

                                        onChange={onChange}

                                        required={
                                            field.required || false
                                        }

                                        className={`
                                            admin-form-select
                                            ${
                                                errors?.[field.name]
                                                    ? 'error'
                                                    : (formData[field.name] !== '' &&
                                                       formData[field.name] !== undefined &&
                                                       formData[field.name] !== null)
                                                        ? 'success'
                                                        : ''
                                            }
                                        `}
                                    >

                                        {
                                            field.options?.map((option) => (

                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >

                                                    {option.label}

                                                </option>

                                            ))
                                        }

                                    </select>

                                    {/* ERROR */}
                                    {
                                        errors?.[field.name] && (

                                            <p className="admin-form-error">

                                                <AlertCircle size={15} />

                                                {errors[field.name]}

                                            </p>

                                        )
                                    }

                                    {/* SUCCESS */}
                                    {
                                        !errors?.[field.name] &&
                                        formData[field.name] !== '' &&
                                        formData[field.name] !== undefined &&
                                        formData[field.name] !== null && (

                                            <div className="admin-form-success">

                                                <CheckCircle size={15} />

                                                Hợp lệ

                                            </div>

                                        )
                                    }

                                </>

                            )
                        }

                    </div>

                ))
            }

            {/* FOOTER */}
            <div className="admin-form-footer">

                <button
                    type="submit"
                    className={`
                        admin-form-submit-btn
                        ${loading ? 'loading' : ''}
                    `}
                    disabled={loading}
                >

                    {
                        loading ? (
                            <>
                                <Loader2
                                    size={18}
                                    className="admin-btn-spinner"
                                />

                                Đang xử lý...
                            </>
                        ) : (
                            submitText
                        )
                    }

                </button>

            </div>

        </form>

    );

};

export default AdminForm;