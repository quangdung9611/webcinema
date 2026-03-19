const express = require('express'); 
const app = express();               
const cors = require('cors');
const path = require('path');
const db = require('./Config/db');   
const cookieParser = require('cookie-parser'); 
const axios = require('axios'); // Thêm để chạy được lệnh tự ping ở cuối
require('dotenv').config();

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

app.use(cors({
  origin: [
    'https://quangdungcinema.id.vn',       // Frontend của Dũng
    'https://webcinema-zb8z.onrender.com', // Link Backend trên Render
    /\.vercel\.app$/,                      // Phòng hờ nếu bạn test trên Vercel
    /\.onrender\.com$/                     // Cho phép các sub-domain của Render
  ], 
  credentials: true 
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================================================
// 2. ROUTES
// ===========================================================
app.get('/api', (req, res) => {
  res.send('Kết nối Backend Cinema thành công!');
});

// Luồng quản trị Admin
// Luồng ADMIN: Gọi từ React là /api/admin/auth/me
app.use('/api/admin/auth', authRoutes); 

// Luồng USER: Gọi từ React là /api/auth/me
app.use('/api/auth', authRoutes);
app.use('/admin/api/manage', adminRouter);

// Luồng người dùng User
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

// ===========================================================
// 3. KHỞI CHẠY SERVER & TỰ PING (Mỗi 5 phút)
// ===========================================================

// Render sẽ tự động điền vào process.env.PORT
const PORT = process.env.PORT || 5000; 

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
  
  // Tự gõ cửa sau mỗi 5 phút (300,000 ms)
  setInterval(async () => {
    try {
      // Dùng link thật của Dũng trên Render
      await axios.get(`https://webcinema-zb8z.onrender.com/api?t=${Date.now()}`);
      console.log('🔔 [Keep-Alive]: Đã tự nhấn chuông để giữ Server thức!');
    } catch (err) {
      console.log('⚠️ [Keep-Alive]: Server vẫn đang hoạt động.');
    }
  }, 300000); 

  db.getConnection()
    .then(conn => {
      console.log("✅ Database 'cinema_shop' kết nối thành công!");
      conn.release();
    })
    .catch(err => console.log("❌ Lỗi kết nối DB:", err.message));
});