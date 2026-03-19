-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 18, 2026 at 11:03 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cinema_shop`
--
CREATE DATABASE IF NOT EXISTS `cinema_shop` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinema_shop;

-- --------------------------------------------------------

--
-- Table structure for table `actors`
--

DROP TABLE IF EXISTS `actors`;
CREATE TABLE IF NOT EXISTS `actors` (
  `actor_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `gender` enum('Nam','Nữ','Khác') DEFAULT 'Nam',
  `nationality` varchar(100) DEFAULT 'Việt Nam',
  `avatar` varchar(500) DEFAULT NULL,
  `biography` text DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `slug` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`actor_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_actor_name` (`name`),
  KEY `idx_actor_gender` (`gender`)
) ;

--
-- Dumping data for table `actors`
--

INSERT INTO `actors` (`actor_id`, `name`, `gender`, `nationality`, `avatar`, `biography`, `birthday`, `created_at`, `slug`) VALUES
(1, 'Lý Hải', 'Nam', 'Việt Nam', 'ly-hai.jpg', NULL, '1968-09-28', '2026-02-04 19:01:47', 'ly-hai'),
(2, 'Trấn Thành', 'Nam', 'Việt Nam', 'Screenshot 2026-02-26 155342.png', '', '1987-02-05', '2026-02-04 19:01:47', 'tran-thanh'),
(3, 'Lê Chi', 'Nữ', 'Việt Nam', 'le-chi.jpg', NULL, '1995-01-01', '2026-02-04 19:01:47', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
CREATE TABLE IF NOT EXISTS `bookings` (
  `booking_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY PRIMARY KEY,
  `user_id` int(11) DEFAULT NULL,
  `showtime_id` int(11) DEFAULT NULL,
  `coupon_id` int(11) DEFAULT NULL,
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `total_amount` decimal(16,0) DEFAULT NULL,
  `status` enum('Pending','Completed','Cancelled') DEFAULT 'Pending',
  `memo` varchar(255) DEFAULT NULL,
  
  UNIQUE KEY `memo` (`memo`),
  KEY `showtime_id` (`showtime_id`),
  KEY `coupon_id` (`coupon_id`),
  KEY `idx_bookings_user_date` (`user_id`,`booking_date`),
  KEY `idx_bookings_user_status` (`user_id`,`status`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_history` (`user_id`,`status`,`booking_date`)
) ;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `user_id`, `showtime_id`, `coupon_id`, `booking_date`, `total_amount`, `status`, `memo`) VALUES
(1, 3, 7, NULL, '2026-03-13 03:44:06', 80000, 'Cancelled', 'DUNG1773373446813'),
(2, 3, 7, NULL, '2026-03-13 03:44:41', 80000, 'Completed', 'DUNG1773373481370');

-- --------------------------------------------------------

--
-- Table structure for table `booking_details`
--

DROP TABLE IF EXISTS `booking_details`;
CREATE TABLE IF NOT EXISTS `booking_details` (
  `booking_detail_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` int(11) DEFAULT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `item_name` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `price` decimal(16,0) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `seat_id` int(11) DEFAULT NULL,
  
  KEY `booking_id` (`booking_id`),
  KEY `idx_bd_product` (`product_id`),
  KEY `fk_booking_details_seats` (`seat_id`)
) ;

--
-- Dumping data for table `booking_details`
--

INSERT INTO `booking_details` (`booking_detail_id`, `product_id`, `booking_id`, `item_name`, `quantity`, `price`, `created_at`, `seat_id`) VALUES
(1, NULL, 1, 'Ghế B10', 1, 80000, '2026-03-13 03:44:06', 20),
(2, NULL, 2, 'Ghế C10', 1, 80000, '2026-03-13 03:44:41', 30);

-- --------------------------------------------------------

--
-- Table structure for table `cinemas`
--

DROP TABLE IF EXISTS `cinemas`;
CREATE TABLE IF NOT EXISTS `cinemas` (
  `cinema_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `cinema_name` varchar(100) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
 
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_cinemas_city` (`city`)
) ;

--
-- Dumping data for table `cinemas`
--

INSERT INTO `cinemas` (`cinema_id`, `cinema_name`, `slug`, `address`, `city`) VALUES
(1, 'Galaxy Nguyễn Du', 'galaxy-nguyen-du', '123 Trần Hưng Đạo', 'TPHCM'),
(2, 'Galaxy Kinh Dương Vương', 'galaxy-kinh-duong-vuong', '01 Hòa Bình', 'TPHCM');

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
CREATE TABLE IF NOT EXISTS `coupons` (
  `coupon_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `coupon_code` varchar(20) NOT NULL,
  `discount_value` decimal(16,0) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  
  UNIQUE KEY `coupon_code` (`coupon_code`),
  KEY `idx_coupon_lookup` (`coupon_code`,`expiry_date`)
) ;

--
-- Dumping data for table `coupons`
--

INSERT INTO `coupons` (`coupon_id`, `coupon_code`, `discount_value`, `expiry_date`) VALUES
(1, 'DUNGCINEMA', 20000, '2026-12-31'),
(2, 'GIAM50K', 50000, '2026-05-01');

-- --------------------------------------------------------

--
-- Table structure for table `genres`
--

DROP TABLE IF EXISTS `genres`;
CREATE TABLE IF NOT EXISTS `genres` (
  `genre_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `genre_name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_genres_slug` (`slug`)
) ;

--
-- Dumping data for table `genres`
--

INSERT INTO `genres` (`genre_id`, `genre_name`, `slug`) VALUES
(1, 'Hành động', 'hanh-dong'),
(2, 'Gia đình', 'gia-dinh'),
(3, 'Hoạt hình', 'hoat-hinh'),
(4, 'Kinh dị', 'kinh-di'),
(5, 'Giật gân', 'giat-gan'),
(7, 'Lãng Mạn', 'lang-man');

-- --------------------------------------------------------

--
-- Table structure for table `movies`
--

DROP TABLE IF EXISTS `movies`;
CREATE TABLE IF NOT EXISTS `movies` (
  `movie_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `director` varchar(255) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `age_rating` int(11) DEFAULT 0,
  `poster_url` varchar(500) DEFAULT NULL,
  `trailer_url` varchar(500) DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `status` enum('Đang chiếu','Sắp chiếu','Ngừng chiếu') DEFAULT 'Sắp chiếu',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_movies_title` (`title`),
  KEY `idx_movies_status_date` (`status`,`release_date`),
  KEY `idx_movies_slug_lookup` (`slug`),
  KEY `idx_movies_listing` (`status`,`release_date`)
) ;

--
-- Dumping data for table `movies`
--

INSERT INTO `movies` (`movie_id`, `title`, `slug`, `description`, `director`, `duration`, `age_rating`, `poster_url`, `trailer_url`, `release_date`, `status`, `created_at`) VALUES
(2, 'Tài', 'tai', 'Hành trình mới tại hành tinh Pandora.', 'James Cameron', 192, 16, 'tai.jpg', 'https://youtu.be/mhgzESUI2s0', '2026-03-06', 'Đang chiếu', '2026-03-06 03:26:27'),
(3, 'Thám Tử Lừng Danh Conan', 'tham-tu-lung-danh-conan', 'Vụ án bí ẩn tại tháp Tokyo.', 'Gosho Aoyama', 110, 6, 'movie1_conan.jpg', NULL, '2026-03-01', 'Đang chiếu', '2026-02-01 03:26:27'),
(4, 'Thiên Đường Máu', 'thien-duong-mau', 'Câu chuyện kinh dị đầy ám ảnh về những bí mật kinh hoàng đằng sau vẻ đẹp hào nhoáng.', 'Nguyễn Hoàng', 105, 18, 'thien-duong-mau.jpg', NULL, '2026-02-01', 'Đang chiếu', '2026-02-26 03:27:50'),
(5, 'Thỏ ơi', 'tho-oi', 'Với tâm thế luôn mang đến những điều mới để cho khán giả của mình không nhàm chán, Thỏ Ơi!! - bộ phim điện ảnh thứ 4 của đạo diễn Trấn Thành hứa hẹn sẽ mang đến một màu sắc hoàn toàn khác biệt.\r\n\r\n', 'Trấn Thành', 127, 18, 'tho-oi.jpg', 'https://youtu.be/XMv1Zhj5TQg', '2026-02-16', 'Đang chiếu', '2026-03-07 01:03:04');

-- --------------------------------------------------------

--
-- Table structure for table `movie_actors`
--

DROP TABLE IF EXISTS `movie_actors`;
CREATE TABLE IF NOT EXISTS `movie_actors` (
  `movie_actor_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `movie_id` int(11) NOT NULL,
  `actor_id` int(11) NOT NULL,
  
  UNIQUE KEY `uk_movie_actor` (`movie_id`,`actor_id`),
  KEY `fk_ma_actor_v2` (`actor_id`)
) ;

--
-- Dumping data for table `movie_actors`
--

INSERT INTO `movie_actors` (`movie_actor_id`, `movie_id`, `actor_id`) VALUES
(2, 4, 2),
(3, 4, 3),
(8, 5, 1),
(7, 5, 2);

-- --------------------------------------------------------

--
-- Table structure for table `movie_genres`
--

DROP TABLE IF EXISTS `movie_genres`;
CREATE TABLE IF NOT EXISTS `movie_genres` (
  `movie_genre_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `movie_id` int(11) NOT NULL,
  `genre_id` int(11) NOT NULL,
  
  UNIQUE KEY `uk_movie_genre` (`movie_id`,`genre_id`),
  KEY `fk_mg_genre_v2` (`genre_id`)
) ;

--
-- Dumping data for table `movie_genres`
--

INSERT INTO `movie_genres` (`movie_genre_id`, `movie_id`, `genre_id`) VALUES
(8, 2, 1),
(9, 2, 7),
(3, 3, 3),
(4, 4, 4),
(5, 4, 5),
(7, 5, 5),
(6, 5, 7);

-- --------------------------------------------------------

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
CREATE TABLE IF NOT EXISTS `news` (
  `news_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
 
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_news_slug` (`slug`),
  KEY `idx_news_date` (`created_at`)
) ;

--
-- Dumping data for table `news`
--

INSERT INTO `news` (`news_id`, `title`, `slug`, `content`, `image_url`, `views`, `created_at`) VALUES
(1, '[Review] Thám Tử Lừng Danh Conan: Vụ Án Tại Tháp Tokyo Có Đáng Xem?', 'review-tham-tu-lung-danh-conan-vu-an-tai-thap-tokyo-co-dang-xem', 'Thám Tử Lừng Danh Conan luôn là cái tên thu hút sự chú ý của cộng đồng yêu thích anime. Trong phần phim mới nhất lấy bối cảnh tại tháp Tokyo, người xem sẽ được chứng kiến những màn đấu trí đỉnh cao giữa Conan và các thế lực bí ẩn. Nội dung phim xoay quanh một mật mã khó giải được để lại tại hiện trường vụ án mạng. Với hình ảnh trau chuốt và âm nhạc kịch tính, đây chắc chắn là tác phẩm không thể bỏ qua đối với các fan cứng của bộ truyện này.', 'Screenshot 2026-02-25 181816.png', 156, '2026-03-15 01:34:53'),
(2, '[Review] Thỏ Ơi - Một Màu Sắc Hoàn Toàn Khác Biệt Của Trấn Thành', 'review-phim-tho-oi-tran-thanh', 'Tiếp nối những thành công trước đó, đạo diễn Trấn Thành trở lại với dự án điện ảnh thứ 4 mang tên Thỏ Ơi. Bộ phim mang đến một góc nhìn mới lạ về tình cảm gia đình và những va vấp trong cuộc sống của những người trẻ. Với sự góp mặt của dàn diễn viên thực lực như Lý Hải, bộ phim không chỉ mang lại tiếng cười mà còn có những phút giây lắng đọng lấy đi nước mắt của khán giả. Đây là một bước tiến mới trong phong cách làm phim của Trấn Thành.', 'tho-oi.jpg', 280, '2026-03-15 01:34:53'),
(3, '[Tin tức] Top 5 Phim Kinh Dị Đáng Mong Chờ Nhất Năm 2026', 'top-5-phim-kinh-di-2026', 'Năm 2026 hứa hẹn sẽ là một năm bùng nổ của thể loại phim kinh dị. Đứng đầu danh sách là Thiên Đường Máu, một bộ phim tâm lý kinh dị đầy ám ảnh. Tiếp theo đó là các tác phẩm đến từ những nhà làm phim hàng đầu thế giới. Nếu bạn là một người yêu thích cảm giác mạnh và những câu chuyện bí ẩn sau vẻ đẹp hào nhoáng, hãy chuẩn bị tinh thần cho những màn hù dọa thót tim sắp tới trên màn ảnh rộng.', 'thien-duong-mau.jpg', 95, '2026-03-15 01:34:53');

-- --------------------------------------------------------

--
-- Table structure for table `product_menu`
--

DROP TABLE IF EXISTS `product_menu`;
CREATE TABLE IF NOT EXISTS `product_menu` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_name` varchar(100) NOT NULL,
  `price` decimal(16,0) DEFAULT NULL,
  `food_image` varchar(255) DEFAULT NULL,
    KEY `idx_product_name` (`product_name`)
) ;

--
-- Dumping data for table `product_menu`
--

INSERT INTO `product_menu` (`product_id`, `product_name`, `price`, `food_image`) VALUES
(1, 'Bắp Rang Bơ Lớn', 60000, 'popcorn.jpg'),
(2, 'Coca Cola Combo', 45000, 'coca.jpg'),
(3, 'Combo Gia Đình', 150000, 'family_combo.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE IF NOT EXISTS `reviews` (
  `review_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `movie_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `rating_score` tinyint(4) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
 
  KEY `movie_id` (`movie_id`),
  KEY `user_id` (`user_id`)
) ;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`review_id`, `movie_id`, `user_id`, `rating_score`, `comment`, `created_at`) VALUES
(2, 4, 2, 10, 'Phim quá hay Dũng ơi!', '2026-01-31 20:26:27'),
(3, 4, 3, 5, 'fhfhfhfh', '2026-02-04 20:15:11'),
(9, 4, 3, 9, 'Phim rất hay', '2026-02-04 20:17:34'),
(12, 4, 3, 8, 'phim dở', '2026-02-04 20:26:24');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
CREATE TABLE IF NOT EXISTS `rooms` (
  `room_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `cinema_id` int(11) DEFAULT NULL,
  `room_name` varchar(50) DEFAULT NULL,
  `room_type` enum('2D','3D','IMAX') DEFAULT '2D',
  `total_seats` int(11) DEFAULT 0,
  
  KEY `cinema_id` (`cinema_id`),
  KEY `idx_rooms_cinema` (`cinema_id`),
  KEY `idx_rooms_cinema_id` (`cinema_id`)
) ;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`room_id`, `cinema_id`, `room_name`, `room_type`, `total_seats`) VALUES
(1, 1, 'Phòng Chiếu 01', 'IMAX', 48),
(2, 1, 'Phòng Chiếu 02', '3D', 80),
(3, 2, 'Phòng VIP 01', 'IMAX', 48),
(4, 2, 'Phòng 1', '2D', 120);

-- --------------------------------------------------------

--
-- Table structure for table `seats`
--

DROP TABLE IF EXISTS `seats`;
CREATE TABLE IF NOT EXISTS `seats` (
  `seat_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `room_id` int(11) DEFAULT NULL,
  `cinema_id` int(11) DEFAULT NULL,
  `seat_row` char(1) DEFAULT NULL,
  `seat_number` int(11) DEFAULT NULL,
  `seat_type` enum('Standard','VIP','Couple') DEFAULT 'Standard',
  `price` decimal(16,0) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
 
  KEY `room_id` (`room_id`),
  KEY `idx_seats_room_id` (`room_id`),
  KEY `idx_room_layout` (`room_id`,`seat_row`,`seat_number`),
  KEY `idx_seats_cinema_room` (`cinema_id`,`room_id`)
) ;

--
-- Dumping data for table `seats`
--

INSERT INTO `seats` (`seat_id`, `room_id`, `cinema_id`, `seat_row`, `seat_number`, `seat_type`, `price`, `is_active`) VALUES
(1, 4, 2, 'A', 1, 'Standard', 80000, 0),
(2, 4, 2, 'A', 2, 'Standard', 80000, 1),
(3, 4, 2, 'A', 3, 'Standard', 80000, 1),
(4, 4, 2, 'A', 4, 'Standard', 80000, 1),
(5, 4, 2, 'A', 5, 'Standard', 80000, 1),
(6, 4, 2, 'A', 6, 'Standard', 80000, 1),
(7, 4, 2, 'A', 7, 'Standard', 80000, 1),
(8, 4, 2, 'A', 8, 'Standard', 80000, 1),
(9, 4, 2, 'A', 9, 'Standard', 80000, 1),
(10, 4, 2, 'A', 10, 'Standard', 80000, 1),
(11, 4, 2, 'B', 1, 'Standard', 80000, 1),
(12, 4, 2, 'B', 2, 'Standard', 80000, 1),
(13, 4, 2, 'B', 3, 'Standard', 80000, 1),
(14, 4, 2, 'B', 4, 'Standard', 80000, 1),
(15, 4, 2, 'B', 5, 'Standard', 80000, 1),
(16, 4, 2, 'B', 6, 'Standard', 80000, 1),
(17, 4, 2, 'B', 7, 'Standard', 80000, 1),
(18, 4, 2, 'B', 8, 'Standard', 80000, 1),
(19, 4, 2, 'B', 9, 'Standard', 80000, 1),
(20, 4, 2, 'B', 10, 'Standard', 80000, 1),
(21, 4, 2, 'C', 1, 'Standard', 80000, 1),
(22, 4, 2, 'C', 2, 'Standard', 80000, 1),
(23, 4, 2, 'C', 3, 'Standard', 80000, 1),
(24, 4, 2, 'C', 4, 'Standard', 80000, 1),
(25, 4, 2, 'C', 5, 'Standard', 80000, 1),
(26, 4, 2, 'C', 6, 'Standard', 80000, 1),
(27, 4, 2, 'C', 7, 'Standard', 80000, 1),
(28, 4, 2, 'C', 8, 'Standard', 80000, 1),
(29, 4, 2, 'C', 9, 'Standard', 80000, 1),
(30, 4, 2, 'C', 10, 'Standard', 80000, 1),
(31, 4, 2, 'D', 1, 'Standard', 80000, 1),
(32, 4, 2, 'D', 2, 'Standard', 80000, 1),
(33, 4, 2, 'D', 3, 'Standard', 80000, 1),
(34, 4, 2, 'D', 4, 'Standard', 80000, 1),
(35, 4, 2, 'D', 5, 'Standard', 80000, 1),
(36, 4, 2, 'D', 6, 'Standard', 80000, 1),
(37, 4, 2, 'D', 7, 'Standard', 80000, 1),
(38, 4, 2, 'D', 8, 'Standard', 80000, 1),
(39, 4, 2, 'D', 9, 'Standard', 80000, 1),
(40, 4, 2, 'D', 10, 'Standard', 80000, 1),
(41, 4, 2, 'E', 1, 'Standard', 80000, 1),
(42, 4, 2, 'E', 2, 'Standard', 80000, 1),
(43, 4, 2, 'E', 3, 'Standard', 80000, 1),
(44, 4, 2, 'E', 4, 'Standard', 80000, 1),
(45, 4, 2, 'E', 5, 'Standard', 80000, 1),
(46, 4, 2, 'E', 6, 'Standard', 80000, 1),
(47, 4, 2, 'E', 7, 'Standard', 80000, 1),
(48, 4, 2, 'E', 8, 'Standard', 80000, 1),
(49, 4, 2, 'E', 9, 'Standard', 80000, 1),
(50, 4, 2, 'E', 10, 'Standard', 80000, 1),
(51, 4, 2, 'F', 1, 'Standard', 80000, 1),
(52, 4, 2, 'F', 2, 'Standard', 80000, 1),
(53, 4, 2, 'F', 3, 'Standard', 80000, 1),
(54, 4, 2, 'F', 4, 'Standard', 80000, 1),
(55, 4, 2, 'F', 5, 'Standard', 80000, 1),
(56, 4, 2, 'F', 6, 'Standard', 80000, 1),
(57, 4, 2, 'F', 7, 'Standard', 80000, 1),
(58, 4, 2, 'F', 8, 'Standard', 80000, 1),
(59, 4, 2, 'F', 9, 'Standard', 80000, 1),
(60, 4, 2, 'F', 10, 'Standard', 80000, 1),
(61, 4, 2, 'G', 1, 'Standard', 80000, 1),
(62, 4, 2, 'G', 2, 'Standard', 80000, 1),
(63, 4, 2, 'G', 3, 'Standard', 80000, 1),
(64, 4, 2, 'G', 4, 'Standard', 80000, 1),
(65, 4, 2, 'G', 5, 'Standard', 80000, 1),
(66, 4, 2, 'G', 6, 'Standard', 80000, 1),
(67, 4, 2, 'G', 7, 'Standard', 80000, 1),
(68, 4, 2, 'G', 8, 'Standard', 80000, 1),
(69, 4, 2, 'G', 9, 'Standard', 80000, 1),
(70, 4, 2, 'G', 10, 'Standard', 80000, 1),
(71, 4, 2, 'H', 1, 'Standard', 80000, 1),
(72, 4, 2, 'H', 2, 'Standard', 80000, 1),
(73, 4, 2, 'H', 3, 'Standard', 80000, 1),
(74, 4, 2, 'H', 4, 'Standard', 80000, 1),
(75, 4, 2, 'H', 5, 'Standard', 110000, 1),
(76, 4, 2, 'H', 6, 'Standard', 80000, 1),
(77, 4, 2, 'H', 7, 'Standard', 80000, 1),
(78, 4, 2, 'H', 8, 'Standard', 80000, 1),
(79, 4, 2, 'H', 9, 'Standard', 80000, 1),
(80, 4, 2, 'H', 10, 'Standard', 80000, 1),
(81, 4, 2, 'I', 1, 'Standard', 80000, 1),
(82, 4, 2, 'I', 2, 'Standard', 80000, 1),
(83, 4, 2, 'I', 3, 'Standard', 80000, 1),
(84, 4, 2, 'I', 4, 'Standard', 80000, 1),
(85, 4, 2, 'I', 5, 'Standard', 80000, 1),
(86, 4, 2, 'I', 6, 'Standard', 80000, 1),
(87, 4, 2, 'I', 7, 'Standard', 80000, 1),
(88, 4, 2, 'I', 8, 'Standard', 80000, 1),
(89, 4, 2, 'I', 9, 'Standard', 80000, 1),
(90, 4, 2, 'I', 10, 'Standard', 80000, 1),
(91, 4, 2, 'J', 1, 'Standard', 80000, 1),
(92, 4, 2, 'J', 2, 'Standard', 80000, 1),
(93, 4, 2, 'J', 3, 'Standard', 80000, 1),
(94, 4, 2, 'J', 4, 'Standard', 80000, 1),
(95, 4, 2, 'J', 5, 'Standard', 80000, 1),
(96, 4, 2, 'J', 6, 'Standard', 80000, 1),
(97, 4, 2, 'J', 7, 'Standard', 80000, 1),
(98, 4, 2, 'J', 8, 'Standard', 80000, 1),
(99, 4, 2, 'J', 9, 'Standard', 80000, 1),
(100, 4, 2, 'J', 10, 'Standard', 80000, 1),
(101, 4, 2, 'K', 1, 'Standard', 80000, 1),
(102, 4, 2, 'K', 2, 'Standard', 80000, 1),
(103, 4, 2, 'K', 3, 'Standard', 80000, 1),
(104, 4, 2, 'K', 4, 'Standard', 80000, 1),
(105, 4, 2, 'K', 5, 'Standard', 80000, 1),
(106, 4, 2, 'K', 6, 'Standard', 80000, 1),
(107, 4, 2, 'K', 7, 'Standard', 80000, 1),
(108, 4, 2, 'K', 8, 'Standard', 80000, 1),
(109, 4, 2, 'K', 9, 'Standard', 80000, 1),
(110, 4, 2, 'K', 10, 'Standard', 80000, 1),
(111, 4, 2, 'L', 1, 'Couple', 150000, 1),
(112, 4, 2, 'L', 3, 'Couple', 150000, 1),
(113, 4, 2, 'L', 5, 'Couple', 150000, 1),
(114, 4, 2, 'L', 7, 'Couple', 150000, 1),
(115, 4, 2, 'L', 9, 'Couple', 150000, 1);

-- --------------------------------------------------------

--
-- Table structure for table `showtimes`
--

DROP TABLE IF EXISTS `showtimes`;
CREATE TABLE IF NOT EXISTS `showtimes` (
  `showtime_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `movie_id` int(11) DEFAULT NULL,
  `room_id` int(11) DEFAULT NULL,
  `cinema_id` int(11) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
 
  KEY `room_id` (`room_id`),
  KEY `idx_showtimes_movie_time` (`movie_id`,`start_time`),
  KEY `idx_cinema` (`cinema_id`),
  KEY `idx_showtimes_query` (`movie_id`,`cinema_id`,`start_time`)
) ;

--
-- Dumping data for table `showtimes`
--

INSERT INTO `showtimes` (`showtime_id`, `movie_id`, `room_id`, `cinema_id`, `start_time`) VALUES
(3, 2, 3, 2, '2026-03-08 19:00:00'),
(4, 5, 3, 2, '2026-03-09 22:00:00'),
(5, 5, 2, 1, '2026-03-10 23:30:00'),
(6, 5, 3, 2, '2026-03-10 22:30:00'),
(7, 5, 4, 2, '2026-03-13 20:45:00');

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE IF NOT EXISTS `tickets` (
  `ticket_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `booking_id` int(11) DEFAULT NULL,
  `showtime_id` int(11) DEFAULT NULL,
  `room_id` int(11) DEFAULT NULL,
  `cinema_id` int(11) DEFAULT NULL,
  `seat_id` int(11) NOT NULL,
  `ticket_code` varchar(50) NOT NULL,
  `price` decimal(16,0) DEFAULT NULL,
  `seat_status` enum('Available','Booked','Reserved','Maintenance') DEFAULT 'Available',
  `ticket_status` enum('Valid','Used','Cancelled') DEFAULT 'Valid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  
  UNIQUE KEY `ticket_code` (`ticket_code`),
  UNIQUE KEY `uk_showtime_cinema_room_seat` (`showtime_id`,`cinema_id`,`room_id`,`seat_id`),
  KEY `idx_tk_booking` (`booking_id`),
  KEY `idx_tk_seat` (`seat_id`),
  KEY `fk_tickets_showtime_new` (`showtime_id`),
  KEY `idx_tickets_seat_status` (`seat_status`),
  KEY `idx_tickets_performance` (`showtime_id`,`seat_status`)
) ;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`ticket_id`, `booking_id`, `showtime_id`, `room_id`, `cinema_id`, `seat_id`, `ticket_code`, `price`, `seat_status`, `ticket_status`, `created_at`, `updated_at`) VALUES
(2, 2, 7, NULL, NULL, 30, 'TIC-1773373481376-30', 80000, 'Booked', 'Valid', '2026-03-13 03:44:41', '2026-03-13 03:44:46');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(10) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','customer') DEFAULT 'customer',
  `points` int(11) DEFAULT 0,
  
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_users_login` (`username`,`email`)
) ;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `full_name`, `phone`, `address`, `email`, `password`, `role`, `points`) VALUES
(1, 'admin', 'Quang Dũng Admin', '0901234567', 'TP. Long Xuyên', 'admin@cinema.com', '123456', 'admin', 1000),
(2, 'khachhang1', 'Nguyễn Văn A', '0987654321', 'Cần Thơ', 'vana@gmail.com', '123456', 'customer', 50),
(3, 'quangdungvip', 'Nguyễn Phạm Quang Dũng', '0070070070', 'Hà Nội', 'cokhitienphat4919@gmail.com', '$2b$10$1HU/xjtQbAddfl0FJLlAvOu6u0LgndFf8wfNPJe9E6mMZmRUeiwGq', 'customer', 500),
(4, 'quangdungcinema', 'Nguyễn Phạm Quang Dũng', '0567465321', 'Vũng Tàu', 'dungcinema@gmail.com', '$2b$10$SxbqOwvR3eCuI0KXQv4AROfcF7onR8iTDZSxqlmA6cTEcATmc8nUm', 'admin', 0),
(6, 'Dungvippro098', 'Nguyễn Trần Chí Tài', '0943535352', '123 Nguyễn Văn Trỗi', 'nguyennmhdunghihi@gmail.com', '$2b$10$0WDQ8OL.z5UO1xjiCoPmLuwFST9CnH2IU6QK7u0Oh1yA/RljuUXE.', 'customer', 0);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bk_coupon_v2` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`coupon_id`),
  ADD CONSTRAINT `fk_bk_showtime_v2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`showtime_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bk_user_v2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `booking_details`
--
ALTER TABLE `booking_details`
  ADD CONSTRAINT `fk_bd_booking_v2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bd_product_v2` FOREIGN KEY (`product_id`) REFERENCES `product_menu` (`product_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bd_seat_v2` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `movie_actors`
--
ALTER TABLE `movie_actors`
  ADD CONSTRAINT `fk_ma_actor_v2` FOREIGN KEY (`actor_id`) REFERENCES `actors` (`actor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ma_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE;

--
-- Constraints for table `movie_genres`
--
ALTER TABLE `movie_genres`
  ADD CONSTRAINT `fk_mg_genre_v2` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`genre_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mg_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_rv_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rv_user_v2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `fk_rm_cinema_v2` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`) ON DELETE CASCADE;

--
-- Constraints for table `seats`
--
ALTER TABLE `seats`
  ADD CONSTRAINT `fk_st_cinema_v2` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_st_room_v2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE;

--
-- Constraints for table `showtimes`
--
ALTER TABLE `showtimes`
  ADD CONSTRAINT `fk_sh_cinema_v2` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sh_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sh_room_v2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE;

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `fk_tk_booking_v2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tk_seat_v2` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tk_showtime_v2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`showtime_id`) ON DELETE CASCADE;

DELIMITER $$
--
-- Events
--
DROP EVENT IF EXISTS `auto_cleanup_tickets`$$
CREATE DEFINER=`root`@`%` EVENT `auto_cleanup_tickets` ON SCHEDULE EVERY 1 MINUTE STARTS '2026-03-10 09:09:55' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    -- Nhả ghế: Xóa các vé đang giữ chỗ (Reserved) quá 10 phút
    DELETE FROM tickets 
    WHERE seat_status = 'Reserved' 
    AND created_at < NOW() - INTERVAL 10 MINUTE;

    -- Hủy đơn: Chuyển các đơn hàng chờ (Pending) quá 10 phút thành Cancelled
    UPDATE bookings 
    SET status = 'Cancelled' 
    WHERE status = 'Pending' 
    AND booking_date < NOW() - INTERVAL 10 MINUTE;
END$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
