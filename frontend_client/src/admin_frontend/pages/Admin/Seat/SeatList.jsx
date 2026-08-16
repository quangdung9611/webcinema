import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/api';

import {
    Zap,
    Trash2,
    Info,
    AlertTriangle,
    Clock,
    User,
    Settings,
    Loader2,
    CheckCircle
} from 'lucide-react';

import AdminModal from '../../../components/AdminModal';
import Seat from '../../../../user_frontend/components/Seat';

import '../../../styles/AdminSeat.css';


/* ==========================================================================
   ADMIN SEAT LIST
   QUẢN LÝ SƠ ĐỒ GHẾ

   HỆ THỐNG 5 LOẠI GHẾ:

   1. STANDARD / NORMAL
      → Ghế thường

   2. VIP
      → Ghế VIP

   3. DELUXE
      → Ghế Deluxe - ghế đơn

   4. RECLINER
      → Ghế Recliner - ghế đơn

   5. COUPLE
      → Ghế đôi

   LƯU Ý:
   - Chỉ COUPLE được xem là ghế đôi.
   - Không dựa vào hàng cuối để xác định ghế đôi.
   - seat_type từ database là nguồn xác định loại ghế.
   - Couple hiển thị dạng:
       L3-L4
       L5-L6
       L7-L8
   - Database vẫn lưu từng seat riêng:
       L3
       L4
       L5
       L6
   ========================================================================== */


const SeatList = () => {

    /* ==========================================================
       STATE
    ========================================================== */

    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [seats, setSeats] = useState([]);

    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');

    const [loading, setLoading] = useState(false);

    const [modal, setModal] = useState({
        isOpen: false,
        type: '',
        data: null,
        title: ''
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);


    /* ==========================================================
       FETCH CINEMAS
    ========================================================== */

    const fetchCinemas = useCallback(async () => {

        try {

            const res = await api.get('/api/cinemas');

            const cinemaList = res.data?.data || [];

            setCinemas(cinemaList);

        } catch (err) {

            console.error('❌ Lỗi lấy rạp:', err);

        }

    }, []);


    useEffect(() => {

        fetchCinemas();

    }, [fetchCinemas]);


    /* ==========================================================
       FETCH ROOMS BY CINEMA
    ========================================================== */

    const fetchRooms = useCallback(async (cinemaId) => {

        if (!cinemaId) {

            setRooms([]);
            setSelectedRoom('');
            setSeats([]);

            return;
        }

        try {

            const res = await api.get(
                `/api/rooms/cinema/${cinemaId}`
            );

            const roomList = res.data?.data || [];

            setRooms(roomList);

            setSelectedRoom('');
            setSeats([]);

        } catch (err) {

            console.error('❌ Lỗi lấy phòng:', err);

            setRooms([]);

        }

    }, []);


    useEffect(() => {

        fetchRooms(selectedCinema);

    }, [selectedCinema, fetchRooms]);


    /* ==========================================================
       FETCH SEATS BY ROOM
    ========================================================== */

    const fetchSeats = useCallback(async (roomId) => {

        if (!roomId) {

            setSeats([]);

            return;
        }

        /* Hủy request cũ nếu có */

        if (abortControllerRef.current) {

            abortControllerRef.current.abort();

        }

        const controller = new AbortController();

        abortControllerRef.current = controller;

        isFetching.current = true;

        setLoading(true);

        try {

            const res = await api.get(
                `/api/seats/room/${roomId}`,
                {
                    signal: controller.signal
                }
            );

            let seatList = [];

            if (
                res.data?.success === true &&
                Array.isArray(res.data.data)
            ) {

                seatList = res.data.data;

            } else if (Array.isArray(res.data)) {

                seatList = res.data;

            } else {

                console.warn(
                    '⚠️ Dữ liệu ghế không đúng định dạng:',
                    res.data
                );

            }

            setSeats(seatList);

        } catch (err) {

            if (
                err.name === 'AbortError' ||
                err.code === 'ERR_CANCELED'
            ) {

                console.log('🛑 Fetch seats bị hủy');

                return;
            }

            console.error('❌ Lỗi lấy ghế:', err);

            setSeats([]);

        } finally {

            setLoading(false);

            isFetching.current = false;

            if (abortControllerRef.current === controller) {

                abortControllerRef.current = null;

            }

        }

    }, []);


    useEffect(() => {

        fetchSeats(selectedRoom);

    }, [selectedRoom, fetchSeats]);


    /* ==========================================================
       HELPER:
       LẤY TÊN GHẾ HIỂN THỊ

       STANDARD:
       L1

       COUPLE:
       L3 L4
       L5 L6
       L7 L8

       Database vẫn lưu riêng từng seat.
    ========================================================== */

    const getSeatDisplayName = useCallback((seat) => {

        if (!seat) {
            return '';
        }

        const seatRow = seat.seat_row || '';

        const seatType =
            seat.seat_type?.toUpperCase() || 'STANDARD';

        const seatNumber = Number(seat.seat_number);

        /* ======================================================
           GHẾ ĐÔI
        ====================================================== */

        if (
            seatType === 'COUPLE' &&
            !Number.isNaN(seatNumber)
        ) {

            /*
             * Nếu click ghế số lẻ:
             * 3 → 3 + 4
             *
             * Nếu vì lý do nào đó click ghế số chẵn:
             * 4 → 3 + 4
             */

            const firstNumber =
                seatNumber % 2 === 1
                    ? seatNumber
                    : seatNumber - 1;

            const secondNumber =
                firstNumber + 1;

            return `${seatRow}${firstNumber} ${seatRow}${secondNumber}`;
        }

        /* ======================================================
           GHẾ ĐƠN
        ====================================================== */

        return `${seatRow}${seat.seat_number}`;

    }, []);


    /* ==========================================================
       HELPER:
       LẤY SỐ HIỂN THỊ GHẾ

       Couple:
       3-4

       Standard:
       3
    ========================================================== */

    const getSeatDisplayNumber = useCallback((seat) => {

        if (!seat) {
            return '';
        }

        const seatType =
            seat.seat_type?.toUpperCase() || 'STANDARD';

        const seatNumber = Number(seat.seat_number);

        if (
            seatType === 'COUPLE' &&
            !Number.isNaN(seatNumber)
        ) {

            const firstNumber =
                seatNumber % 2 === 1
                    ? seatNumber
                    : seatNumber - 1;

            return `${firstNumber}-${firstNumber + 1}`;
        }

        return seat.seat_number;

    }, []);


    /* ==========================================================
       MODAL CONFIRM
    ========================================================== */

    const handleModalConfirm = async () => {

        console.log(
            '🔹 handleModalConfirm:',
            modal.type
        );


        /* ======================================================
           MODAL THÔNG BÁO
        ====================================================== */

        if (
            ['info', 'error', 'success'].includes(modal.type)
        ) {

            if (modal.type === 'success') {

                await fetchSeats(selectedRoom);

            }

            setModal({

                ...modal,

                isOpen: false

            });

            return;
        }


        /* ======================================================
           KIỂM TRA PHÒNG
        ====================================================== */

        if (!selectedRoom) {

            setModal({

                isOpen: true,

                type: 'error',

                title: 'Thiếu thông tin',

                data:
                    'Vui lòng chọn phòng trước khi thực hiện thao tác.'

            });

            return;
        }


        setLoading(true);


        try {

            const roomInfo = rooms.find(
                room => room.room_id == selectedRoom
            );

            const roomType =
                roomInfo?.room_type || '2D';


            /* ==================================================
               BẢO TRÌ / MỞ GHẾ
            ================================================== */

            if (modal.type === 'maintenance') {

                const seat = modal.data;

                const seatType =
                    seat.seat_type?.toUpperCase() ||
                    'STANDARD';

                const seatNumber =
                    Number(seat.seat_number);

                const isCouple =
                    seatType === 'COUPLE';


                /* ==================================================
                   TÍNH TÊN GHẾ HIỂN THỊ

                   STANDARD:
                   L3

                   COUPLE:
                   L3 L4
                   ================================================== */

                const displaySeatName =
                    getSeatDisplayName(seat);


                /* ==================================================
                   SỐ TRẠNG THÁI TIẾP THEO

                   1 → 0
                   đang hoạt động → khóa bảo trì

                   0 → 1
                   đang bảo trì → mở hoạt động
                ================================================== */

                const nextActive =
                    seat.is_active
                        ? 0
                        : 1;


                console.log(
                    '🪑 Thay đổi trạng thái ghế:',
                    {
                        seatId: seat.seat_id,
                        seatType,
                        seatNumber,
                        isCouple,
                        displaySeatName,
                        nextActive
                    }
                );


                /* ==================================================
                   GỌI BACKEND

                   Backend hiện tại đã xử lý:
                   COUPLE → khóa/mở cả 2 record.

                   Ví dụ:
                   seatId = L3

                   Backend:
                   L3 → inactive
                   L4 → inactive
                   ================================================== */

                await api.put(
                    '/api/seats/toggle-active',
                    {
                        seatId: seat.seat_id,

                        isActive: nextActive
                    }
                );


                /* ==================================================
                   LOAD LẠI SƠ ĐỒ
                ================================================== */

                await fetchSeats(selectedRoom);


                /* ==================================================
                   NỘI DUNG THÔNG BÁO
                ================================================== */

                const actionText =
                    nextActive === 0
                        ? 'khóa bảo trì'
                        : 'mở hoạt động';


                /*
                 * KẾT QUẢ:
                 *
                 * Ghế thường:
                 * Đã khóa bảo trì ghế L1
                 *
                 * Ghế đôi:
                 * Đã khóa bảo trì ghế L3 L4
                 *
                 * Mở:
                 * Đã mở hoạt động ghế L3 L4
                 */

                setModal({

                    isOpen: true,

                    type: 'success',

                    title: 'Thành công',

                    data:
                        `Đã ${actionText} ghế ${displaySeatName}`

                });

            }


            /* ==================================================
               KHỞI TẠO PHÔI GHẾ
            ================================================== */

            else if (modal.type === 'init') {

                const payload = {

                    roomId:
                        Number(selectedRoom),

                    roomType,

                    cinemaId:
                        Number(selectedCinema)

                };


                console.log(
                    '🚀 Gọi API /api/seats/init:',
                    payload
                );


                const response = await api.post(
                    '/api/seats/init',
                    payload
                );


                console.log(
                    '✅ Response:',
                    response.data
                );


                await fetchSeats(selectedRoom);


                setModal({

                    isOpen: true,

                    type: 'success',

                    title: 'Khởi tạo thành công',

                    data:
                        response.data?.message ||
                        `Đã tạo phôi ghế cho phòng ${
                            roomInfo?.room_name || ''
                        }`

                });

            }


            /* ==================================================
               XÓA SƠ ĐỒ GHẾ
            ================================================== */

            else if (modal.type === 'delete') {

                await api.delete(
                    `/api/seats/room/${selectedRoom}`
                );


                setSeats([]);


                setModal({

                    isOpen: true,

                    type: 'success',

                    title: 'Xóa thành công',

                    data:
                        'Đã xóa sạch sơ đồ ghế của phòng này.'

                });

            }

        } catch (err) {

            console.error(
                '❌ Lỗi:',
                err
            );


            setModal({

                isOpen: true,

                type: 'error',

                title: 'Thao tác thất bại',

                data:
                    err.response?.data?.message ||
                    err.message ||
                    'Đã xảy ra lỗi.'

            });

        } finally {

            setLoading(false);

        }

    };


    /* ==========================================================
       GROUP SEATS BY ROW
    ========================================================== */

    const groupedSeats = seats.reduce(

        (acc, seat) => {

            const row =
                seat.seat_row || '?';


            if (!acc[row]) {

                acc[row] = [];

            }


            acc[row].push(seat);


            acc[row].sort(

                (a, b) =>
                    Number(a.seat_number) -
                    Number(b.seat_number)

            );


            return acc;

        },

        {}

    );


    /* ==========================================================
       SORT ROW
    ========================================================== */

    const sortedRows =
        Object.keys(groupedSeats).sort(

            (a, b) => {

                const aNum =
                    parseInt(a);

                const bNum =
                    parseInt(b);


                if (
                    !isNaN(aNum) &&
                    !isNaN(bNum)
                ) {

                    return aNum - bNum;

                }


                return a.localeCompare(b);

            }

        );


    /* ==========================================================
       XÁC ĐỊNH GHẾ CÓ HIỂN THỊ HAY KHÔNG

       STANDARD
       VIP
       DELUXE
       RECLINER
       → luôn hiển thị.

       COUPLE
       → chỉ hiển thị ghế số lẻ.

       Database:

       1
       2
       3
       4
       5
       6

       UI:

       1-2
       3-4
       5-6
    ========================================================== */

    const shouldShowSeat = (seat) => {

        const seatType =
            seat.seat_type?.toUpperCase() ||
            'STANDARD';


        if (seatType === 'COUPLE') {

            const num =
                Number(seat.seat_number);


            return num % 2 === 1;

        }


        return true;

    };


    /* ==========================================================
       RENDER
    ========================================================== */

    return (

        <div className="admin-seat-container">


            {/* ==================================================
                MODAL
            ================================================== */}

            <AdminModal

                open={modal.isOpen}

                onClose={() => {

                    if (
                        modal.type === 'success'
                    ) {

                        fetchSeats(
                            selectedRoom
                        );

                    }


                    setModal({

                        ...modal,

                        isOpen: false

                    });

                }}

                title={modal.title}

                onConfirm={
                    handleModalConfirm
                }

                confirmLoading={
                    loading
                }

                confirmText={

                    [
                        'info',
                        'error',
                        'success'
                    ].includes(
                        modal.type
                    )

                        ? 'Đóng'

                        : 'Xác nhận'

                }

                cancelText={

                    [
                        'info',
                        'error',
                        'success'
                    ].includes(
                        modal.type
                    )

                        ? undefined

                        : 'Hủy'

                }

            >


                {/* ==================================================
                    MODAL BẢO TRÌ
                ================================================== */}

                {modal.type === 'maintenance' ? (

                    <div className="modal-body-content text-center">

                        <Settings
                            size={40}
                            className="mb-3"
                            color="#ffc107"
                        />


                        <p>

                            Bạn có muốn{' '}

                            <strong>

                                {
                                    /* 🔥 SỬA LẠI Ở ĐÂY: Đã đảo ngược logic text để đúng với hành động */
                                    modal.data?.is_active
                                        ? 'KHÓA BẢO TRÌ'
                                        : 'MỞ HOẠT ĐỘNG'
                                }

                            </strong>{' '}

                            ghế{' '}

                            <strong>

                                {
                                    getSeatDisplayName(
                                        modal.data
                                    )
                                }

                            </strong>

                            ?

                        </p>


                        <small className="text-muted">

                            * Ghế bảo trì sẽ không hiển thị
                            khi khách đặt vé.

                        </small>

                    </div>

                ) : modal.type === 'info' ? (


                    /* ==================================================
                       MODAL GHẾ ĐÃ ĐẶT
                    ================================================== */

                    <div className="modal-body-info">

                        <div className="info-row">

                            <User size={18} />

                            <span>

                                Khách hàng:{' '}

                                <strong>

                                    {
                                        modal.data
                                            ?.customer_name ||
                                        'N/A'
                                    }

                                </strong>

                            </span>

                        </div>


                        <div className="info-row">

                            <Clock size={18} />

                            <span>

                                Thời gian đặt:{' '}

                                {
                                    modal.data
                                        ?.booking_time

                                        ? new Date(
                                            modal.data
                                                .booking_time
                                        ).toLocaleString(
                                            'vi-VN'
                                        )

                                        : 'N/A'
                                }

                            </span>

                        </div>


                        <div className="status-badge booked">

                            ĐÃ CÓ VÉ

                        </div>


                        <p className="warning-text">

                            Ghế đã bán,
                            bạn chỉ được phép xem thông tin!

                        </p>

                    </div>


                ) : modal.type === 'error' ? (


                    /* ==================================================
                       MODAL ERROR
                    ================================================== */

                    <div className="modal-body-warning">

                        <AlertTriangle
                            size={32}
                            color="#ff4757"
                        />

                        <p
                            className="mt-2"
                            style={{
                                color: '#ff4757',
                                fontWeight: 'bold'
                            }}
                        >

                            {modal.data}

                        </p>

                    </div>


                ) : modal.type === 'success' ? (


                    /* ==================================================
                       MODAL SUCCESS
                    ================================================== */

                    <div className="modal-body-success">

                        <CheckCircle
                            size={48}
                            color="#2ed573"
                        />

                        <p
                            className="mt-2"
                            style={{
                                color: '#2ed573',
                                fontWeight: 'bold',
                                fontSize: '1.1rem'
                            }}
                        >

                            {modal.data}

                        </p>

                    </div>


                ) : (


                    /* ==================================================
                       MODAL INIT / DELETE
                    ================================================== */

                    <div className="modal-body-warning">

                        <AlertTriangle
                            size={32}
                            color={
                                modal.type === 'delete'
                                    ? '#ff4757'
                                    : '#ffb020'
                            }
                        />

                        <p>

                            {
                                modal.type === 'delete'

                                    ? 'Bạn có chắc chắn muốn XÓA SẠCH sơ đồ ghế của phòng này không?'

                                    : 'Bạn có chắc chắn muốn KHỞI TẠO lại sơ đồ ghế cho phòng này không?'

                            }

                        </p>


                        <small
                            style={{
                                color:
                                    'var(--text-muted)'
                            }}
                        >

                            {
                                modal.type === 'delete'

                                    ? 'Hành động này sẽ xóa tất cả ghế hiện có và không thể khôi phục.'

                                    : 'Hành động này sẽ tạo mới toàn bộ ghế theo cấu hình mặc định.'

                            }

                        </small>

                    </div>

                )}

            </AdminModal>


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="seat-list-header">

                <h2>

                    QUẢN LÝ SƠ ĐỒ GHẾ

                </h2>


                <div className="filter-controls">


                    {/* RẠP */}

                    <div className="filter-group">

                        <label>

                            Rạp:

                        </label>


                        <select

                            value={
                                selectedCinema
                            }

                            onChange={(e) =>
                                setSelectedCinema(
                                    e.target.value
                                )
                            }

                        >

                            <option value="">

                                -- Chọn rạp --

                            </option>


                            {cinemas.map(

                                cinema => (

                                    <option
                                        key={
                                            cinema.cinema_id
                                        }
                                        value={
                                            cinema.cinema_id
                                        }
                                    >

                                        {
                                            cinema.cinema_name
                                        }

                                    </option>

                                )

                            )}

                        </select>

                    </div>


                    {/* PHÒNG */}

                    <div className="filter-group">

                        <label>

                            Phòng:

                        </label>


                        <select

                            value={
                                selectedRoom
                            }

                            onChange={(e) =>
                                setSelectedRoom(
                                    e.target.value
                                )
                            }

                            disabled={
                                !selectedCinema
                            }

                        >

                            <option value="">

                                -- Chọn phòng --

                            </option>


                            {rooms.map(

                                room => (

                                    <option
                                        key={
                                            room.room_id
                                        }
                                        value={
                                            room.room_id
                                        }
                                    >

                                        {
                                            room.room_name
                                        }{' '}

                                        (

                                        {
                                            room.room_type
                                        }

                                        )

                                    </option>

                                )

                            )}

                        </select>

                    </div>


                    {/* ACTION BUTTONS */}

                    {selectedRoom &&
                        !loading && (

                            <div className="action-buttons">

                                <button
                                    className="btn btn-init"

                                    onClick={() =>
                                        setModal({
                                            isOpen: true,
                                            type: 'init',
                                            title:
                                                'Khởi tạo phôi ghế',
                                            data: null
                                        })
                                    }
                                >

                                    <Zap size={18} />

                                    Khởi tạo

                                </button>


                                <button
                                    className="btn btn-delete"

                                    onClick={() =>
                                        setModal({
                                            isOpen: true,
                                            type: 'delete',
                                            title:
                                                'Xóa sạch sơ đồ',
                                            data: null
                                        })
                                    }
                                >

                                    <Trash2 size={18} />

                                    Xóa sạch

                                </button>

                            </div>

                        )}

                </div>

            </div>


            <hr />


            {/* ==================================================
                CONTENT
            ================================================== */}

            <div className="seat-content-area">


                {/* LOADING */}

                {loading ? (

                    <div className="loading-text">

                        <Loader2
                            size={36}
                            className="spin-icon"
                        />

                        <span>

                            Đang tải...

                        </span>

                    </div>


                ) : seats.length > 0 ? (


                    <div className="seat-map-wrapper">


                        {/* ==================================================
                            MÀN HÌNH
                        ================================================== */}

                        <div className="screen-big">

                            <span className="screen-label">

                                MÀN HÌNH

                            </span>

                        </div>


                        {/* ==================================================
                            SƠ ĐỒ GHẾ
                        ================================================== */}

                        <div className="seats-layout">

                            {sortedRows.map(

                                row => {

                                    const rowSeats =
                                        groupedSeats[
                                            row
                                        ] || [];


                                    const filteredSeats =
                                        rowSeats.filter(
                                            shouldShowSeat
                                        );


                                    return (

                                        <div
                                            key={row}
                                            className="seat-row"
                                        >


                                            {/* TÊN HÀNG */}

                                            <span className="row-id">

                                                {row}

                                            </span>


                                            {/* GHẾ */}

                                            <div className="row-items">

                                                {filteredSeats.map(

                                                    seat => {


                                                        /* ==================================================
                                                           TRẠNG THÁI GHẾ
                                                        ================================================== */

                                                        const isMaint =
                                                            seat.is_active === 0;

                                                        const isBooked =
                                                            !!seat.customer_name;


                                                        /* ==================================================
                                                           LOẠI GHẾ
                                                        ================================================== */

                                                        const seatType =
                                                            seat.seat_type
                                                                ?.toUpperCase() ||
                                                            'STANDARD';


                                                        /* ==================================================
                                                           SỐ GHẾ HIỂN THỊ
                                                        ================================================== */

                                                        const displayNumber =
                                                            getSeatDisplayNumber(
                                                                seat
                                                            );


                                                        /* ==================================================
                                                           CLICK GHẾ
                                                        ================================================== */

                                                        const handleClick =
                                                            () => {


                                                                /* ==================================================
                                                                   GHẾ ĐÃ BÁN
                                                                ================================================== */

                                                                if (
                                                                    isBooked
                                                                ) {

                                                                    setModal({

                                                                        isOpen:
                                                                            true,

                                                                        type:
                                                                            'info',

                                                                        data:
                                                                            seat,

                                                                        title:
                                                                            `Thông tin Ghế ${getSeatDisplayName(
                                                                                seat
                                                                            )}`

                                                                    });

                                                                    return;

                                                                }


                                                                /* ==================================================
                                                                   GHẾ CHƯA BÁN
                                                                   → CHO PHÉP BẢO TRÌ
                                                                ================================================== */

                                                                setModal({

                                                                    isOpen:
                                                                        true,

                                                                    type:
                                                                        'maintenance',

                                                                    data:
                                                                        seat,

                                                                    title:
                                                                        `Chỉnh sửa bảo trì ghế ${getSeatDisplayName(
                                                                            seat
                                                                        )}`

                                                                });

                                                            };


                                                        return (

                                                            <Seat

                                                                key={
                                                                    seat.seat_id
                                                                }

                                                                type={
                                                                    seatType
                                                                }

                                                                selected={
                                                                    false
                                                                }

                                                                sold={
                                                                    isBooked
                                                                }

                                                                maintenance={
                                                                    isMaint
                                                                }

                                                                number={
                                                                    displayNumber
                                                                }

                                                                onClick={
                                                                    handleClick
                                                                }

                                                                /* ✅ SỬA LẠI Ở ĐÂY: Bật chế độ Admin để vẫn bấm được vào ghế bảo trì */
                                                                adminMode={
                                                                    true
                                                                }

                                                            />

                                                        );

                                                    }

                                                )}

                                            </div>

                                        </div>

                                    );

                                }

                            )}

                        </div>


                        {/* ==================================================
                            LEGEND
                            5 LOẠI GHẾ
                        ================================================== */}

                        <div className="seat-legend">


                            {/* STANDARD */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="STANDARD"
                                    selected={false}
                                    sold={false}
                                    maintenance={false}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    Thường

                                </span>

                            </div>


                            {/* VIP */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="VIP"
                                    selected={false}
                                    sold={false}
                                    maintenance={false}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    VIP

                                </span>

                            </div>


                            {/* DELUXE */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="DELUXE"
                                    selected={false}
                                    sold={false}
                                    maintenance={false}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    Deluxe

                                </span>

                            </div>


                            {/* RECLINER */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="RECLINER"
                                    selected={false}
                                    sold={false}
                                    maintenance={false}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    Recliner

                                </span>

                            </div>


                            {/* COUPLE */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="COUPLE"
                                    selected={false}
                                    sold={false}
                                    maintenance={false}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    Đôi

                                </span>

                            </div>


                            {/* SOLD */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="STANDARD"
                                    selected={false}
                                    sold={true}
                                    maintenance={false}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    Đã đặt

                                </span>

                            </div>


                            {/* MAINTENANCE */}

                            <div className="legend-item leg-item">

                                <Seat
                                    type="STANDARD"
                                    selected={false}
                                    sold={false}
                                    maintenance={true}
                                    number=""
                                    onClick={() => {}}
                                />

                                <span>

                                    Bảo trì

                                </span>

                            </div>


                        </div>

                    </div>


                ) : (


                    /* ==================================================
                       EMPTY
                    ================================================== */

                    <div className="empty-text">

                        <Info size={40} />

                        <h3>

                            {
                                selectedRoom

                                    ? 'Phòng chưa có phôi ghế, bấm Khởi tạo nhé!'

                                    : 'Vui lòng chọn Rạp và Phòng để quản lý.'
                            }

                        </h3>

                    </div>

                )}

            </div>

        </div>

    );

};


export default SeatList;