// src/components/AdminPagination.jsx

import React from 'react';

import {
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

import '../styles/AdminPagination.css';

const AdminPagination = ({

    currentPage = 1,

    totalPages = 1,

    onPageChange

}) => {

    /* =========================================================
        HIDE PAGINATION
    ========================================================= */

    if (totalPages <= 1) {

        return null;

    }

    /* =========================================================
        HANDLE PAGE CHANGE
    ========================================================= */

    const handleChangePage = (page) => {

        if (
            page < 1 ||
            page > totalPages
        ) {
            return;
        }

        onPageChange(page);

    };

    /* =========================================================
        GENERATE PAGE NUMBERS (UPDATED - SMART PAGINATION)
    ========================================================= */

    const renderPages = () => {

        const pages = [];

        // Nếu ít page thì render full
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages.map((i) => (
                <button
                    key={i}
                    className={`
                        admin-pagination-btn
                        ${currentPage === i ? 'active' : ''}
                    `}
                    onClick={() => handleChangePage(i)}
                >
                    {i}
                </button>
            ));
        }

        // Luôn có page 1
        pages.push(1);

        // dấu ...
        if (currentPage > 3) {
            pages.push('...');
        }

        // range giữa
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // dấu ...
        if (currentPage < totalPages - 2) {
            pages.push('...');
        }

        // page cuối
        pages.push(totalPages);

        return pages.map((p, index) => {

            if (p === '...') {
                return (
                    <span
                        key={`dots-${index}`}
                        className="admin-pagination-dots"
                    >
                        ...
                    </span>
                );
            }

            return (
                <button
                    key={p}
                    className={`
                        admin-pagination-btn
                        ${currentPage === p ? 'active' : ''}
                    `}
                    onClick={() => handleChangePage(p)}
                >
                    {p}
                </button>
            );
        });
    };

    /* =========================================================
        RENDER
    ========================================================= */

    return (

        <div className="admin-pagination">

            {/* =====================================================
                PREV BUTTON
            ===================================================== */}

            <button
                className={`
                    admin-pagination-btn
                    ${currentPage === 1 ? 'disabled' : ''}
                `}
                onClick={() =>
                    handleChangePage(
                        currentPage - 1
                    )
                }
            >

                <ChevronLeft size={18} />

            </button>

            {/* =====================================================
                PAGE NUMBERS
            ===================================================== */}

            <div className="admin-pagination-pages">

                {renderPages()}

            </div>

            {/* =====================================================
                NEXT BUTTON
            ===================================================== */}

            <button
                className={`
                    admin-pagination-btn
                    ${currentPage === totalPages ? 'disabled' : ''}
                `}
                onClick={() =>
                    handleChangePage(
                        currentPage + 1
                    )
                }
            >

                <ChevronRight size={18} />

            </button>

            {/* =====================================================
                INFO
            ===================================================== */}

            <div className="admin-pagination-info">

                Trang

                <span>
                    {currentPage}
                </span>

                /

                <span>
                    {totalPages}
                </span>

            </div>

        </div>

    );

};

export default AdminPagination;