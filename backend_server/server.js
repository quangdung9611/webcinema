const express = require('express'); 
const app = express();               
const cors = require('cors');
const path = require('path');
const db = require('./Config/db');   
const cookieParser = require('cookie-parser'); 
const axios = require('axios'); // Thêm để chạy được lệnh tự ping ở cuối
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

// BẮT BUỘC: Để Render nhận diện HTTPS khi gửi Cookie Secure xuyên domain
app.set('trust proxy', 1); 

// Cho cookieParser lên đầu để các request luôn bóc tách được cookie
app.use(cookieParser()); 

// Gom cấu hình CORS để dùng chung cho cả Express và Socket
const corsOptions = {
  origin: [
    'https://quangdungcinema.id.vn',       // Frontend của Dũng
    'https://webcinema-zb8z.onrender.com', // Link Backend trên Render
    /\.vercel\.app$/,                      // Phòng hờ nếu bạn test trên Vercel
    /\.onrender\.com$/,                    // Cho phép các sub-domain của Render
    'http://localhost:3000',               // Thêm để test local
    'http://localhost:5173'                // Thêm cổng mặc định của Vite
  ], 
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};

app.use(cors(corsOptions));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KHỞI TẠO SOCKET.IO & BỘ NHỚ TẠM ---
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'] // Tối ưu kết nối nhanh cho Render
});

// Biến này để "ghi sổ" những ghế đang bị giữ tạm thời trên RAM server
let holdingSeats = []; 

io.on('connection', (socket) => {
  console.log('⚡ Có người vừa kết nối Socket:', socket.id);

  // Gửi danh sách ghế đang bị giữ cho người mới vào (như điện thoại của Dũng)
  socket.emit('server-gui-danh-sach-dang-giu', holdingSeats);

  // Khi có người nhấn chọn ghế (Real-time khóa ghế)
  socket.on('client-chon-ghe', (data) => {
    // KIỂM TRA TRÙNG: Nếu ghế chưa có ai giữ thì mới cho giữ
    const isAlreadyHeld = holdingSeats.some(s => s.seatId === data.seatId && s.showtimeId === data.showtimeId);
    
    if (!isAlreadyHeld) {
      holdingSeats.push({ ...data, socketId: socket.id });
      // Gửi tín hiệu khóa ghế cho tất cả mọi người khác
      socket.broadcast.emit('server-khoa-ghe', data);
    }
  });

  // Khi có người bỏ chọn ghế (Real-time mở khóa)
  socket.on('client-huy-chon-ghe', (data) => {
    // Xóa khỏi sổ ghi chép
    holdingSeats = holdingSeats.filter(s => 
      !(s.seatId === data.seatId && s.showtimeId === data.showtimeId)
    );
    socket.broadcast.emit('server-mo-khoa-ghe', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Một người dùng đã ngắt kết nối:', socket.id);
    
    // Tự động giải phóng ghế: Nếu máy tính thoát, báo cho điện thoại mở khóa ghế đó ra
    const seatsToRelease = holdingSeats.filter(s => s.socketId === socket.id);
    seatsToRelease.forEach(s => {
      socket.broadcast.emit('server-mo-khoa-ghe', { 
        seatId: s.seatId, 
        showtimeId: s.showtimeId 
      });
    });

    // Cập nhật lại sổ, xóa dữ liệu của người vừa ngắt kết nối
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
// 3. KHỞI CHẠY SERVER & TỰ PING (Mỗi 5 phút)
// ===========================================================

const PORT = process.env.PORT || 5000; 

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
  
  setInterval(async () => {
    try {
      // Dũng nhớ dán đúng link backend của ông vào đây nhé
      await axios.get(`https://webcinema-zb8z.onrender.com/api?t=${Date.now()}`);
      console.log('🔔 [Keep-Alive]: Đã tự nhấn chuông để giữ Server thức!');
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