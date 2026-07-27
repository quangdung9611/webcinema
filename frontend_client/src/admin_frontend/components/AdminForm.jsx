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
    filePreviews = {}   // { fieldName: { url, name } }
}) => {
    return (
        <form className="admin-form" onSubmit={onSubmit}>
            {fields.map((field) => (
                <div className="admin-form-group" key={field.name}>
                    <label className="admin-form-label">{field.label}</label>

                    {/* ================= FILE INPUT ================= */}
                    {field.type === 'file' && (
                        <>
                            <input
                                type="file"
                                name={field.name}
                                onChange={onChange}
                                className="admin-form-input"
                            />

                            {/* Hiển thị ảnh + tên file nếu có preview */}
                            {filePreviews[field.name] && (
                                <div style={{ marginTop: '8px' }}>
                                    <img
                                        src={filePreviews[field.name].url}
                                        alt={field.label}
                                        style={{
                                            width: field.name === 'user_avatar' ? '60px' :
                                                   field.name === 'movie_poster' ? '80px' : '120px',
                                            height: 'auto',
                                            borderRadius: field.name === 'user_avatar' ? '50%' : '4px',
                                            display: 'block',
                                            marginBottom: '4px'
                                        }}
                                    />
                                    <span style={{
                                        color: 'rgba(255,255,255,0.35)',
                                        fontSize: '0.6rem',
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace'
                                    }}>
                                        {filePreviews[field.name].name}
                                    </span>
                                </div>
                            )}

                            {errors?.[field.name] && (
                                <p className="admin-form-error">
                                    <AlertCircle size={15} />
                                    {errors[field.name]}
                                </p>
                            )}
                        </>
                    )}

                    {/* ========== CÁC LOẠI INPUT KHÁC ========== */}
                    {field.type !== 'textarea' && field.type !== 'select' && field.type !== 'file' && (
                        <>
                            <input
                                type={field.type || 'text'}
                                name={field.name}
                                value={formData[field.name] ?? ''}
                                placeholder={field.placeholder || ''}
                                onChange={onChange}
                                required={field.required || false}
                                className={`admin-form-input ${
                                    errors?.[field.name] ? 'error' :
                                    (formData[field.name] !== '' && formData[field.name] !== undefined && formData[field.name] !== null) ? 'success' : ''
                                }`}
                            />

                            {/* Password strength */}
                            {field.name === 'password' && formData.password && (
                                <div className="password-strength-wrapper">
                                    <div className={`password-strength-bar ${passwordStrength}`} />
                                    <span className={`password-strength-text ${passwordStrength}`}>
                                        {passwordStrength === 'weak' && 'Mật khẩu yếu'}
                                        {passwordStrength === 'medium' && 'Mật khẩu trung bình'}
                                        {passwordStrength === 'strong' && 'Mật khẩu mạnh'}
                                    </span>
                                </div>
                            )}

                            {errors?.[field.name] && (
                                <p className="admin-form-error">
                                    <AlertCircle size={15} />
                                    {errors[field.name]}
                                </p>
                            )}
                            {!errors?.[field.name] && formData[field.name] !== '' && formData[field.name] !== undefined && formData[field.name] !== null && (
                                <div className="admin-form-success">
                                    <CheckCircle size={15} />
                                    Hợp lệ
                                </div>
                            )}
                        </>
                    )}

                    {/* ========== TEXTAREA ========== */}
                    {field.type === 'textarea' && (
                        <>
                            <textarea
                                name={field.name}
                                value={formData[field.name] ?? ''}
                                placeholder={field.placeholder || ''}
                                onChange={onChange}
                                rows={5}
                                required={field.required || false}
                                className={`admin-form-textarea ${
                                    errors?.[field.name] ? 'error' :
                                    (formData[field.name] !== '' && formData[field.name] !== undefined && formData[field.name] !== null) ? 'success' : ''
                                }`}
                            />
                            {errors?.[field.name] && (
                                <p className="admin-form-error">
                                    <AlertCircle size={15} />
                                    {errors[field.name]}
                                </p>
                            )}
                            {!errors?.[field.name] && formData[field.name] !== '' && formData[field.name] !== undefined && formData[field.name] !== null && (
                                <div className="admin-form-success">
                                    <CheckCircle size={15} />
                                    Hợp lệ
                                </div>
                            )}
                        </>
                    )}

                    {/* ========== SELECT ========== */}
                    {field.type === 'select' && (
                        <>
                            <select
                                name={field.name}
                                value={formData[field.name] ?? ''}
                                onChange={onChange}
                                required={field.required || false}
                                className={`admin-form-select ${
                                    errors?.[field.name] ? 'error' :
                                    (formData[field.name] !== '' && formData[field.name] !== undefined && formData[field.name] !== null) ? 'success' : ''
                                }`}
                            >
                                {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors?.[field.name] && (
                                <p className="admin-form-error">
                                    <AlertCircle size={15} />
                                    {errors[field.name]}
                                </p>
                            )}
                            {!errors?.[field.name] && formData[field.name] !== '' && formData[field.name] !== undefined && formData[field.name] !== null && (
                                <div className="admin-form-success">
                                    <CheckCircle size={15} />
                                    Hợp lệ
                                </div>
                            )}
                        </>
                    )}
                </div>
            ))}

            <div className="admin-form-footer">
                <button
                    type="submit"
                    className={`admin-form-submit-btn ${loading ? 'loading' : ''}`}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="admin-btn-spinner" />
                            Đang xử lý...
                        </>
                    ) : (
                        submitText
                    )}
                </button>
            </div>
        </form>
    );
};

export default AdminForm;