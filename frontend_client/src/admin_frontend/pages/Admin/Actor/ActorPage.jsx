import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    Smile,
    Edit,
    Trash2,
    Loader2
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const API_URL = 'https://api.quangdungcinema.id.vn/api/actors';

const initialFormData = {
    name: '',
    slug: '',
    gender: 'Nam',
    nationality: 'Việt Nam',
    birthday: '',
    biography: ''
};

const ActorPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [actors, setActors] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingActor, setEditingActor] = useState(null);

    const [formData, setFormData] = useState(initialFormData);

    const [avatarFile, setAvatarFile] = useState(null);

    const [preview, setPreview] = useState(null);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    /* =====================================================
        FETCH ACTORS
    ===================================================== */

    const fetchActors = async () => {

        setLoading(true);

        try {

            const res = await axios.get(API_URL);

            setActors(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách diễn viên.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchActors();

    }, []);

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
        GENERATE SLUG
    ===================================================== */

    const generateSlug = (str) => {

        if (!str) return '';

        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/([^0-9a-z-\s])/g, '')
            .replace(/(\s+)/g, '-')
            .replace(/-+/g, '-')
            .trim();

    };

    /* =====================================================
        OPEN ADD
    ===================================================== */

    const handleOpenAdd = () => {

        setEditingActor(null);

        setFormData(initialFormData);

        setAvatarFile(null);

        setPreview(null);

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (actor) => {

        setEditingActor(actor);

        setFormData({
            name: actor.name || '',
            slug: actor.slug || '',
            gender: actor.gender || 'Nam',
            nationality: actor.nationality || 'Việt Nam',
            birthday: actor.birthday
                ? actor.birthday.substring(0, 10)
                : '',
            biography: actor.biography || ''
        });

        setPreview(
            actor.avatar
                ? `https://api.quangdungcinema.id.vn/uploads/actors/${actor.avatar}`
                : null
        );

        setAvatarFile(null);

        setIsFormOpen(true);

    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */

    const handleChange = (e) => {

        const { name, value, files } = e.target;

        if (name === 'avatar') {

            const file = files[0];

            setAvatarFile(file);

            if (file) {

                setPreview(
                    URL.createObjectURL(file)
                );

            }

            return;

        }

        if (name === 'name') {

            setFormData(prev => ({
                ...prev,
                name: value,
                slug: generateSlug(value)
            }));

            return;

        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const submitData = new FormData();

            submitData.append(
                'name',
                formData.name
            );

            submitData.append(
                'slug',
                formData.slug
            );

            submitData.append(
                'gender',
                formData.gender
            );

            submitData.append(
                'nationality',
                formData.nationality
            );

            submitData.append(
                'birthday',
                formData.birthday
            );

            submitData.append(
                'biography',
                formData.biography
            );

            if (avatarFile) {

                submitData.append(
                    editingActor
                        ? 'actorImage'
                        : 'avatar',
                    avatarFile
                );

            } else if (editingActor) {

                submitData.append(
                    'avatar',
                    editingActor.avatar
                );

            }

            if (editingActor) {

                await axios.put(
                    `${API_URL}/update/${editingActor.actor_id}`,
                    submitData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                showAlert(
                    'Thành công',
                    'Cập nhật diễn viên thành công.'
                );

            } else {

                await axios.post(
                    `${API_URL}/add`,
                    submitData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                showAlert(
                    'Thành công',
                    'Thêm diễn viên thành công.'
                );

            }

            setIsFormOpen(false);

            fetchActors();

        } catch (error) {

            showAlert(
                'Lỗi',
                error.response?.data?.error ||
                'Đã xảy ra lỗi.'
            );

        }

    };

    /* =====================================================
        DELETE ACTOR
    ===================================================== */

    const handleDelete = (actor) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${actor.name}"?`,

            async () => {

                try {

                    const token =
                        sessionStorage.getItem(
                            'usertoken'
                        );

                    await axios.delete(
                        `${API_URL}/delete/${actor.actor_id}`,
                        {
                            data: {
                                token
                            }
                        }
                    );

                    closeAlert();

                    fetchActors();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể xóa diễn viên.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER ACTORS
    ===================================================== */

    const filteredActors = actors.filter(actor => {

        const keyword =
            search.toLowerCase();

        return (
            actor.name
                ?.toLowerCase()
                .includes(keyword) ||

            actor.slug
                ?.toLowerCase()
                .includes(keyword) ||

            actor.nationality
                ?.toLowerCase()
                .includes(keyword)
        );

    });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'Avatar',
            key: 'avatar',

            render: (row) => (

                <img
                    src={`https://api.quangdungcinema.id.vn/uploads/actors/${row.avatar}`}
                    alt={row.name}
                    style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '50%'
                    }}
                />

            )
        },

        {
            title: 'Họ tên',
            key: 'name'
        },

        {
            title: 'Slug',
            key: 'slug'
        },

        {
            title: 'Giới tính',
            key: 'gender',

            render: (row) => (

                <span
                    className={`status-badge ${
                        row.gender === 'Nam'
                            ? 'used'
                            : 'pending'
                    }`}
                >
                    {row.gender}
                </span>

            )
        },

        {
            title: 'Quốc tịch',
            key: 'nationality'
        },

        {
            title: 'Ngày sinh',
            key: 'birthday',

            render: (row) => (

                row.birthday
                    ? new Date(
                        row.birthday
                    ).toLocaleDateString('vi-VN')
                    : '---'

            )
        },

        {
            title: 'Thao tác',
            key: 'actions',

            render: (row) => (

                <div className="admin-table-actions">

                    <button
                        className="admin-action-btn edit-btn"
                        onClick={() => handleOpenEdit(row)}
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() => handleDelete(row)}
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
            label: 'Họ tên',
            name: 'name',
            type: 'text',
            placeholder: 'Nhập tên diễn viên'
        },

        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            placeholder: 'Slug tự động',
            disabled: true
        },

        {
            label: 'Giới tính',
            name: 'gender',
            type: 'select',

            options: [
                {
                    label: 'Nam',
                    value: 'Nam'
                },
                {
                    label: 'Nữ',
                    value: 'Nữ'
                },
                {
                    label: 'Khác',
                    value: 'Khác'
                }
            ]
        },

        {
            label: 'Quốc tịch',
            name: 'nationality',
            type: 'text',
            placeholder: 'Ví dụ: Việt Nam'
        },

        {
            label: 'Ngày sinh',
            name: 'birthday',
            type: 'date'
        },

        {
            label: 'Avatar',
            name: 'avatar',
            type: 'file'
        },

        {
            label: 'Tiểu sử',
            name: 'biography',
            type: 'textarea',
            placeholder: 'Nhập tiểu sử diễn viên'
        }

    ];

    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <>

            <AdminPage

                title="Quản lý diễn viên"

                subtitle="Quản lý toàn bộ diễn viên hệ thống"

                icon={<Smile size={30} />}

                buttonText="Thêm diễn viên"

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
                            data={filteredActors}
                        />

                    )
                }

            </AdminPage>

            {/* =================================================
                FORM MODAL
            ================================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={
                    editingActor
                        ? 'Cập nhật diễn viên'
                        : 'Thêm diễn viên'
                }
            >

                <div
                    style={{
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}
                >

                    {
                        preview && (

                            <img
                                src={preview}
                                alt="preview"
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                }}
                            />

                        )
                    }

                </div>

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    submitText={
                        editingActor
                            ? 'Lưu thay đổi'
                            : 'Thêm diễn viên'
                    }
                />

            </AdminModal>

            {/* =================================================
                ALERT MODAL
            ================================================= */}

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
                                    onClick={alertModal.onCancel}
                                >
                                    Hủy
                                </button>

                            )
                        }

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm || closeAlert
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

export default ActorPage;