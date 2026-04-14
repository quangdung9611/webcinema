const express = require('express'); 
const app = express();               
const cors = require('cors');
const path = require('path');
const db = require('./Config/db');   
const cookieParser = require('cookie-parser'); 
const axios = require('axios'); 
require('dotenv').config();

// --- THÊM SOCKET.IO ---
const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app); 

// IMPORT CÁC ROUTERS
const authRoutes = require('./Routers/UserAuthRouter');
const adminAuthRoutes = require('./Routers/AdminAuthRouter');
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

// 🔥 QUAN TRỌNG: Để nhận cookie từ domain thật trên Render
app.set('trust proxy', 1); 
app.use(cookieParser()); 

const corsOptions = {
  origin: [
    'https://quangdungcinema.id.vn',  
    'https://www.quangdungcinema.id.vn',  
    'https://admin.quangdungcinema.id.vn', 
    'http://localhost:3000',               
    'http://localhost:5173',
    /\.vercel\.app$/ 
  ], 
  credentials: true, 
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};

app.use(cors(corsOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KHỞI TẠO SOCKET.IO ---
const io = new Server(server, {
  cors: corsOptions, 
  transports: ['websocket', 'polling'] 
});

let holdingSeats = []; 

io.on('connection', (socket) => {
    console.log('⚡ Socket connected:', socket.id);
    socket.emit('server-gui-danh-sach-dang-giu', holdingSeats);

    socket.on('client-chon-ghe', (data) => {
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
  res.send('🚀 Cinema Backend is flying!');
});

// --- ROUTE CHO USER (Giữ nguyên /api/...) ---
app.use('/api/auth', authRoutes);
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

// --- ROUTE CHO ADMIN (Phân tách domain cookie qua prefix) ---
app.use('/admin/api/auth', adminAuthRoutes);
app.use('/admin/api/manage', adminRouter); 

// ===========================================================
// 3. KHỞI CHẠY SERVER
// ===========================================================

const PORT = process.env.PORT || 5000; 

// 🔥 Thay server.listen thay vì app.listen để Socket.io chạy được
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port: ${PORT}`);
  
  // Keep-alive: Nên dùng chính cái domain mới của bạn nếu đã trỏ xong
  const SELF_URL = process.env.BACKEND_URL || 'https://api.quangdungcinema.id.vn';
  setInterval(async () => {
    try {
      await axios.get(`${SELF_URL}/api?t=${Date.now()}`);
    } catch (err) {
      console.log('🔔 [Keep-Alive]: Server is staying awake.');
    }
  }, 300000); 

  db.getConnection()
    .then(conn => {
      console.log("✅ Database Cinema connected!");
      conn.release();
    })
    .catch(err => console.log("❌ DB Error:", err.message));
});

module.exports = app;