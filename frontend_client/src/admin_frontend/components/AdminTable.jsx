
import React from 'react';
import '../styles/AdminTable.css';

const AdminTable = ({
    columns = [],
    data = [],
    loading = false,
    emptyText = 'Không có dữ liệu'
}) => {

    return (

        <div className="admin-table-container">

            <div className="admin-table-wrapper">

                <table className="admin-table">

                    {/* =====================================
                        TABLE HEAD
                    ===================================== */}

                    <thead>

                        <tr>

                            {columns.map((column) => (

                                <th key={column.key}>
                                    {column.title}
                                </th>

                            ))}

                        </tr>

                    </thead>


                    {/* =====================================
                        TABLE BODY
                    ===================================== */}

                    <tbody>

                        {loading ? (

                            <tr>

                                <td
                                    colSpan={columns.length}
                                    className="admin-table-empty"
                                >
                                    Đang tải dữ liệu...
                                </td>

                            </tr>

                        ) : data.length === 0 ? (

                            <tr>

                                <td
                                    colSpan={columns.length}
                                    className="admin-table-empty"
                                >
                                    {emptyText}
                                </td>

                            </tr>

                        ) : (

                            data.map((row, index) => (

                                <tr
                                    key={
                                        row.user_id ||
                                        row.id ||
                                        index
                                    }
                                >

                                    {columns.map((column) => (

                                        <td key={column.key}>

                                            {column.render
                                                ? column.render(row)
                                                : row[column.key]
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

