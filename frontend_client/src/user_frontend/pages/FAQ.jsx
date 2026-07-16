import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  CircleHelp,
  Ticket,
  CreditCard,
  Clock,
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Calendar,
  Star,
  Gift,
  FileText,
  Headphones,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import '../styles/FAQ.css';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      id: 1,
      icon: <Ticket size={24} />,
      category: 'Đặt vé',
      question: 'Làm thế nào để đặt vé xem phim trực tuyến tại CineStar?',
      answer: `
        Đặt vé xem phim trực tuyến tại CineStar rất đơn giản và nhanh chóng. Bạn có thể thực hiện theo các bước hướng dẫn chi tiết dưới đây:

        Bước 1: Truy cập website chính thức của CineStar tại địa chỉ cinemastar.vn hoặc tải ứng dụng CineStar trên App Store (iOS) hoặc CH Play (Android).

        Bước 2: Đăng nhập vào tài khoản của bạn. Nếu chưa có tài khoản, bạn có thể đăng ký miễn phí chỉ với vài thao tác đơn giản bằng email hoặc số điện thoại.

        Bước 3: Chọn phim bạn muốn xem từ danh sách "Phim đang chiếu" hoặc "Phim sắp chiếu". Bạn có thể xem trailer, đọc mô tả phim, đánh giá và thông tin chi tiết về phim trước khi quyết định.

        Bước 4: Chọn suất chiếu phù hợp. Hệ thống sẽ hiển thị các suất chiếu có sẵn tại các rạp của CineStar. Bạn có thể lọc theo rạp gần nhất, ngày chiếu, hoặc giờ chiếu để dễ dàng tìm kiếm.

        Bước 5: Chọn vị trí ghế ngồi. Sơ đồ phòng chiếu sẽ hiển thị rõ ràng các ghế đã có người đặt (màu đỏ) và ghế trống (màu xanh). Bạn có thể chọn nhiều ghế cùng lúc nếu đặt vé cho nhóm.

        Bước 6: Kiểm tra lại thông tin đặt vé bao gồm: tên phim, suất chiếu, rạp, số lượng vé, vị trí ghế và tổng tiền. Nếu có mã giảm giá hoặc voucher, bạn có thể nhập vào ô tương ứng để được giảm giá.

        Bước 7: Tiến hành thanh toán qua các phương thức hỗ trợ như: thẻ tín dụng/ghi nợ (Visa, MasterCard, JCB), ví điện tử (MoMo, ZaloPay, VNPay), hoặc chuyển khoản ngân hàng. Giao dịch được bảo mật bằng công nghệ mã hóa SSL 256-bit.

        Bước 8: Sau khi thanh toán thành công, bạn sẽ nhận được mã vé điện tử qua email và tin nhắn SMS. Mã vé này có thể được sử dụng để vào rạp bằng cách quét mã QR tại quầy soát vé hoặc máy tự động.

        Lưu ý: Bạn có thể đặt vé trước tối đa 7 ngày để có nhiều sự lựa chọn về ghế ngồi và suất chiếu.
      `
    },
    {
      id: 2,
      icon: <CreditCard size={24} />,
      category: 'Thanh toán',
      question: 'Các phương thức thanh toán nào được chấp nhận tại CineStar?',
      answer: `
        CineStar cung cấp đa dạng các phương thức thanh toán để mang lại sự tiện lợi tối đa cho khách hàng. Dưới đây là danh sách chi tiết các hình thức thanh toán được hỗ trợ:

        1. Thẻ tín dụng và thẻ ghi nợ (Credit/Debit Cards):
           - Visa: Tất cả các loại thẻ Visa bao gồm Visa Classic, Visa Gold, Visa Platinum, Visa Infinite.
           - MasterCard: MasterCard Standard, MasterCard Gold, MasterCard Platinum, MasterCard World.
           - JCB: Thẻ JCB được chấp nhận tại tất cả các rạp CineStar.
           - American Express (Amex): Hỗ trợ thanh toán qua Amex với hạn mức cao.

        2. Ví điện tử (E-wallets):
           - MoMo: Ví điện tử phổ biến nhất Việt Nam, hỗ trợ thanh toán nhanh chóng.
           - ZaloPay: Tích hợp với Zalo, thanh toán dễ dàng qua ứng dụng.
           - VNPay: Cổng thanh toán điện tử uy tín, hỗ trợ nhiều ngân hàng.
           - ViettelPay: Dành cho khách hàng sử dụng mạng Viettel.

        3. Chuyển khoản ngân hàng (Bank Transfer):
           - Chuyển khoản qua các ngân hàng nội địa: Vietcombank, BIDV, Techcombank, VietinBank, MB Bank, ACB, Sacombank, VPBank, và nhiều ngân hàng khác.
           - Bạn sẽ nhận được số tài khoản và nội dung chuyển khoản sau khi xác nhận đặt vé.
           - Lưu ý: Thời gian xác nhận chuyển khoản có thể mất từ 15 phút đến 1 giờ tùy ngân hàng.

        4. Thanh toán tại quầy (Pay at Counter):
           - Bạn có thể đặt vé trực tuyến và đến quầy thanh toán tại rạp để thanh toán bằng tiền mặt hoặc thẻ.
           - Phương thức này phù hợp nếu bạn muốn giữ chỗ trước nhưng chưa thể thanh toán ngay.

        5. Voucher và Gift Card:
           - Nhập mã voucher hoặc mã gift card khi thanh toán để được giảm giá trực tiếp.
           - Voucher có thể được tặng trong các chương trình khuyến mãi hoặc sự kiện đặc biệt.

        Cam kết của CineStar: Mọi giao dịch thanh toán đều được bảo mật tuyệt đối bằng công nghệ mã hóa SSL 256-bit, đảm bảo thông tin thẻ và dữ liệu cá nhân của bạn không bị rò rỉ. Chúng tôi không lưu trữ thông tin thẻ tín dụng trên hệ thống của mình.
      `
    },
    {
      id: 3,
      icon: <Clock size={24} />,
      category: 'Chính sách',
      question: 'Chính sách hủy vé và hoàn tiền của CineStar như thế nào?',
      answer: `
        CineStar luôn thấu hiểu rằng có những tình huống bất khả kháng khiến bạn không thể đến xem phim đúng giờ. Vì vậy, chúng tôi xây dựng chính sách hủy vé và hoàn tiền linh hoạt và minh bạch như sau:

        1. Hủy vé trước 2 giờ so với suất chiếu:
           - Bạn sẽ được hoàn lại 100% số tiền vé đã thanh toán.
           - Cách thực hiện: Liên hệ bộ phận hỗ trợ khách hàng qua hotline 1900 1234 hoặc gửi email đến support@cinemastar.vn với mã số vé và lý do hủy.
           - Tiền hoàn sẽ được chuyển lại vào tài khoản ngân hàng hoặc ví điện tử của bạn trong vòng 3-5 ngày làm việc.

        2. Hủy vé trong vòng 2 giờ trước suất chiếu:
           - Bạn sẽ được hoàn lại 50% số tiền vé đã thanh toán.
           - Phần 50% còn lại sẽ được chuyển thành voucher để bạn sử dụng cho lần đặt vé tiếp theo (có giá trị trong 30 ngày).

        3. Không hoàn tiền trong các trường hợp sau:
           - Sau khi suất chiếu đã bắt đầu.
           - Khi bạn đã vào rạp và nhận vé.
           - Không xuất trình được mã vé hoặc thông tin đặt vé.
           - Yêu cầu hủy vé sau khi suất chiếu đã kết thúc.

        4. Trường hợp sự cố kỹ thuật hoặc hủy suất chiếu từ phía rạp:
           - CineStar sẽ hoàn trả 100% tiền vé cho tất cả khách hàng đã đặt vé cho suất chiếu đó.
           - Ngoài ra, mỗi khách hàng sẽ được tặng thêm 01 vé xem phim miễn phí (có giá trị trong 60 ngày) như một lời xin lỗi vì sự bất tiện.

        5. Đổi vé sang suất chiếu khác:
           - Hiện tại, CineStar không hỗ trợ đổi vé sang suất chiếu khác. Bạn cần hủy vé và đặt lại nếu muốn thay đổi.
           - Chính sách hủy vé sẽ được áp dụng như trên.

        Lưu ý: Mọi yêu cầu hủy vé và hoàn tiền vui lòng thực hiện trước giờ chiếu ít nhất 2 giờ. Bạn có thể liên hệ qua hotline 1900 1234 (hoạt động 24/7) hoặc gửi email đến support@cinemastar.vn để được hỗ trợ nhanh chóng.
      `
    },
    {
      id: 4,
      icon: <User size={24} />,
      category: 'Thành viên',
      question: 'Chương trình thành viên VIP của CineStar có gì đặc biệt?',
      answer: `
        Chương trình thành viên VIP của CineStar được thiết kế dành riêng cho những khách hàng yêu thích điện ảnh và thường xuyên sử dụng dịch vụ của chúng tôi. Với nhiều cấp độ thành viên, bạn càng sử dụng nhiều thì quyền lợi càng lớn.

        1. Cấp độ thành viên:
           - Thành viên Bạc (Silver): Tích lũy từ 0 – 100 điểm. Được giảm 5% giá vé.
           - Thành viên Vàng (Gold): Tích lũy từ 101 – 300 điểm. Được giảm 10% giá vé và ưu tiên đặt vé trước 12 giờ.
           - Thành viên Bạch Kim (Platinum): Tích lũy trên 300 điểm. Được giảm 20% giá vé, ưu tiên đặt vé trước 24 giờ, và các ưu đãi độc quyền.

        2. Cách tích lũy điểm:
           - Mỗi 1.000 VND chi tiêu cho vé xem phim, bạn nhận được 1 điểm thưởng.
           - Điểm được cộng tự động vào tài khoản thành viên sau mỗi giao dịch thành công.
           - Điểm có giá trị trong vòng 12 tháng kể từ ngày tích lũy.

        3. Quyền lợi đặc biệt:
           - Ưu đãi sinh nhật: Nhận ngay 01 vé xem phim miễn phí vào dịp sinh nhật của bạn (có giá trị trong 30 ngày).
           - Voucher độc quyền: Nhận các mã giảm giá và combo bắp nước đặc biệt chỉ dành cho thành viên VIP.
           - Sự kiện riêng: Tham gia các buổi chiếu phim đặc biệt, gặp gỡ diễn viên, hoặc sự kiện ra mắt phim mới.
           - Quà tặng tri ân: Vào các dịp lễ, Tết, thành viên VIP sẽ nhận được quà tặng từ CineStar.

        4. Cách đăng ký:
           - Đăng ký thành viên VIP hoàn toàn miễn phí trên website hoặc ứng dụng di động của CineStar.
           - Hoặc đăng ký trực tiếp tại quầy vé của bất kỳ rạp CineStar nào trên toàn quốc.

        Hãy đăng ký ngay hôm nay để bắt đầu tích lũy điểm và tận hưởng những quyền lợi tuyệt vời từ CineStar!
      `
    },
    {
      id: 5,
      icon: <Shield size={24} />,
      category: 'Bảo mật',
      question: 'CineStar bảo vệ thông tin cá nhân của khách hàng như thế nào?',
      answer: `
        CineStar đặt sự an toàn và bảo mật thông tin cá nhân của khách hàng lên hàng đầu. Chúng tôi áp dụng các biện pháp bảo mật tiên tiến nhất để đảm bảo dữ liệu của bạn luôn được bảo vệ.

        1. Công nghệ mã hóa:
           - Toàn bộ dữ liệu truyền tải giữa thiết bị của bạn và máy chủ của CineStar được mã hóa bằng giao thức SSL/TLS 256-bit, đạt tiêu chuẩn bảo mật ngân hàng.
           - Thông tin thanh toán như số thẻ tín dụng, mã CVV, và thông tin ví điện tử được mã hóa và không được lưu trữ trên hệ thống của chúng tôi.

        2. Bảo mật dữ liệu lưu trữ:
           - Mật khẩu của bạn được mã hóa bằng thuật toán băm (hash) một chiều, ngay cả nhân viên CineStar cũng không thể đọc được.
           - Dữ liệu cá nhân được lưu trữ trên các máy chủ có tường lửa và hệ thống phát hiện xâm nhập (IDS/IPS) hoạt động 24/7.
           - Chúng tôi thực hiện sao lưu dữ liệu thường xuyên để đảm bảo an toàn trước các sự cố kỹ thuật.

        3. Quyền truy cập hạn chế:
           - Chỉ nhân viên được ủy quyền mới có thể truy cập dữ liệu cá nhân của khách hàng, và họ phải tuân thủ các quy định bảo mật nghiêm ngặt.
           - Mọi truy cập vào dữ liệu đều được ghi lại nhật ký để giám sát và kiểm tra.

        4. Cam kết của CineStar:
           - Chúng tôi cam kết không bán, cho thuê hoặc chia sẻ thông tin cá nhân của bạn với bên thứ ba vì mục đích tiếp thị.
           - Thông tin của bạn chỉ được chia sẻ với các đối tác thanh toán và nhà cung cấp dịch vụ khi cần thiết để xử lý giao dịch và cải thiện trải nghiệm.

        5. Quyền của bạn:
           - Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình bất kỳ lúc nào.
           - Để thực hiện các quyền này, vui lòng liên hệ với chúng tôi qua email support@cinemastar.vn hoặc hotline 1900 1234.

        CineStar luôn nỗ lực cập nhật các biện pháp bảo mật mới nhất để bảo vệ bạn. Nếu bạn có bất kỳ câu hỏi nào về bảo mật, đừng ngần ngại liên hệ với chúng tôi.
      `
    },
    {
      id: 6,
      icon: <AlertCircle size={24} />,
      category: 'Hỗ trợ',
      question: 'Tôi nên làm gì nếu gặp sự cố khi đặt vé trực tuyến?',
      answer: `
        Gặp sự cố khi đặt vé là điều không ai mong muốn, nhưng đừng lo lắng! CineStar luôn sẵn sàng hỗ trợ bạn giải quyết mọi vấn đề phát sinh. Dưới đây là các tình huống thường gặp và cách xử lý:

        1. Lỗi thanh toán:
           - Kiểm tra lại thông tin thẻ tín dụng hoặc ví điện tử (số thẻ, ngày hết hạn, CVV, số dư).
           - Thử sử dụng phương thức thanh toán khác nếu phương thức hiện tại không hoạt động.
           - Đảm bảo kết nối Internet ổn định. Nếu mạng yếu, hãy chuyển sang mạng khác và thử lại.
           - Nếu vẫn không được, hãy chờ 5-10 phút và thử lại (có thể hệ thống thanh toán đang quá tải).

        2. Lỗi hiển thị sơ đồ ghế hoặc suất chiếu:
           - Tải lại trang web hoặc ứng dụng (nhấn F5 hoặc kéo thả xuống để làm mới).
           - Xóa cache và cookie của trình duyệt, sau đó đăng nhập lại.
           - Thử đăng nhập trên một trình duyệt hoặc thiết bị khác.
           - Nếu sự cố vẫn tiếp diễn, hãy chụp màn hình và gửi cho bộ phận hỗ trợ.

        3. Không nhận được mã vé sau khi thanh toán:
           - Kiểm tra hộp thư email (bao gồm cả thư mục Spam/Junk) và tin nhắn SMS.
           - Đăng nhập vào tài khoản của bạn trên website hoặc ứng dụng, vào mục "Lịch sử đặt vé" để xem và tải lại mã vé.
           - Nếu vẫn không tìm thấy, vui lòng liên hệ bộ phận hỗ trợ ngay lập tức.

        4. Lỗi hệ thống hoặc gián đoạn dịch vụ:
           - Trong trường hợp hệ thống đang bảo trì hoặc gặp sự cố kỹ thuật, chúng tôi sẽ thông báo trên website và ứng dụng.
           - Vui lòng thử lại sau 10-15 phút. Chúng tôi luôn nỗ lực khắc phục sự cố trong thời gian nhanh nhất.

        5. Các vấn đề khác:
           - Liên hệ ngay với bộ phận hỗ trợ khách hàng qua hotline 1900 1234 (hoạt động 24/7).
           - Gửi email đến support@cinemastar.vn với mô tả chi tiết vấn đề, kèm theo ảnh chụp màn hình (nếu có).
           - Sử dụng tính năng Chat trực tiếp trên website để được hỗ trợ tức thì.

        Đội ngũ hỗ trợ của CineStar luôn sẵn sàng giúp đỡ bạn 24 giờ mỗi ngày, 7 ngày mỗi tuần. Đừng ngần ngại liên hệ với chúng tôi!
      `
    },
    {
      id: 7,
      icon: <Calendar size={24} />,
      category: 'Suất chiếu',
      question: 'Có thể đặt vé trước bao nhiêu ngày?',
      answer: `
        CineStar cho phép khách hàng đặt vé xem phim trước tối đa 7 ngày so với ngày chiếu. Điều này mang lại sự thuận tiện tối đa cho bạn trong việc sắp xếp lịch trình và lựa chọn chỗ ngồi ưng ý nhất.

        Dưới đây là những điều bạn cần biết về việc đặt vé trước tại CineStar:

        1. Thời gian đặt vé trước:
           - Vé được mở bán từ 7 ngày trước ngày chiếu. Ví dụ: Nếu phim chiếu vào thứ Bảy tuần sau, bạn có thể đặt vé từ thứ Bảy tuần này.
           - Đối với các phim bom tấn, vé thường được mở bán sớm hơn (10-14 ngày) để đáp ứng nhu cầu của khán giả.
           - Thời gian mở bán cụ thể sẽ được thông báo trên website và ứng dụng của CineStar.

        2. Lợi ích của việc đặt vé sớm:
           - Có nhiều lựa chọn về vị trí ghế ngồi, đặc biệt là các ghế đẹp (hàng giữa, khu vực trung tâm).
           - Dễ dàng sắp xếp lịch trình và kế hoạch xem phim của bạn.
           - Tránh tình trạng hết vé hoặc không còn ghế ưng ý vào phút cuối.
           - Đối với thành viên VIP, được ưu tiên đặt vé sớm hơn 24 giờ so với khách hàng thường.

        3. Lưu ý:
           - Vé đã đặt có thể được hủy theo chính sách hủy vé và hoàn tiền của CineStar.
           - Giá vé áp dụng tại thời điểm đặt và có thể thay đổi tùy theo chương trình khuyến mãi.
           - Đối với các suất chiếu đặc biệt (suất chiếu sớm, suất chiếu nửa đêm), thời gian mở bán có thể khác.

        4. Cách đặt vé trước:
           - Truy cập website hoặc ứng dụng CineStar.
           - Chọn phim và suất chiếu bạn mong muốn.
           - Chọn ghế ngồi và tiến hành thanh toán.
           - Nhận mã vé điện tử ngay sau khi thanh toán thành công.

        Hãy đặt vé sớm để có trải nghiệm xem phim tuyệt vời nhất tại CineStar!
      `
    },
    {
      id: 8,
      icon: <Star size={24} />,
      category: 'Chương trình',
      question: 'Các chương trình khuyến mãi và giảm giá hiện có tại CineStar?',
      answer: `
        CineStar thường xuyên tổ chức nhiều chương trình khuyến mãi và ưu đãi hấp dẫn dành cho khách hàng. Dưới đây là các chương trình ưu đãi đang được áp dụng:

        1. Ưu đãi thành viên VIP:
           - Giảm giá vé lên đến 20% cho thành viên Bạch Kim.
           - Tích lũy điểm thưởng và quy đổi thành vé xem phim miễn phí.
           - Nhận voucher giảm giá combo bắp nước vào mỗi tháng.

        2. Ưu đãi sinh nhật:
           - Tặng 01 vé xem phim miễn phí vào đúng ngày sinh nhật của bạn (có giá trị trong 30 ngày).
           - Tặng thêm 01 bắp nước cỡ lớn khi mua vé vào ngày sinh nhật.

        3. Ưu đãi theo ngày trong tuần:
           - Thứ Ba: Giảm 30% giá vé cho tất cả các suất chiếu (áp dụng cho tất cả khách hàng).
           - Thứ Năm: Giảm 20% giá vé cho khách hàng đặt vé qua ứng dụng di động.
           - Cuối tuần: Combo gia đình (2 vé + 1 bắp nước lớn + 1 bỏng ngô) với giá ưu đãi.

        4. Ưu đãi combo:
           - Combo độc quyền: 2 vé + 1 bắp nước lớn + 1 bỏng ngô chỉ từ 250.000đ (tiết kiệm đến 30%).
           - Combo VIP: 2 vé VIP + 1 bắp nước lớn + 1 bỏng ngô + 1 snack chỉ từ 350.000đ.

        5. Khuyến mãi đặc biệt:
           - Ưu đãi đầu tuần: 1 vé xem phim + 1 bắp nước nhỏ chỉ 99.000đ (áp dụng từ thứ 2 đến thứ 4).
           - Khuyến mãi học sinh, sinh viên: Giảm 20% giá vé khi xuất trình thẻ sinh viên (áp dụng các suất chiếu trước 17h00).

        6. Sự kiện đặc biệt:
           - Ra mắt phim bom tấn: Giảm giá vé cho các suất chiếu đặc biệt (suất chiếu sớm, suất chiếu nửa đêm).
           - Lễ hội phim quốc tế: Ưu đãi vé theo combo và quà tặng độc quyền.

        Cách nhận ưu đãi:
        - Đăng ký thành viên VIP để nhận thông tin ưu đãi hàng tuần.
        - Theo dõi website và fanpage CineStar để cập nhật các chương trình mới nhất.
        - Sử dụng mã giảm giá khi thanh toán (nếu có).

        Hãy nhanh tay đặt vé để tận hưởng những ưu đãi tuyệt vời từ CineStar!
      `
    }
  ];

  return (
    <div className="faq-page">
      <div className="faq-container">

        {/* HEADER */}
        <div className="faq-header">
          <div className="faq-header-icon">
            <CircleHelp size={52} />
          </div>
          <h1>Câu Hỏi Thường Gặp</h1>
          <p className="faq-header-desc">
            Tất cả những thắc mắc của bạn về đặt vé, thanh toán, chương trình ưu đãi và các dịch vụ tại CineStar đều được giải đáp chi tiết dưới đây.
          </p>
          <div className="faq-header-line"></div>
        </div>

        {/* BREADCRUMB */}
        <div className="faq-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Hỗ trợ</span>
          <ChevronRight size={14} />
          <span className="current">Câu hỏi thường gặp</span>
        </div>

        {/* STATS */}
        <div className="faq-stats">
          <div className="faq-stat">
            <span className="faq-stat-number">{faqs.length}</span>
            <span className="faq-stat-label">Câu hỏi giải đáp</span>
          </div>
          <div className="faq-stat">
            <span className="faq-stat-number">8</span>
            <span className="faq-stat-label">Chủ đề khác nhau</span>
          </div>
          <div className="faq-stat">
            <span className="faq-stat-number">24/7</span>
            <span className="faq-stat-label">Hỗ trợ tận tâm</span>
          </div>
        </div>

        {/* CATEGORY FILTER (đơn giản hóa) */}
        <div className="faq-categories">
          <span className="faq-category active">Tất cả</span>
          <span className="faq-category">Đặt vé</span>
          <span className="faq-category">Thanh toán</span>
          <span className="faq-category">Chính sách</span>
          <span className="faq-category">Thành viên</span>
          <span className="faq-category">Bảo mật</span>
          <span className="faq-category">Hỗ trợ</span>
        </div>

        {/* FAQ LIST */}
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className={`faq-item ${openIndex === index ? 'open' : ''}`}
              onClick={() => toggleFAQ(index)}
            >
              <div className="faq-question">
                <div className="faq-question-left">
                  <div className="faq-question-icon">{faq.icon}</div>
                  <div>
                    <span className="faq-question-category">{faq.category}</span>
                    <span className="faq-question-text">{faq.question}</span>
                  </div>
                </div>
                <div className="faq-question-arrow">
                  {openIndex === index ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </div>
              </div>
              <div className="faq-answer-wrapper">
                <div className="faq-answer">
                  {faq.answer.split('\n').map((line, idx) => {
                    if (line.trim() === '') return <br key={idx} />;
                    if (line.trim().startsWith('Bước') || line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.') || line.trim().startsWith('4.') || line.trim().startsWith('5.') || line.trim().startsWith('6.') || line.trim().startsWith('7.') || line.trim().startsWith('8.')) {
                      return <li key={idx} className="faq-answer-li">{line.trim()}</li>;
                    }
                    if (line.trim().startsWith('-')) {
                      return <li key={idx} className="faq-answer-li">{line.trim().substring(1)}</li>;
                    }
                    if (line.trim().startsWith('•')) {
                      return <li key={idx} className="faq-answer-li">{line.trim().substring(1)}</li>;
                    }
                    if (line.trim().startsWith('Lưu ý:')) {
                      return <p key={idx} className="faq-answer-note">{line.trim()}</p>;
                    }
                    return <p key={idx} className="faq-answer-p">{line.trim()}</p>;
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SUPPORT CTA */}
        <div className="faq-support">
          <h3>💬 Vẫn còn thắc mắc?</h3>
          <p>
            Nếu bạn không tìm thấy câu trả lời trong danh sách trên, đội ngũ hỗ trợ của CineStar luôn sẵn sàng giúp đỡ bạn 24/7.
          </p>
          <div className="faq-support-links">
            <Link to="/contact" className="faq-support-btn">
              <Phone size={18} />
              <span>Gọi ngay 1900 1234</span>
            </Link>
            <Link to="/contact" className="faq-support-btn outline">
              <Mail size={18} />
              <span>Gửi email hỗ trợ</span>
            </Link>
            <Link to="/contact" className="faq-support-btn ghost">
              <Headphones size={18} />
              <span>Chat trực tiếp</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FAQ;