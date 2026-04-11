const express = require('express'); 
const app = express();               
const cors = require('cors');
const path = require('path');
const db = require('./Config/db');   
const cookieParser = require('cookie-parser'); 
const axios = require('axios'); 
require('dotenv').config();

// --- THÊM SOCKET.IO TẠI ĐÂY ---
const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app); 

// IMPORT CÁC ROUTERS
const authRoutes = require('./Routers/AuthRouter');
const userRoutes = require('./Routers/UserRouter');
const genreRoutes = require('./Routers/GenreRouter');
const movieRoutes = require('./Routers/MovieRouter');
const seatRoutes = require('./Routers/SeatRouter'); 
const cinemaRoutes = require('./Routers/CinemaRouter'); 
const roomRoutes = require('./Routers/RoomRouter'); 
const ticketRoutes = require('./Routers/TicketRouter'); 
const foodRoutes = require('./Routers/FoodRouter');
const paymentRoutes = require('./Routers/PaymentRouter'); 
const bankAppRoutes = require('./Routers/BankAppRouter');
const momoRoutes = require('./Routers/MomoRouter');
const actorRoutes = require('./Routers/ActorRouter');
const reviewRoutes = require('./Routers/ReviewRouter');
const showtimeRoutes = require('./Routers/ShowTimeRouter'); 
const adminRouter = require('./Routers/AdminRouter');
const bookingRoutes = require('./Routers/BookingRouter');
const couponRoutes = require('./Routers/CouponRouter'); 
const movieGenreRoutes = require('./Routers/MovieGenreRouter');
const movieActorRoutes = require('./Routers/MovieActorRouter');
const newsRoutes = require('./Routers/NewRouter');

// ===========================================================
// 1. CẤU HÌNH HỆ THỐNG & CORS
// ===========================================================

app.set('trust proxy', 1); 
app.use(cookieParser()); 

const corsOptions = {
  // Thay vì để mảng dài dòng, ông bốc đúng cái origin đang gọi tới
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://quangdungcinema.id.vn',
      'https://www.quangdungcinema.id.vn',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    // Cho phép các request không có origin (như Postman hoặc thiết bị di động) 
    // hoặc origin nằm trong danh sách cho phép
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS chặn truy cập từ origin này!'));
    }
  },
  credentials: true, // BẮT BUỘC để nhận Cookie
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};

app.use(cors(corsOptions));
app.use(cors(corsOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KHỞI TẠO SOCKET.IO & BỘ NHỚ TẠM ---
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'] 
});

let holdingSeats = []; 

io.on('connection', (socket) => {
    console.log('⚡ Có người vừa kết nối Socket:', socket.id);

    socket.emit('server-gui-danh-sach-dang-giu', holdingSeats);

    socket.on('client-chon-ghe', (data) => {
        // --- LOGIC TỐI ƯU: Xóa bỏ mọi record cũ của ghế này trước khi thêm mới ---
        holdingSeats = holdingSeats.filter(s => 
            !(Number(s.seatId) === Number(data.seatId) && Number(s.showtimeId) === Number(data.showtimeId))
        );
        
        holdingSeats.push({ ...data, socketId: socket.id });
        socket.broadcast.emit('server-khoa-ghe', data);
    });

    socket.on('client-huy-chon-ghe', (data) => {
        holdingSeats = holdingSeats.filter(s => 
            !(Number(s.seatId) === Number(data.seatId) && Number(s.showtimeId) === Number(data.showtimeId))
        );
        socket.broadcast.emit('server-mo-khoa-ghe', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Một người dùng đã ngắt kết nối:', socket.id);
        const seatsToRelease = holdingSeats.filter(s => s.socketId === socket.id);
        seatsToRelease.forEach(s => {
            socket.broadcast.emit('server-mo-khoa-ghe', { 
                seatId: s.seatId, 
                showtimeId: s.showtimeId 
            });
        });
        holdingSeats = holdingSeats.filter(s => s.socketId !== socket.id);
    });
});

// ===========================================================
// 2. ROUTES
// ===========================================================
app.get('/api', (req, res) => {
  res.send('Kết nối Backend Cinema thành công!');
});

app.use('/api/admin/auth', authRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/admin/manage', adminRouter); 
app.use('/api/users', userRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/cinemas', cinemaRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/bank', bankAppRoutes);
app.use('/api/momo', momoRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/movie-genres', movieGenreRoutes);
app.use('/api/movie-actors', movieActorRoutes);
app.use('/api/news', newsRoutes);

// ===========================================================
// 3. KHỞI CHẠY SERVER & TỰ PING
// ===========================================================

const PORT = process.env.PORT || 5000; 

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
  
  setInterval(async () => {
    try {
      await axios.get(`https://webcinema-zb8z.onrender.com/api?t=${Date.now()}`);
      console.log('🔔 [Keep-Alive]: Đã tự nhấn chuông!');
    } catch (err) {
      console.log('⚠️ [Keep-Alive]: Đang cố giữ server hoạt động...');
    }
  }, 300000); 

  db.getConnection()
    .then(conn => {
      console.log("✅ Database 'cinema_shop' kết nối thành công!");
      conn.release();
    })
    .catch(err => console.log("❌ Lỗi kết nối DB:", err.message));
});

module.exports = app;