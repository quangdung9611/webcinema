-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: mysql-166d18c1-project-dung-cinema.h.aivencloud.com    Database: cinema_shop
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;


--
-- GTID state at the beginning of the backup 
--

-- SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '96fa5d22-21a5-11f1-9413-5636829a02c3:1-66,
-- b2b5ca43-2284-11f1-949d-be04507dfaee:1-204';

--
-- Table structure for table `actors`
--

DROP TABLE IF EXISTS `actors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actors` (
  `actor_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `gender` enum('Nam','Nữ','Khác') DEFAULT 'Nam',
  `nationality` varchar(100) DEFAULT 'Việt Nam',
  `avatar` varchar(500) DEFAULT NULL,
  `biography` text,
  `birthday` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `slug` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`actor_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_actor_name` (`name`),
  KEY `idx_actor_gender` (`gender`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actors`
--

LOCK TABLES `actors` WRITE;
/*!40000 ALTER TABLE `actors` DISABLE KEYS */;
INSERT INTO `actors` VALUES (1,'Lý Hải','Nam','Việt Nam','ly-hai.jpg',NULL,'1968-09-28','2026-02-04 19:01:47','ly-hai'),(2,'Trấn Thành','Nam','Việt Nam','Screenshot 2026-02-26 155342.png','','1987-02-05','2026-02-04 19:01:47','tran-thanh'),(3,'Lê Chi','Nữ','Việt Nam','le-chi.jpg',NULL,'1995-01-01','2026-02-04 19:01:47',NULL);
/*!40000 ALTER TABLE `actors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_details`
--

DROP TABLE IF EXISTS `booking_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_details` (
  `booking_detail_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `item_name` varchar(100) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `price` decimal(16,0) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `seat_id` int DEFAULT NULL,
  PRIMARY KEY (`booking_detail_id`),
  KEY `booking_id` (`booking_id`),
  KEY `idx_bd_product` (`product_id`),
  KEY `fk_booking_details_seats` (`seat_id`),
  CONSTRAINT `fk_bd_booking_v2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bd_product_v2` FOREIGN KEY (`product_id`) REFERENCES `product_menu` (`product_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bd_seat_v2` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_details`
--

LOCK TABLES `booking_details` WRITE;
/*!40000 ALTER TABLE `booking_details` DISABLE KEYS */;
INSERT INTO `booking_details` VALUES (1,NULL,1,'Ghế B10',1,80000,'2026-03-13 03:44:06',20),(2,NULL,2,'Ghế C10',1,80000,'2026-03-13 03:44:41',30),(3,NULL,3,'Ghế C1',1,80000,'2026-03-24 07:58:07',21),(4,1,3,'Bắp Rang Bơ Lớn',1,60000,'2026-03-24 07:58:08',NULL),(5,NULL,4,'Ghế C1',1,80000,'2026-03-24 07:59:04',21),(6,1,4,'Bắp Rang Bơ Lớn',1,60000,'2026-03-24 07:59:04',NULL),(7,NULL,5,'Ghế C1',1,80000,'2026-03-24 07:59:15',21),(8,1,5,'Bắp Rang Bơ Lớn',1,60000,'2026-03-24 07:59:15',NULL),(9,NULL,6,'Ghế C1',1,80000,'2026-03-25 01:47:40',21),(10,2,6,'Coca Cola Combo',1,45000,'2026-03-25 01:47:40',NULL),(11,NULL,7,'Ghế C3',1,80000,'2026-03-25 01:59:20',23),(12,NULL,8,'Ghế C3',1,80000,'2026-03-25 02:03:16',23),(13,NULL,9,'Ghế D5',1,80000,'2026-03-25 02:33:44',35),(14,NULL,10,'Ghế E6',1,80000,'2026-03-25 02:37:21',46),(15,NULL,11,'Ghế D4',1,80000,'2026-03-25 02:40:39',34),(16,NULL,12,'Ghế E5',1,80000,'2026-03-25 02:49:12',45),(17,NULL,13,'Ghế G10',1,80000,'2026-03-25 02:54:01',70),(18,NULL,14,'Ghế B5',1,80000,'2026-03-25 02:58:09',15),(19,NULL,15,'Ghế E2',1,80000,'2026-03-25 03:29:43',42),(20,NULL,16,'Ghế E1',1,80000,'2026-03-25 03:37:29',41),(21,NULL,17,'Ghế F5',1,80000,'2026-03-25 03:42:46',55),(22,NULL,18,'Ghế D9',1,80000,'2026-03-25 03:47:23',39),(23,NULL,19,'Ghế D8',1,80000,'2026-03-25 03:58:49',38),(24,NULL,20,'Ghế D1',1,80000,'2026-03-27 03:40:37',31),(25,NULL,21,'Ghế E10',1,80000,'2026-03-27 03:59:36',50),(26,NULL,22,'Ghế C3',1,80000,'2026-03-28 02:33:54',23);
/*!40000 ALTER TABLE `booking_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `showtime_id` int DEFAULT NULL,
  `coupon_id` int DEFAULT NULL,
  `booking_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(16,0) DEFAULT NULL,
  `status` enum('Pending','Completed','Cancelled') DEFAULT 'Pending',
  `memo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  UNIQUE KEY `memo` (`memo`),
  KEY `showtime_id` (`showtime_id`),
  KEY `coupon_id` (`coupon_id`),
  KEY `idx_bookings_user_date` (`user_id`,`booking_date`),
  KEY `idx_bookings_user_status` (`user_id`,`status`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_history` (`user_id`,`status`,`booking_date`),
  CONSTRAINT `fk_bk_coupon_v2` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`coupon_id`),
  CONSTRAINT `fk_bk_showtime_v2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`showtime_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bk_user_v2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,3,7,NULL,'2026-03-13 03:44:06',80000,'Cancelled','DUNG1773373446813'),(2,3,7,NULL,'2026-03-13 03:44:41',80000,'Completed','DUNG1773373481370'),(3,6,7,NULL,'2026-03-24 07:58:07',140000,'Pending','DUNG1774339087489'),(4,6,7,NULL,'2026-03-24 07:59:04',140000,'Pending','DUNG1774339144364'),(5,6,7,NULL,'2026-03-24 07:59:15',140000,'Pending','DUNG1774339155550'),(6,3,7,NULL,'2026-03-25 01:47:40',125000,'Pending','DUNG1774403260017'),(7,3,7,NULL,'2026-03-25 01:59:20',80000,'Pending','DUNG1774403960165'),(8,3,7,NULL,'2026-03-25 02:03:16',80000,'Pending','DUNG1774404196710'),(9,3,7,NULL,'2026-03-25 02:33:44',80000,'Pending','DUNG1774406023967'),(10,3,7,NULL,'2026-03-25 02:37:21',80000,'Pending','DUNG1774406241331'),(11,3,7,NULL,'2026-03-25 02:40:39',80000,'Pending','DUNG1774406439036'),(12,3,7,NULL,'2026-03-25 02:49:12',80000,'Pending','DUNG1774406952453'),(13,3,7,NULL,'2026-03-25 02:54:01',80000,'Pending','DUNG1774407241570'),(14,3,7,NULL,'2026-03-25 02:58:09',80000,'Completed','DUNG1774407489308'),(15,3,7,NULL,'2026-03-25 03:29:43',80000,'Pending','DUNG1774409383146'),(16,3,7,NULL,'2026-03-25 03:37:28',80000,'Pending','DUNG1774409848880'),(17,3,7,NULL,'2026-03-25 03:42:46',80000,'Pending','DUNG1774410166553'),(18,3,7,NULL,'2026-03-25 03:47:22',80000,'Pending','DUNG1774410442881'),(19,3,7,NULL,'2026-03-25 03:58:49',80000,'Completed','DUNG1774411129302'),(20,3,7,NULL,'2026-03-27 03:40:37',80000,'Completed','DUNG1774582837175'),(21,3,7,NULL,'2026-03-27 03:59:36',80000,'Completed','DUNG1774583976088'),(22,3,7,NULL,'2026-03-28 02:33:54',80000,'Completed','DUNG1774665234155');
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cinemas`
--

DROP TABLE IF EXISTS `cinemas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cinemas` (
  `cinema_id` int NOT NULL AUTO_INCREMENT,
  `cinema_name` varchar(100) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`cinema_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_cinemas_city` (`city`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cinemas`
--

LOCK TABLES `cinemas` WRITE;
/*!40000 ALTER TABLE `cinemas` DISABLE KEYS */;
INSERT INTO `cinemas` VALUES (1,'Galaxy Nguyễn Du','galaxy-nguyen-du','123 Trần Hưng Đạo','TPHCM'),(2,'Galaxy Kinh Dương Vương','galaxy-kinh-duong-vuong','01 Hòa Bình','TPHCM');
/*!40000 ALTER TABLE `cinemas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `coupon_id` int NOT NULL AUTO_INCREMENT,
  `coupon_code` varchar(20) NOT NULL,
  `discount_value` decimal(16,0) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `coupon_code` (`coupon_code`),
  KEY `idx_coupon_lookup` (`coupon_code`,`expiry_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES (1,'DUNGCINEMA',20000,'2026-12-31'),(2,'GIAM50K',50000,'2026-05-01');
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `genres`
--

DROP TABLE IF EXISTS `genres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `genres` (
  `genre_id` int NOT NULL AUTO_INCREMENT,
  `genre_name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  PRIMARY KEY (`genre_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_genres_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `genres`
--

LOCK TABLES `genres` WRITE;
/*!40000 ALTER TABLE `genres` DISABLE KEYS */;
INSERT INTO `genres` VALUES (1,'Hành động','hanh-dong'),(2,'Gia đình','gia-dinh'),(3,'Hoạt hình','hoat-hinh'),(4,'Kinh dị','kinh-di'),(5,'Giật gân','giat-gan'),(7,'Lãng Mạn','lang-man');
/*!40000 ALTER TABLE `genres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_actors`
--

DROP TABLE IF EXISTS `movie_actors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_actors` (
  `movie_actor_id` int NOT NULL AUTO_INCREMENT,
  `movie_id` int NOT NULL,
  `actor_id` int NOT NULL,
  PRIMARY KEY (`movie_actor_id`),
  UNIQUE KEY `uk_movie_actor` (`movie_id`,`actor_id`),
  KEY `fk_ma_actor_v2` (`actor_id`),
  CONSTRAINT `fk_ma_actor_v2` FOREIGN KEY (`actor_id`) REFERENCES `actors` (`actor_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ma_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_actors`
--

LOCK TABLES `movie_actors` WRITE;
/*!40000 ALTER TABLE `movie_actors` DISABLE KEYS */;
INSERT INTO `movie_actors` VALUES (2,4,2),(3,4,3),(8,5,1),(7,5,2);
/*!40000 ALTER TABLE `movie_actors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_genres`
--

DROP TABLE IF EXISTS `movie_genres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_genres` (
  `movie_genre_id` int NOT NULL AUTO_INCREMENT,
  `movie_id` int NOT NULL,
  `genre_id` int NOT NULL,
  PRIMARY KEY (`movie_genre_id`),
  UNIQUE KEY `uk_movie_genre` (`movie_id`,`genre_id`),
  KEY `fk_mg_genre_v2` (`genre_id`),
  CONSTRAINT `fk_mg_genre_v2` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`genre_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mg_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_genres`
--

LOCK TABLES `movie_genres` WRITE;
/*!40000 ALTER TABLE `movie_genres` DISABLE KEYS */;
INSERT INTO `movie_genres` VALUES (8,2,1),(9,2,7),(3,3,3),(4,4,4),(5,4,5),(7,5,5),(6,5,7);
/*!40000 ALTER TABLE `movie_genres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movies`
--

DROP TABLE IF EXISTS `movies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movies` (
  `movie_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text,
  `director` varchar(255) DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `age_rating` int DEFAULT '0',
  `poster_url` varchar(500) DEFAULT NULL,
  `trailer_url` varchar(500) DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `status` enum('Đang chiếu','Sắp chiếu','Ngừng chiếu') DEFAULT 'Sắp chiếu',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movie_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_movies_title` (`title`),
  KEY `idx_movies_status_date` (`status`,`release_date`),
  KEY `idx_movies_slug_lookup` (`slug`),
  KEY `idx_movies_listing` (`status`,`release_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movies`
--

LOCK TABLES `movies` WRITE;
/*!40000 ALTER TABLE `movies` DISABLE KEYS */;
INSERT INTO `movies` VALUES (2,'Tài','tai','Hành trình mới tại hành tinh Pandora.','James Cameron',192,16,'tai.jpg','https://youtu.be/mhgzESUI2s0','2026-03-06','Đang chiếu','2026-03-06 03:26:27'),(3,'Thám Tử Lừng Danh Conan','tham-tu-lung-danh-conan','Vụ án bí ẩn tại tháp Tokyo.','Gosho Aoyama',110,6,'movie1_conan.jpg',NULL,'2026-03-01','Đang chiếu','2026-02-01 03:26:27'),(4,'Thiên Đường Máu','thien-duong-mau','Câu chuyện kinh dị đầy ám ảnh về những bí mật kinh hoàng đằng sau vẻ đẹp hào nhoáng.','Nguyễn Hoàng',105,18,'thien-duong-mau.jpg',NULL,'2026-02-01','Đang chiếu','2026-02-26 03:27:50'),(5,'Thỏ ơi','tho-oi','Với tâm thế luôn mang đến những điều mới để cho khán giả của mình không nhàm chán, Thỏ Ơi!! - bộ phim điện ảnh thứ 4 của đạo diễn Trấn Thành hứa hẹn sẽ mang đến một màu sắc hoàn toàn khác biệt.\r\n\r\n','Trấn Thành',127,18,'tho-oi.jpg','https://youtu.be/XMv1Zhj5TQg','2026-02-16','Đang chiếu','2026-03-07 01:03:04');
/*!40000 ALTER TABLE `movies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news` (
  `news_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` text,
  `image_url` varchar(500) DEFAULT NULL,
  `views` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`news_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_news_slug` (`slug`),
  KEY `idx_news_date` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES (1,'[Review] Thám Tử Lừng Danh Conan: Vụ Án Tại Tháp Tokyo Có Đáng Xem?','review-tham-tu-lung-danh-conan-vu-an-tai-thap-tokyo-co-dang-xem','Thám Tử Lừng Danh Conan luôn là cái tên thu hút sự chú ý của cộng đồng yêu thích anime. Trong phần phim mới nhất lấy bối cảnh tại tháp Tokyo, người xem sẽ được chứng kiến những màn đấu trí đỉnh cao giữa Conan và các thế lực bí ẩn. Nội dung phim xoay quanh một mật mã khó giải được để lại tại hiện trường vụ án mạng. Với hình ảnh trau chuốt và âm nhạc kịch tính, đây chắc chắn là tác phẩm không thể bỏ qua đối với các fan cứng của bộ truyện này.','Screenshot 2026-02-25 181816.png',159,'2026-03-15 01:34:53'),(2,'[Review] Thỏ Ơi - Một Màu Sắc Hoàn Toàn Khác Biệt Của Trấn Thành','review-phim-tho-oi-tran-thanh','Tiếp nối những thành công trước đó, đạo diễn Trấn Thành trở lại với dự án điện ảnh thứ 4 mang tên Thỏ Ơi. Bộ phim mang đến một góc nhìn mới lạ về tình cảm gia đình và những va vấp trong cuộc sống của những người trẻ. Với sự góp mặt của dàn diễn viên thực lực như Lý Hải, bộ phim không chỉ mang lại tiếng cười mà còn có những phút giây lắng đọng lấy đi nước mắt của khán giả. Đây là một bước tiến mới trong phong cách làm phim của Trấn Thành.','tho-oi.jpg',280,'2026-03-15 01:34:53'),(3,'[Tin tức] Top 5 Phim Kinh Dị Đáng Mong Chờ Nhất Năm 2026','top-5-phim-kinh-di-2026','Năm 2026 hứa hẹn sẽ là một năm bùng nổ của thể loại phim kinh dị. Đứng đầu danh sách là Thiên Đường Máu, một bộ phim tâm lý kinh dị đầy ám ảnh. Tiếp theo đó là các tác phẩm đến từ những nhà làm phim hàng đầu thế giới. Nếu bạn là một người yêu thích cảm giác mạnh và những câu chuyện bí ẩn sau vẻ đẹp hào nhoáng, hãy chuẩn bị tinh thần cho những màn hù dọa thót tim sắp tới trên màn ảnh rộng.','thien-duong-mau.jpg',95,'2026-03-15 01:34:53');
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_menu`
--

DROP TABLE IF EXISTS `product_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_menu` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `product_name` varchar(100) NOT NULL,
  `price` decimal(16,0) DEFAULT NULL,
  `food_image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  KEY `idx_product_name` (`product_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_menu`
--

LOCK TABLES `product_menu` WRITE;
/*!40000 ALTER TABLE `product_menu` DISABLE KEYS */;
INSERT INTO `product_menu` VALUES (1,'Bắp Rang Bơ Lớn',60000,'popcorn.jpg'),(2,'Coca Cola Combo',45000,'coca.jpg'),(3,'Combo Gia Đình',150000,'family_combo.jpg');
/*!40000 ALTER TABLE `product_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `movie_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `rating_score` tinyint DEFAULT NULL,
  `comment` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `unique_user_movie` (`movie_id`,`user_id`),
  KEY `movie_id` (`movie_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_rv_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rv_user_v2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `room_id` int NOT NULL AUTO_INCREMENT,
  `cinema_id` int DEFAULT NULL,
  `room_name` varchar(50) DEFAULT NULL,
  `room_type` enum('2D','3D','IMAX') DEFAULT '2D',
  `total_seats` int DEFAULT '0',
  PRIMARY KEY (`room_id`),
  KEY `cinema_id` (`cinema_id`),
  KEY `idx_rooms_cinema` (`cinema_id`),
  KEY `idx_rooms_cinema_id` (`cinema_id`),
  CONSTRAINT `fk_rm_cinema_v2` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rooms`
--

LOCK TABLES `rooms` WRITE;
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` VALUES (1,1,'Phòng Chiếu 01','IMAX',48),(2,1,'Phòng Chiếu 02','3D',80),(3,2,'Phòng VIP 01','IMAX',48),(4,2,'Phòng 1','2D',120);
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seats`
--

DROP TABLE IF EXISTS `seats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seats` (
  `seat_id` int NOT NULL AUTO_INCREMENT,
  `room_id` int DEFAULT NULL,
  `cinema_id` int DEFAULT NULL,
  `seat_row` char(1) DEFAULT NULL,
  `seat_number` int DEFAULT NULL,
  `seat_type` enum('Standard','VIP','Couple') DEFAULT 'Standard',
  `price` decimal(16,0) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`seat_id`),
  KEY `room_id` (`room_id`),
  KEY `idx_seats_room_id` (`room_id`),
  KEY `idx_room_layout` (`room_id`,`seat_row`,`seat_number`),
  KEY `idx_seats_cinema_room` (`cinema_id`,`room_id`),
  CONSTRAINT `fk_st_cinema_v2` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_st_room_v2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seats`
--

LOCK TABLES `seats` WRITE;
/*!40000 ALTER TABLE `seats` DISABLE KEYS */;
INSERT INTO `seats` VALUES (1,4,2,'A',1,'Standard',80000,0),(2,4,2,'A',2,'Standard',80000,1),(3,4,2,'A',3,'Standard',80000,1),(4,4,2,'A',4,'Standard',80000,1),(5,4,2,'A',5,'Standard',80000,1),(6,4,2,'A',6,'Standard',80000,1),(7,4,2,'A',7,'Standard',80000,1),(8,4,2,'A',8,'Standard',80000,1),(9,4,2,'A',9,'Standard',80000,1),(10,4,2,'A',10,'Standard',80000,1),(11,4,2,'B',1,'Standard',80000,1),(12,4,2,'B',2,'Standard',80000,1),(13,4,2,'B',3,'Standard',80000,1),(14,4,2,'B',4,'Standard',80000,1),(15,4,2,'B',5,'Standard',80000,1),(16,4,2,'B',6,'Standard',80000,1),(17,4,2,'B',7,'Standard',80000,1),(18,4,2,'B',8,'Standard',80000,1),(19,4,2,'B',9,'Standard',80000,1),(20,4,2,'B',10,'Standard',80000,1),(21,4,2,'C',1,'Standard',80000,1),(22,4,2,'C',2,'Standard',80000,1),(23,4,2,'C',3,'Standard',80000,1),(24,4,2,'C',4,'Standard',80000,1),(25,4,2,'C',5,'Standard',80000,1),(26,4,2,'C',6,'Standard',80000,1),(27,4,2,'C',7,'Standard',80000,1),(28,4,2,'C',8,'Standard',80000,1),(29,4,2,'C',9,'Standard',80000,1),(30,4,2,'C',10,'Standard',80000,1),(31,4,2,'D',1,'Standard',80000,1),(32,4,2,'D',2,'Standard',80000,1),(33,4,2,'D',3,'Standard',80000,1),(34,4,2,'D',4,'Standard',80000,1),(35,4,2,'D',5,'Standard',80000,1),(36,4,2,'D',6,'Standard',80000,1),(37,4,2,'D',7,'Standard',80000,1),(38,4,2,'D',8,'Standard',80000,1),(39,4,2,'D',9,'Standard',80000,1),(40,4,2,'D',10,'Standard',80000,1),(41,4,2,'E',1,'Standard',80000,1),(42,4,2,'E',2,'Standard',80000,1),(43,4,2,'E',3,'Standard',80000,1),(44,4,2,'E',4,'Standard',80000,1),(45,4,2,'E',5,'Standard',80000,1),(46,4,2,'E',6,'Standard',80000,1),(47,4,2,'E',7,'Standard',80000,1),(48,4,2,'E',8,'Standard',80000,1),(49,4,2,'E',9,'Standard',80000,1),(50,4,2,'E',10,'Standard',80000,1),(51,4,2,'F',1,'Standard',80000,1),(52,4,2,'F',2,'Standard',80000,1),(53,4,2,'F',3,'Standard',80000,1),(54,4,2,'F',4,'Standard',80000,1),(55,4,2,'F',5,'Standard',80000,1),(56,4,2,'F',6,'Standard',80000,1),(57,4,2,'F',7,'Standard',80000,1),(58,4,2,'F',8,'Standard',80000,1),(59,4,2,'F',9,'Standard',80000,1),(60,4,2,'F',10,'Standard',80000,1),(61,4,2,'G',1,'Standard',80000,1),(62,4,2,'G',2,'Standard',80000,1),(63,4,2,'G',3,'Standard',80000,1),(64,4,2,'G',4,'Standard',80000,1),(65,4,2,'G',5,'Standard',80000,1),(66,4,2,'G',6,'Standard',80000,1),(67,4,2,'G',7,'Standard',80000,1),(68,4,2,'G',8,'Standard',80000,1),(69,4,2,'G',9,'Standard',80000,1),(70,4,2,'G',10,'Standard',80000,1),(71,4,2,'H',1,'Standard',80000,1),(72,4,2,'H',2,'Standard',80000,1),(73,4,2,'H',3,'Standard',80000,1),(74,4,2,'H',4,'Standard',80000,1),(75,4,2,'H',5,'Standard',110000,1),(76,4,2,'H',6,'Standard',80000,1),(77,4,2,'H',7,'Standard',80000,1),(78,4,2,'H',8,'Standard',80000,1),(79,4,2,'H',9,'Standard',80000,1),(80,4,2,'H',10,'Standard',80000,1),(81,4,2,'I',1,'Standard',80000,1),(82,4,2,'I',2,'Standard',80000,1),(83,4,2,'I',3,'Standard',80000,1),(84,4,2,'I',4,'Standard',80000,1),(85,4,2,'I',5,'Standard',80000,1),(86,4,2,'I',6,'Standard',80000,1),(87,4,2,'I',7,'Standard',80000,1),(88,4,2,'I',8,'Standard',80000,1),(89,4,2,'I',9,'Standard',80000,1),(90,4,2,'I',10,'Standard',80000,1),(91,4,2,'J',1,'Standard',80000,1),(92,4,2,'J',2,'Standard',80000,1),(93,4,2,'J',3,'Standard',80000,1),(94,4,2,'J',4,'Standard',80000,1),(95,4,2,'J',5,'Standard',80000,1),(96,4,2,'J',6,'Standard',80000,1),(97,4,2,'J',7,'Standard',80000,1),(98,4,2,'J',8,'Standard',80000,1),(99,4,2,'J',9,'Standard',80000,1),(100,4,2,'J',10,'Standard',80000,1),(101,4,2,'K',1,'Standard',80000,1),(102,4,2,'K',2,'Standard',80000,1),(103,4,2,'K',3,'Standard',80000,1),(104,4,2,'K',4,'Standard',80000,1),(105,4,2,'K',5,'Standard',80000,1),(106,4,2,'K',6,'Standard',80000,1),(107,4,2,'K',7,'Standard',80000,1),(108,4,2,'K',8,'Standard',80000,1),(109,4,2,'K',9,'Standard',80000,1),(110,4,2,'K',10,'Standard',80000,1),(111,4,2,'L',1,'Couple',150000,1),(112,4,2,'L',3,'Couple',150000,1),(113,4,2,'L',5,'Couple',150000,1),(114,4,2,'L',7,'Couple',150000,1),(115,4,2,'L',9,'Couple',150000,1);
/*!40000 ALTER TABLE `seats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `showtimes`
--

DROP TABLE IF EXISTS `showtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `showtimes` (
  `showtime_id` int NOT NULL AUTO_INCREMENT,
  `movie_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `cinema_id` int NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`showtime_id`),
  KEY `room_id` (`room_id`),
  KEY `idx_showtimes_movie_time` (`movie_id`,`start_time`),
  KEY `idx_cinema` (`cinema_id`),
  KEY `idx_showtimes_query` (`movie_id`,`cinema_id`,`start_time`),
  CONSTRAINT `fk_sh_cinema_v2` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sh_movie_v2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sh_room_v2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `showtimes`
--

LOCK TABLES `showtimes` WRITE;
/*!40000 ALTER TABLE `showtimes` DISABLE KEYS */;
INSERT INTO `showtimes` VALUES (3,2,3,2,'2026-03-08 19:00:00'),(4,5,3,2,'2026-03-24 22:00:00'),(5,5,2,1,'2026-03-10 23:30:00'),(6,5,3,2,'2026-03-10 22:30:00'),(7,5,4,2,'2026-03-28 20:45:00');
/*!40000 ALTER TABLE `showtimes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `ticket_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int DEFAULT NULL,
  `showtime_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `cinema_id` int DEFAULT NULL,
  `seat_id` int NOT NULL,
  `ticket_code` varchar(50) NOT NULL,
  `price` decimal(16,0) DEFAULT NULL,
  `seat_status` enum('Available','Booked','Reserved','Maintenance') DEFAULT 'Available',
  `ticket_status` enum('Valid','Used','Cancelled') DEFAULT 'Valid',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `ticket_code` (`ticket_code`),
  UNIQUE KEY `uk_showtime_cinema_room_seat` (`showtime_id`,`cinema_id`,`room_id`,`seat_id`),
  KEY `idx_tk_booking` (`booking_id`),
  KEY `idx_tk_seat` (`seat_id`),
  KEY `fk_tickets_showtime_new` (`showtime_id`),
  KEY `idx_tickets_seat_status` (`seat_status`),
  KEY `idx_tickets_performance` (`showtime_id`,`seat_status`),
  CONSTRAINT `fk_tk_booking_v2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tk_seat_v2` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tk_showtime_v2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`showtime_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
INSERT INTO `tickets` VALUES (2,2,7,NULL,NULL,30,'TIC-1773373481376-30',80000,'Booked','Valid','2026-03-13 03:44:41','2026-03-13 03:44:46'),(3,3,7,NULL,NULL,21,'WAIT-1774339087937-21',80000,'Reserved','Valid','2026-03-24 07:58:07','2026-03-24 07:58:07'),(4,4,7,NULL,NULL,21,'WAIT-1774339144445-21',80000,'Reserved','Valid','2026-03-24 07:59:04','2026-03-24 07:59:04'),(5,5,7,NULL,NULL,21,'WAIT-1774339155631-21',80000,'Reserved','Valid','2026-03-24 07:59:15','2026-03-24 07:59:15'),(6,6,7,NULL,NULL,21,'WAIT-1774403260189-21',80000,'Reserved','Valid','2026-03-25 01:47:40','2026-03-25 01:47:40'),(7,7,7,NULL,NULL,23,'WAIT-1774403960356-23',80000,'Reserved','Valid','2026-03-25 01:59:20','2026-03-25 01:59:20'),(8,8,7,NULL,NULL,23,'WAIT-1774404196799-23',80000,'Reserved','Valid','2026-03-25 02:03:16','2026-03-25 02:03:16'),(9,9,7,4,2,35,'WAIT-1774406024134-35',80000,'Reserved','Valid','2026-03-25 02:33:44','2026-03-25 02:33:44'),(10,10,7,4,2,46,'WAIT-1774406241489-46',80000,'Reserved','Valid','2026-03-25 02:37:21','2026-03-25 02:37:21'),(11,11,7,4,2,34,'WAIT-1774406439228-34',80000,'Reserved','Valid','2026-03-25 02:40:39','2026-03-25 02:40:39'),(12,12,7,4,2,45,'WAIT-1774406952611-45',80000,'Reserved','Valid','2026-03-25 02:49:12','2026-03-25 02:49:12'),(13,13,7,4,2,70,'WAIT-1774407241650-70',80000,'Reserved','Valid','2026-03-25 02:54:01','2026-03-25 02:54:01'),(14,14,7,4,2,15,'WAIT-1774407489387-15',80000,'Booked','Valid','2026-03-25 02:58:09','2026-03-25 02:58:09'),(15,15,7,4,2,42,'WAIT-1774409383379-42',80000,'Reserved','Valid','2026-03-25 03:29:43','2026-03-25 03:29:43'),(16,16,7,4,2,41,'WAIT-1774409849040-41',80000,'Reserved','Valid','2026-03-25 03:37:29','2026-03-25 03:37:29'),(17,17,7,4,2,55,'WAIT-1774410166709-55',80000,'Reserved','Valid','2026-03-25 03:42:46','2026-03-25 03:42:46'),(18,18,7,4,2,39,'WAIT-1774410443038-39',80000,'Reserved','Valid','2026-03-25 03:47:23','2026-03-25 03:47:23'),(19,19,7,4,2,38,'TIC-1774411129467-38',80000,'Booked','Valid','2026-03-25 03:58:49','2026-03-25 04:00:55'),(20,20,7,4,2,31,'TIC-1774582837416-31',80000,'Booked','Valid','2026-03-27 03:40:37','2026-03-27 03:40:43'),(21,21,7,4,2,50,'TIC-1774583976170-50',80000,'Booked','Valid','2026-03-27 03:59:36','2026-03-27 03:59:41'),(22,22,7,4,2,23,'TIC-1774665234340-23',80000,'Booked','Valid','2026-03-28 02:33:54','2026-03-28 02:34:00');
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(10) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','customer') DEFAULT 'customer',
  `points` int DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_users_login` (`username`,`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','Quang Dũng Admin','0901234567','TP. Long Xuyên','admin@cinema.com','123456','admin',1000),(2,'khachhang1','Nguyễn Văn A','0987654321','Cần Thơ','vana@gmail.com','123456','customer',50),(3,'quangdungvip','Nguyễn Phạm Quang Dũng','0070070070','Hà Nội','cokhitienphat4919@gmail.com','$2b$10$6hBqRXZ4pwXnOCJADPkRUeFjqx2fWphnXfwkGzRPNrbMQq/yPGCKe','customer',4500),(4,'quangdungcinema','Nguyễn Phạm Quang Dũng','0567465321','Vũng Tàu','dungcinema@gmail.com','$2b$10$SxbqOwvR3eCuI0KXQv4AROfcF7onR8iTDZSxqlmA6cTEcATmc8nUm','admin',0),(6,'Dungvippro098','Nguyễn Trần Chí Tài','0943535352','123 Nguyễn Văn Trỗi','nguyennmhdunghihi@gmail.com','$2b$10$0WDQ8OL.z5UO1xjiCoPmLuwFST9CnH2IU6QK7u0Oh1yA/RljuUXE.','customer',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-30 11:34:15
