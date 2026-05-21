import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    Monitor,
    Edit,
    Trash2,
    Loader2,
    Layout,
    MapPin
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

/* =====================================================
    API
===================================================== */

const ROOM_API =
    'https://api.quangdungcinema.id.vn/api/rooms';

const CINEMA_API =
    'https://api.quangdungcinema.id.vn/api/cinemas';

/* =====================================================
    INITIAL FORM
===================================================== */

const initialFormData = {
    room_name: '',
    cinema_id: '',
    room_type: ''
};

const RoomPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [rooms, setRooms] = useState([]);

    const [cinemas, setCinemas] = useState([]);

    const [loading, setLoading] = useState(false);

    const [submitLoading, setSubmitLoading] =
        useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] =
        useState(false);

    const [editingRoom, setEditingRoom] =
        useState(null);

    const [formData, setFormData] =
        useState(initialFormData);

    const [formErrors, setFormErrors] =
        useState({});

    const [alertModal, setAlertModal] =
        useState({
            open: false,
            title: '',
            message: '',
            onConfirm: null,
            onCancel: null
        });

    /* =====================================================
        ALERT MODAL
    ===================================================== */

    const showAlert = (
        title,
        message,
        onConfirm = null,
        onCancel = null
    ) => {

        setAlertModal({
            open: true,
            title,
            message,
            onConfirm,
            onCancel
        });

    };

    const closeAlert = () => {

        setAlertModal(prev => ({
            ...prev,
            open: false
        }));

    };

    /* =====================================================
        VALIDATE FORM
    ===================================================== */

    const validateForm = () => {

        const errors = {};

        /* ROOM NAME */

        if (!formData.room_name.trim()) {

            errors.room_name =
                'Vui lòng nhập tên phòng';

        } else if (
            formData.room_name.trim().length < 2
        ) {

            errors.room_name =
                'Tên phòng phải từ 2 ký tự trở lên';

        }

        /* ROOM TYPE */

        if (!formData.room_type) {

            errors.room_type =
                'Vui lòng chọn loại phòng';

        }

        /* CINEMA */

        if (!formData.cinema_id) {

            errors.cinema_id =
                'Vui lòng chọn rạp chiếu';

        }

        return errors;

    };

    /* =====================================================
        FETCH DATA
    ===================================================== */

    const fetchRooms = async () => {

        setLoading(true);

        try {

            const res = await axios.get(
                ROOM_API
            );

            setRooms(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách phòng chiếu.'
            );

        } finally {

            setLoading(false);

        }

    };

    const fetchCinemas = async () => {

        try {

            const res = await axios.get(
                CINEMA_API
            );

            setCinemas(res.data);

        } catch (error) {

            console.error(error);

        }

    };

    useEffect(() => {

        fetchRooms();

        fetchCinemas();

    }, []);

    /* =====================================================
        OPEN ADD
    ===================================================== */

    const handleOpenAdd = () => {

        setEditingRoom(null);

        setFormData(initialFormData);

        setFormErrors({});

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (room) => {

        setEditingRoom(room);

        setFormErrors({});

        setFormData({
            room_name: room.room_name || '',
            cinema_id: room.cinema_id || '',
            room_type: room.room_type || ''
        });

        setIsFormOpen(true);

    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        let errorMessage = '';

        switch (name) {

            case 'room_name':

                if (!value.trim()) {

                    errorMessage =
                        'Vui lòng nhập tên phòng';

                } else if (
                    value.trim().length < 2
                ) {

                    errorMessage =
                        'Tên phòng phải từ 2 ký tự trở lên';

                }

                break;

            case 'room_type':

                if (!value) {

                    errorMessage =
                        'Vui lòng chọn loại phòng';

                }

                break;

            case 'cinema_id':

                if (!value) {

                    errorMessage =
                        'Vui lòng chọn rạp chiếu';

                }

                break;

            default:
                break;

        }

        setFormErrors(prev => ({
            ...prev,
            [name]: errorMessage
        }));

    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        const errors = validateForm();

        if (
            Object.keys(errors).length > 0
        ) {

            setFormErrors(errors);

            return;

        }

        try {

            setSubmitLoading(true);

            setFormErrors({});

            if (editingRoom) {

                await axios.put(
                    `${ROOM_API}/update/${editingRoom.room_id}`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Cập nhật phòng chiếu thành công.'
                );

            } else {

                await axios.post(
                    `${ROOM_API}/add`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Thêm phòng chiếu thành công.'
                );

            }

            setIsFormOpen(false);

            fetchRooms();

        } catch (error) {

            const backendField =
                error.response?.data?.field;

            const backendError =
                error.response?.data?.error;

            if (backendField) {

                setFormErrors({
                    [backendField]:
                        backendError
                });

                return;

            }

            showAlert(
                'Lỗi',
                backendError ||
                'Đã xảy ra lỗi.'
            );

        } finally {

            setSubmitLoading(false);

        }

    };

    /* =====================================================
        DELETE
    ===================================================== */

    const handleDelete = (room) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa phòng "${room.room_name}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${ROOM_API}/delete/${room.room_id}`
                    );

                    closeAlert();

                    fetchRooms();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        error.response?.data?.error ||
                        'Không thể xóa phòng chiếu.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER
    ===================================================== */

    const filteredRooms =
        rooms.filter(room => {

            const keyword =
                search.toLowerCase();

            return (

                room.room_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                room.cinema_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                room.city
                    ?.toLowerCase()
                    .includes(keyword) ||

                room.room_type
                    ?.toLowerCase()
                    .includes(keyword)

            );

        });

    /* =====================================================
        BADGE TYPE
    ===================================================== */

    const renderTypeBadge = (type) => {

        const colors = {
            '2D': '#64748b',
            '3D': '#2563eb',
            'IMAX': '#7c3aed'
        };

        return (

            <span
                style={{
                    background: colors[type] || '#64748b',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600'
                }}
            >
                {type}
            </span>

        );

    };

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'Phòng chiếu',
            key: 'room_name',

            render: (row) => (

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >

                    <div
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#dbeafe',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >

                        <Monitor size={18} />

                    </div>

                    <div>

                        <div
                            style={{
                                fontWeight: '600'
                            }}
                        >
                            {row.room_name}
                        </div>

                        <small
                            style={{
                                color: '#64748b'
                            }}
                        >
                            ID: #{row.room_id}
                        </small>

                    </div>

                </div>

            )
        },

        {
            title: 'Loại phòng',
            key: 'room_type',

            render: (row) =>
                renderTypeBadge(row.room_type)
        },

        {
            title: 'Rạp chiếu',
            key: 'cinema_name',

            render: (row) => (

                <div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: '600'
                        }}
                    >

                        <Layout size={14} />

                        {row.cinema_name}

                    </div>

                    <div
                        style={{
                            marginTop: '6px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >

                        <MapPin size={13} />

                        {row.city}

                    </div>

                </div>

            )
        },

        {
            title: 'Thao tác',
            key: 'actions',

            render: (row) => (

                <div className="admin-table-actions">

                    <button
                        className="admin-action-btn edit-btn"
                        onClick={() =>
                            handleOpenEdit(row)
                        }
                    >

                        <Edit size={16} />

                    </button>

                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(row)
                        }
                    >

                        <Trash2 size={16} />

                    </button>

                </div>

            )
        }

    ];

    /* =====================================================
        FORM FIELDS
    ===================================================== */

    const formFields = [

        {
            label: 'Tên phòng',
            name: 'room_name',
            type: 'text',
            placeholder: 'Ví dụ: Phòng 01'
        },

        {
            label: 'Loại phòng',
            name: 'room_type',
            type: 'select',

            options: [
                {
                    label: '-- Chọn loại phòng --',
                    value: ''
                },

                {
                    label: 'Phòng 2D',
                    value: '2D'
                },

                {
                    label: 'Phòng 3D',
                    value: '3D'
                },

                {
                    label: 'Phòng IMAX',
                    value: 'IMAX'
                }
            ]
        },

        {
            label: 'Rạp chiếu',
            name: 'cinema_id',
            type: 'select',

            options: [
                {
                    label: '-- Chọn rạp --',
                    value: ''
                },

                ...cinemas.map(cinema => ({
                    label:
                        `${cinema.cinema_name} (${cinema.city})`,
                    value: cinema.cinema_id
                }))
            ]
        }

    ];

    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <>

            <AdminPage

                title="Quản lý phòng chiếu"

                subtitle="Quản lý toàn bộ phòng chiếu trong hệ thống"

                icon={
                    <Monitor size={30} />
                }

                buttonText="Thêm phòng chiếu"

                onAdd={handleOpenAdd}

                searchValue={search}

                onSearchChange={setSearch}

            >

                {
                    loading ? (

                        <div className="admin-loading">

                            <Loader2
                                size={32}
                                className="spin-icon"
                            />

                            <span>
                                Đang tải dữ liệu...
                            </span>

                        </div>

                    ) : (

                        <AdminTable
                            columns={columns}
                            data={filteredRooms}
                        />

                    )
                }

            </AdminPage>

            {/* =============================================
                FORM MODAL
            ============================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() =>
                    setIsFormOpen(false)
                }
                title={
                    editingRoom
                        ? 'Cập nhật phòng chiếu'
                        : 'Thêm phòng chiếu'
                }
            >

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={
                        editingRoom
                            ? 'Lưu thay đổi'
                            : 'Thêm phòng chiếu'
                    }
                />

            </AdminModal>

            {/* =============================================
                ALERT MODAL
            ============================================= */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>

                    <div className="admin-alert-actions">

                        {
                            alertModal.onCancel && (

                                <button
                                    className="admin-cancel-btn"
                                    onClick={
                                        alertModal.onCancel
                                    }
                                >
                                    Hủy
                                </button>

                            )
                        }

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm ||
                                closeAlert
                            }
                        >
                            Xác nhận
                        </button>

                    </div>

                </div>

            </AdminModal>

        </>

    );

};

export default RoomPage;