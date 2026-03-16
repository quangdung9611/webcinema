import React from 'react';
import '../styles/Modal.css'; 

const Modal = ({ show, type, title, message, onConfirm, onCancel }) => {
    if (!show) return null;

    const getHeaderColor = () => {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            confirm: '#f39c12'
        };
        return colors[type] || '#3498db';
    };

    const getIcon = () => {
        const icons = {
            success: '✅',
            error: '❌',
            confirm: '❓'
        };
        return icons[type] || 'ℹ️';
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {/* Dấu X đóng nhanh */}
                <button className="modal-close-x" onClick={onCancel || onConfirm}>
                    &times;
                </button>

                <div className="modal-icon">{getIcon()}</div>
                
                <h3 style={{ color: getHeaderColor(), marginBottom: '15px' }}>
                    {title}
                </h3>
                
                {/* CHỖ SỬA QUAN TRỌNG NHẤT: 
                  Đổi từ <p> sang <div> để chứa được StarRating và Textarea của Dũng 
                */}
                <div className="modal-message" style={{ marginBottom: '20px' }}>
                    {message}
                </div>
                
                <div className="modal-actions">
                    {type === 'confirm' ? (
                        <>
                            <button className="modal-btn btn-cancel" onClick={onCancel}>Hủy bỏ</button>
                            <button 
                                className="modal-btn" 
                                style={{ backgroundColor: '#2ecc71', color: '#fff' }} 
                                onClick={onConfirm}
                            > Xác nhận </button>
                        </>
                    ) : (
                        <button 
                            className="modal-btn" 
                            style={{ backgroundColor: getHeaderColor(), color: '#fff' }} 
                            onClick={onConfirm}
                        > Đóng </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;