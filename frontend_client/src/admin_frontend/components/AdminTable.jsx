
import React from 'react';
import '../styles/AdminTable.css';

const AdminTable = ({
    columns = [],
    data = [],
    loading = false,
    emptyText = 'Không có dữ liệu'
}) => {

    // =========================================================
    // SAFE DATA
    // =========================================================

    const tableData = Array.isArray(data)
        ? data
        : [];


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="admin-table-container">

            <div className="admin-table-wrapper">

                <table className="admin-table">

                    {/* =====================================================
                        TABLE HEAD
                    ===================================================== */}

                    <thead>

                        <tr>

                            {columns.map((column) => (

                                <th
                                    key={column.key}
                                >
                                    {column.title}
                                </th>

                            ))}

                        </tr>

                    </thead>


                    {/* =====================================================
                        TABLE BODY
                    ===================================================== */}

                    <tbody>

                        {/* =================================================
                            LOADING
                        ================================================= */}

                        {loading ? (

                            <tr>

                                <td
                                    colSpan={columns.length || 1}
                                    className="admin-table-empty"
                                >
                                    Đang tải dữ liệu...
                                </td>

                            </tr>

                        ) : tableData.length === 0 ? (

                            /* =============================================
                                EMPTY
                            ============================================= */

                            <tr>

                                <td
                                    colSpan={columns.length || 1}
                                    className="admin-table-empty"
                                >
                                    {emptyText}
                                </td>

                            </tr>

                        ) : (

                            /* =============================================
                                DATA
                            ============================================= */

                            tableData.map((row, index) => (

                                <tr
                                    key={
                                        row.user_id ??
                                        row.id ??
                                        index
                                    }
                                >

                                    {columns.map((column) => (

                                        <td
                                            key={column.key}
                                        >

                                            {typeof column.render === 'function'
                                                ? column.render(row)
                                                : row[column.key] ?? '—'
                                            }

                                        </td>

                                    ))}

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>

        </div>

    );
};

export default AdminTable;

