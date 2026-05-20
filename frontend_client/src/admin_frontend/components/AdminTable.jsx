import React, { useState, useMemo, useEffect } from 'react';

import AdminPagination from './AdminPagination';

import '../styles/AdminTable.css';

const AdminTable = ({
    columns = [],
    data = [],
    loading = false,
    emptyText = 'Không có dữ liệu',
    itemsPerPage = 3
}) => {

    /* =====================================
        PAGINATION STATE
    ===================================== */

    const [currentPage, setCurrentPage] = useState(1);

    /* =====================================
        RESET PAGE WHEN DATA CHANGE
    ===================================== */

    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    /* =====================================
        TOTAL PAGES
    ===================================== */

    const totalPages = Math.ceil(
        data.length / itemsPerPage
    );

    /* =====================================
        PAGINATED DATA
    ===================================== */

    const paginatedData = useMemo(() => {

        const start = (currentPage - 1) * itemsPerPage;

        return data.slice(start, start + itemsPerPage);

    }, [data, currentPage, itemsPerPage]);

    /* =====================================
        CHANGE PAGE
    ===================================== */

    const handlePageChange = (page) => {

        if (page < 1 || page > totalPages) return;

        setCurrentPage(page);
    };

    /* =====================================
        RENDER
    ===================================== */

    return (

        <div className="admin-table-container">

            <div className="admin-table-wrapper">

                <table className="admin-table">

                    {/* TABLE HEAD */}
                    <thead>
                        <tr>
                            {
                                columns.map((column) => (
                                    <th key={column.key}>
                                        {column.title}
                                    </th>
                                ))
                            }
                        </tr>
                    </thead>

                    {/* TABLE BODY */}
                    <tbody>

                        {
                            loading ? (

                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="admin-table-empty"
                                    >
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>

                            ) : paginatedData.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="admin-table-empty"
                                    >
                                        {emptyText}
                                    </td>
                                </tr>

                            ) : (

                                paginatedData.map((row, index) => (

                                    <tr key={row.user_id || row.id || index}>

                                        {
                                            columns.map((column) => (
                                                <td key={column.key}>
                                                    {
                                                        column.render
                                                            ? column.render(row)
                                                            : row[column.key]
                                                    }
                                                </td>
                                            ))
                                        }

                                    </tr>

                                ))

                            )
                        }

                    </tbody>

                </table>

            </div>

            {/* =====================================
                PAGINATION UI
            ===================================== */}

            {
                totalPages > 1 && !loading && (

                    <AdminPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />

                )
            }

        </div>

    );

};

export default AdminTable;