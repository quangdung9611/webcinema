import React, {
    useEffect,
    useState,
    useRef,
    useCallback
} from 'react';

import api from '../../../../api/api';

import {
    Monitor,
    Trash2,
    Loader2,
    Layout,
    MapPin,
    Building2,
    Info
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// CONSTANTS
// ==========================================================

/**
 * CHỈ CÓ 4 HẠNG PHÒNG
 *
 * 2D
 * 3D
 * VIP
 * IMAX
 */
const ROOM_TYPES = [
    '2D',
    '3D',
    'VIP',
    'IMAX'
];

// ==========================================================
// ROOM TYPE MAP
// ==========================================================

const roomTypeMap = {
    '2D': 'Phòng 2D',
    '3D': 'Phòng 3D',
    'VIP': 'Phòng VIP',
    'IMAX': 'Phòng IMAX'
};

// ==========================================================
// ROOM TYPE CONFIG
// ==========================================================

const roomTypeConfig = {
    '2D': {
        bg: '#e0f2fe',
        color: '#0284c7',
        icon: '🎬'
    },

    '3D': {
        bg: '#ede9fe',
        color: '#7c3aed',
        icon: '🕶️'
    },

    'VIP': {
        bg: '#fce4ec',
        color: '#e91e63',
        icon: '👑'
    },

    'IMAX': {
        bg: '#dcfce7',
        color: '#16a34a',
        icon: '🌌'
    }
};

// ==========================================================
// DEFAULT ROOM COUNT
// ==========================================================

const DEFAULT_ROOM_COUNT = {
    '2D': 10,
    '3D': 5,
    'VIP': 3,
    'IMAX': 2
};

// ==========================================================
// NORMALIZE ROOM TYPE
// ==========================================================

const normalizeRoomType = (value) => {
    return String(value || '')
        .trim()
        .toUpperCase();
};

// ==========================================================
// COMPONENT
// ==========================================================

const RoomPage = () => {

    // ======================================================
    // DATA
    // ======================================================

    const [rooms, setRooms] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [loading, setLoading] = useState(false);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState('');

    // ======================================================
    // PAGINATION
    // ======================================================

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    // ======================================================
    // FETCH CONTROL
    // ======================================================

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    // ======================================================
    // BULK MODAL
    // ======================================================

    const [isBulkModalOpen, setIsBulkModalOpen] =
        useState(false);

    const [bulkFormData, setBulkFormData] =
        useState({
            cinema_id: '',
            room_types: []
        });

    const [bulkErrors, setBulkErrors] =
        useState({});

    const [bulkLoading, setBulkLoading] =
        useState(false);

    // ======================================================
    // ALERT MODAL
    // ======================================================

    const [alertModal, setAlertModal] =
        useState({
            open: false,
            title: '',
            message: '',
            type: 'default',
            onConfirm: null,
            onCancel: null
        });

    // ======================================================
    // SHOW ALERT
    // ======================================================

    const showAlert = (
        title,
        message,
        type = 'default',
        onConfirm = null,
        onCancel = null
    ) => {
        setAlertModal({
            open: true,
            title,
            message,
            type,
            onConfirm,
            onCancel
        });
    };

    // ======================================================
    // CLOSE ALERT
    // ======================================================

    const closeAlert = () => {
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // ======================================================
    // FETCH ROOMS
    // ======================================================

    const fetchRooms = useCallback(
        async (
            page = 1,
            keyword = ''
        ) => {

            if (isFetching.current) {
                return;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller =
                new AbortController();

            abortControllerRef.current =
                controller;

            isFetching.current = true;
            setLoading(true);

            try {
                const res =
                    await api.get(
                        '/api/rooms/paginated',
                        {
                            params: {
                                page,
                                limit: 20,
                                search:
                                    keyword.trim()
                            },
                            signal:
                                controller.signal
                        }
                    );

                const roomsData =
                    res.data?.data || [];

                const paginationData =
                    res.data?.pagination || {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 1,
                        hasPreviousPage:
                            false,
                        hasNextPage:
                            false
                    };

                setRooms(roomsData);
                setPagination(
                    paginationData
                );

            } catch (error) {

                if (
                    error.name ===
                        'AbortError' ||
                    error.code ===
                        'ERR_CANCELED'
                ) {
                    return;
                }

                console.error(
                    'FETCH ROOMS ERROR:',
                    error
                );

                setRooms([]);

                showAlert(
                    'Lỗi',
                    'Không thể tải danh sách phòng chiếu.',
                    'error'
                );

            } finally {

                setLoading(false);
                isFetching.current = false;

                if (
                    abortControllerRef.current ===
                    controller
                ) {
                    abortControllerRef.current =
                        null;
                }
            }
        },
        []
    );

    // ======================================================
    // FETCH CINEMAS
    // ======================================================

    const fetchCinemas =
        useCallback(async () => {
            try {
                const res =
                    await api.get(
                        '/api/cinemas'
                    );

                const cinemaList =
                    res.data?.data || [];

                setCinemas(
                    cinemaList
                );

            } catch (error) {
                console.error(
                    'FETCH CINEMAS ERROR:',
                    error
                );
            }
        }, []);

    // ======================================================
    // INITIAL FETCH
    // ======================================================

    useEffect(() => {

        fetchRooms(1, '');
        fetchCinemas();

        return () => {
            if (
                abortControllerRef.current
            ) {
                abortControllerRef.current.abort();
            }
        };

    }, [
        fetchRooms,
        fetchCinemas
    ]);

    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================

    const prevSearchRef =
        useRef('');

    useEffect(() => {

        const currentSearch =
            search;

        const previousSearch =
            prevSearchRef.current;

        if (
            currentSearch ===
            previousSearch
        ) {
            return;
        }

        prevSearchRef.current =
            currentSearch;

        const timer =
            setTimeout(() => {
                fetchRooms(
                    1,
                    currentSearch
                );
            }, 400);

        return () =>
            clearTimeout(timer);

    }, [
        search,
        fetchRooms
    ]);

    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (
        page
    ) => {
        fetchRooms(
            page,
            search
        );
    };

    // ======================================================
    // DELETE ROOM
    // ======================================================

    const handleDelete = (
        room
    ) => {

        showAlert(
            'Xác nhận xóa',

            `Bạn có chắc muốn xóa phòng "${room.room_name}"?`,

            'warning',

            async () => {

                try {

                    await api.delete(
                        `/api/rooms/${room.room_id}`
                    );

                    closeAlert();

                    const currentPage =
                        pagination.page;

                    const newPage =
                        rooms.length === 1 &&
                        currentPage > 1
                            ? currentPage - 1
                            : currentPage;

                    await fetchRooms(
                        newPage,
                        search
                    );

                    showAlert(
                        'Thành công',
                        'Xóa phòng chiếu thành công.',
                        'success'
                    );

                } catch (error) {

                    console.error(
                        'DELETE ROOM ERROR:',
                        error
                    );

                    closeAlert();

                    showAlert(
                        'Lỗi',
                        error.response?.data
                            ?.message ||
                            'Không thể xóa phòng chiếu.',
                        'error'
                    );
                }
            },

            closeAlert
        );
    };

    // ======================================================
    // OPEN BULK MODAL
    // ======================================================

    const handleOpenBulkModal =
        () => {

            setBulkFormData({
                cinema_id: '',
                room_types: []
            });

            setBulkErrors({});

            setIsBulkModalOpen(
                true
            );
        };

    // ======================================================
    // BULK CHANGE
    // ======================================================

    const handleBulkChange = (
        e
    ) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        // ==================================================
        // CHECKBOX ROOM TYPES
        // ==================================================

        if (
            type === 'checkbox' &&
            name === 'room_types'
        ) {

            const normalizedValue =
                normalizeRoomType(
                    value
                );

            setBulkFormData(
                (prev) => {

                    const currentTypes =
                        Array.isArray(
                            prev.room_types
                        )
                            ? prev.room_types
                            : [];

                    const normalizedCurrentTypes =
                        currentTypes.map(
                            normalizeRoomType
                        );

                    // ======================================
                    // CHECK
                    // ======================================

                    if (checked) {

                        if (
                            normalizedCurrentTypes.includes(
                                normalizedValue
                            )
                        ) {
                            return prev;
                        }

                        return {
                            ...prev,

                            room_types: [
                                ...normalizedCurrentTypes,
                                normalizedValue
                            ]
                        };
                    }

                    // ======================================
                    // UNCHECK
                    // ======================================

                    return {
                        ...prev,

                        room_types:
                            normalizedCurrentTypes.filter(
                                (roomType) =>
                                    roomType !==
                                    normalizedValue
                            )
                    };
                }
            );

            // Xóa lỗi sau khi chọn
            if (
                bulkErrors.room_types
            ) {
                setBulkErrors(
                    (prev) => ({
                        ...prev,
                        room_types: ''
                    })
                );
            }

            return;
        }

        // ==================================================
        // FIELD KHÁC
        // ==================================================

        if (
            bulkErrors[name]
        ) {
            setBulkErrors(
                (prev) => ({
                    ...prev,
                    [name]: ''
                })
            );
        }

        setBulkFormData(
            (prev) => ({
                ...prev,
                [name]: value
            })
        );
    };

    // ======================================================
    // BULK SUBMIT
    // ======================================================

    const handleBulkSubmit =
        async (e) => {

            e.preventDefault();

            // ==============================================
            // VALIDATE
            // ==============================================

            const errors = {};

            if (
                !bulkFormData.cinema_id
            ) {
                errors.cinema_id =
                    'Vui lòng chọn rạp chiếu';
            }

            const selectedRoomTypes =
                Array.isArray(
                    bulkFormData.room_types
                )
                    ? [
                        ...new Set(
                            bulkFormData.room_types
                                .map(
                                    normalizeRoomType
                                )
                                .filter(
                                    (type) =>
                                        ROOM_TYPES.includes(
                                            type
                                        )
                                )
                        )
                    ]
                    : [];

            if (
                selectedRoomTypes.length ===
                0
            ) {
                errors.room_types =
                    'Vui lòng chọn ít nhất một loại phòng';
            }

            if (
                Object.keys(errors).length >
                0
            ) {
                setBulkErrors(
                    errors
                );
                return;
            }

            setBulkLoading(true);

            try {

                const payload = {
                    cinema_id:
                        Number(
                            bulkFormData.cinema_id
                        ),

                    room_types:
                        selectedRoomTypes
                };

                console.log(
                    '🏢 [ROOM BULK CREATE] Payload:',
                    payload
                );

                const res =
                    await api.post(
                        '/api/rooms/bulk',
                        payload
                    );

                setIsBulkModalOpen(
                    false
                );

                const createdCount =
                    res.data?.data
                        ?.created || 0;

                const totalCount =
                    res.data?.data
                        ?.total || 0;

                const successMessage =
                    `Tạo thành công ${createdCount}/${totalCount} phòng. Ghế đã được tự động tạo cho từng phòng!`;

                showAlert(
                    'Thành công',
                    successMessage,
                    'success'
                );

                await fetchRooms(
                    1,
                    search
                );

            } catch (error) {

                console.error(
                    'BULK CREATE ERROR:',
                    error
                );

                const backendField =
                    error.response?.data
                        ?.field;

                const backendError =
                    error.response?.data
                        ?.message ||
                    'Không thể tạo phòng hàng loạt.';

                if (
                    backendField
                ) {

                    setBulkErrors({
                        [backendField]:
                            backendError
                    });

                } else {

                    showAlert(
                        'Lỗi',
                        backendError,
                        'error'
                    );
                }

            } finally {

                setBulkLoading(
                    false
                );
            }
        };

    // ======================================================
    // RENDER TYPE BADGE
    // ======================================================

    const renderTypeBadge = (
        type
    ) => {

        const normalizedType =
            normalizeRoomType(
                type
            );

        const config =
            roomTypeConfig[
                normalizedType
            ] || {
                bg: '#e2e8f0',
                color: '#475569',
                icon: '📽️'
            };

        const displayName =
            roomTypeMap[
                normalizedType
            ] ||
            normalizedType;

        return (
            <span
                style={{
                    background:
                        config.bg,

                    color:
                        config.color,

                    padding:
                        '7px 12px',

                    borderRadius:
                        '999px',

                    fontSize:
                        '12px',

                    fontWeight:
                        '700',

                    display:
                        'inline-flex',

                    alignItems:
                        'center',

                    gap: '6px'
                }}
            >
                <span>
                    {config.icon}
                </span>

                {displayName}
            </span>
        );
    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [
        {
            title: 'Phòng chiếu',

            key: 'room_name',

            render: (row) => (
                <div
                    style={{
                        display:
                            'flex',

                        alignItems:
                            'center',

                        gap: '14px'
                    }}
                >
                    <div
                        style={{
                            width:
                                '48px',

                            height:
                                '48px',

                            borderRadius:
                                '14px',

                            background:
                                'linear-gradient(135deg, #2563eb, #1d4ed8)',

                            color:
                                '#fff',

                            display:
                                'flex',

                            alignItems:
                                'center',

                            justifyContent:
                                'center',

                            boxShadow:
                                '0 4px 14px rgba(37,99,235,0.35)'
                        }}
                    >
                        <Monitor
                            size={20}
                        />
                    </div>

                    <div>
                        <div
                            style={{
                                fontWeight:
                                    '700',

                                fontSize:
                                    '15px',

                                color:
                                    'var(--text-heading)'
                            }}
                        >
                            {
                                row.room_name
                            }
                        </div>

                        <small
                            style={{
                                color:
                                    'var(--text-muted)',

                                display:
                                    'flex',

                                alignItems:
                                    'center',

                                gap: '4px',

                                marginTop:
                                    '4px'
                            }}
                        >
                            <Building2
                                size={
                                    13
                                }
                            />

                            Room ID: #
                            {
                                row.room_id
                            }
                        </small>
                    </div>
                </div>
            )
        },

        {
            title: 'Loại phòng',

            key: 'room_type',

            render: (row) =>
                renderTypeBadge(
                    row.room_type
                )
        },

        {
            title: 'Rạp chiếu',

            key: 'cinema_name',

            render: (row) => (
                <div>
                    <div
                        style={{
                            display:
                                'flex',

                            alignItems:
                                'center',

                            gap: '6px',

                            fontWeight:
                                '700',

                            color:
                                'var(--text-heading)'
                        }}
                    >
                        <Layout
                            size={15}
                            style={{
                                color:
                                    'var(--silver-primary)'
                            }}
                        />

                        {
                            row.cinema_name
                        }
                    </div>

                    <div
                        style={{
                            marginTop:
                                '7px',

                            color:
                                'var(--text-secondary)',

                            display:
                                'flex',

                            alignItems:
                                'center',

                            gap: '5px',

                            fontSize:
                                '13px'
                        }}
                    >
                        <MapPin
                            size={13}
                            style={{
                                color:
                                    'var(--silver-primary)'
                            }}
                        />

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
                        type="button"
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(
                                row
                            )
                        }
                        title="Xóa"
                    >
                        <Trash2
                            size={16}
                        />
                    </button>
                </div>
            )
        }
    ];

    // ======================================================
    // BULK FORM FIELDS
    // ======================================================

    const bulkFields = [
        {
            label:
                'Rạp chiếu',

            name:
                'cinema_id',

            type:
                'select',

            required:
                true,

            options: [
                {
                    label:
                        '-- Chọn rạp --',

                    value:
                        ''
                },

                ...cinemas.map(
                    (cinema) => ({
                        label:
                            `${cinema.cinema_name} (${cinema.city})`,

                        value:
                            cinema.cinema_id
                    })
                )
            ]
        },

        {
            label:
                'Hạng phòng',

            name:
                'room_types',

            type:
                'checkbox',

            required:
                true,

            options:
                ROOM_TYPES.map(
                    (type) => ({
                        label:
                            `${roomTypeConfig[type]?.icon || '📽️'} ${roomTypeMap[type]} (${DEFAULT_ROOM_COUNT[type]} phòng)`,

                        value:
                            type
                    })
                )
        }
    ];

    // ======================================================
    // ALERT VARIANT
    // ======================================================

    const alertVariant =
        alertModal.onConfirm
            ? 'confirm'
            : 'alert';

    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>
            {/* ==================================================
                ADMIN PAGE
            ================================================== */}

            <AdminPage
                title="Quản lý phòng chiếu"
                subtitle="Quản lý toàn bộ phòng chiếu trong hệ thống"
                icon={
                    <Monitor
                        size={30}
                    />
                }
                buttonText="Tạo phòng hàng loạt"
                onAdd={
                    handleOpenBulkModal
                }
                searchValue={
                    search
                }
                onSearchChange={
                    setSearch
                }
            >
                {loading ? (
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
                    <>
                        <AdminTable
                            columns={
                                columns
                            }
                            data={
                                rooms
                            }
                        />

                        <AdminPagination
                            currentPage={
                                pagination.page
                            }
                            totalPages={
                                pagination.totalPages
                            }
                            onPageChange={
                                handlePageChange
                            }
                        />
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                BULK MODAL
            ================================================== */}

            <AdminModal
                open={
                    isBulkModalOpen
                }
                onClose={() => {
                    if (
                        !bulkLoading
                    ) {
                        setIsBulkModalOpen(
                            false
                        );
                    }
                }}
                title="Tạo phòng hàng loạt"
                type="default"
                variant="custom"
                size="lg"
            >
                <div
                    style={{
                        marginBottom:
                            '16px'
                    }}
                >
                    <div
                        style={{
                            padding:
                                '14px 18px',

                            borderRadius:
                                '10px',

                            background:
                                'rgba(59, 130, 246, 0.08)',

                            border:
                                '1px solid rgba(59, 130, 246, 0.15)'
                        }}
                    >
                        <div
                            style={{
                                display:
                                    'flex',

                                alignItems:
                                    'center',

                                gap:
                                    '8px',

                                fontWeight:
                                    '600',

                                marginBottom:
                                    '6px'
                            }}
                        >
                            <Info
                                size={18}
                            />

                            Thông tin
                        </div>

                        <div
                            style={{
                                fontSize:
                                    '14px',

                                color:
                                    '#64748b',

                                lineHeight:
                                    '1.6'
                            }}
                        >
                            Hệ thống sẽ tự động
                            tạo số lượng phòng
                            cho từng hạng và
                            tự động tạo ghế
                            tương ứng.

                            <br />

                            <strong>
                                Số lượng phòng mặc định:
                            </strong>

                            <br />

                            {ROOM_TYPES.map(
                                (type) => (
                                    <span
                                        key={
                                            type
                                        }
                                        style={{
                                            marginRight:
                                                '12px'
                                        }}
                                    >
                                        {
                                            roomTypeConfig[
                                                type
                                            ]?.icon
                                        }{' '}

                                        {
                                            roomTypeMap[
                                                type
                                            ]
                                        }:{' '}

                                        <strong>
                                            {
                                                DEFAULT_ROOM_COUNT[
                                                    type
                                                ]
                                            }
                                        </strong>
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <AdminForm
                    fields={
                        bulkFields
                    }
                    formData={
                        bulkFormData
                    }
                    errors={
                        bulkErrors
                    }
                    onChange={
                        handleBulkChange
                    }
                    onSubmit={
                        handleBulkSubmit
                    }
                    loading={
                        bulkLoading
                    }
                    submitText="Tạo hàng loạt"
                />
            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL
            ================================================== */}

            <AdminModal
                open={
                    alertModal.open
                }
                onClose={
                    closeAlert
                }
                title={
                    alertModal.title
                }
                type={
                    alertModal.type
                }
                variant={
                    alertVariant
                }
                size="sm"
                onConfirm={
                    alertModal.onConfirm ||
                    closeAlert
                }
                onCancel={
                    alertModal.onCancel ||
                    closeAlert
                }
                confirmText="Xác nhận"
                cancelText="Hủy"
            >
                <div className="admin-alert-content">
                    <p>
                        {
                            alertModal.message
                        }
                    </p>
                </div>
            </AdminModal>
        </>
    );
};

export default RoomPage;