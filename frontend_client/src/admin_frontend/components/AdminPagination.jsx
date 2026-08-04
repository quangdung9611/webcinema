// src/components/AdminPagination.jsx

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/AdminPagination.css';

const AdminPagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {

    // Nếu chỉ có 1 trang hoặc ít hơn, không hiển thị
    if (totalPages <= 1) {
        return null;
    }

    // Đảm bảo currentPage nằm trong khoảng hợp lệ (1..totalPages)
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);

    const handleChangePage = (page) => {
        if (page < 1 || page > totalPages) return;
        onPageChange(page);
    };

    const renderPages = () => {
        const pages = [];

        // Nếu số trang ít (<=5) hiển thị tất cả
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages.map((i) => (
                <button
                    key={i}
                    className={`admin-pagination-btn ${safePage === i ? 'active' : ''}`}
                    onClick={() => handleChangePage(i)}
                >
                    {i}
                </button>
            ));
        }

        // Luôn có trang đầu
        pages.push(1);

        // Dấu ... bên trái nếu safePage > 3
        if (safePage > 3) {
            pages.push('...');
        }

        // Các trang xung quanh safePage (tối đa 3 trang: trước, hiện tại, sau)
        const start = Math.max(2, safePage - 1);
        const end = Math.min(totalPages - 1, safePage + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // Dấu ... bên phải nếu safePage < totalPages - 2
        if (safePage < totalPages - 2) {
            pages.push('...');
        }

        // Trang cuối
        pages.push(totalPages);

        return pages.map((p, index) => {
            if (p === '...') {
                return (
                    <span key={`dots-${index}`} className="admin-pagination-dots">
                        ...
                    </span>
                );
            }
            return (
                <button
                    key={p}
                    className={`admin-pagination-btn ${safePage === p ? 'active' : ''}`}
                    onClick={() => handleChangePage(p)}
                >
                    {p}
                </button>
            );
        });
    };

    return (
        <div className="admin-pagination">
            {/* Nút Previous */}
            <button
                className={`admin-pagination-btn ${safePage === 1 ? 'disabled' : ''}`}
                onClick={() => handleChangePage(safePage - 1)}
                disabled={safePage === 1}
            >
                <ChevronLeft size={18} />
            </button>

            {/* Các nút trang */}
            <div className="admin-pagination-pages">
                {renderPages()}
            </div>

            {/* Nút Next */}
            <button
                className={`admin-pagination-btn ${safePage === totalPages ? 'disabled' : ''}`}
                onClick={() => handleChangePage(safePage + 1)}
                disabled={safePage === totalPages}
            >
                <ChevronRight size={18} />
            </button>

            {/* Thông tin trang */}
            <div className="admin-pagination-info">
                Trang <span>{safePage}</span> / <span>{totalPages}</span>
            </div>
        </div>
    );
};

export default AdminPagination;