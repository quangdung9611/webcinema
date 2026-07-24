const ShowTimeRepository = require("../Repositories/ShowTimeRepository");

const formatDateTime = (dateTime) => {
  if (!dateTime) return null;
  return dateTime.replace("T", " ").substring(0, 16);
};

const validateShowtime = (data) => {
  const { movie_id, cinema_id, room_id, start_time } = data;
  if (!movie_id || !cinema_id || !room_id || !start_time) {
    return "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu";
  }
  return null;
};

class ShowTimeService {
  async getAllShowtimes() {
    return await ShowTimeRepository.findAll();
  }

  async getShowtimeDetail(id) {
    const showtime = await ShowTimeRepository.findById(id);
    if (!showtime) {
      const err = new Error("Không tìm thấy suất chiếu");
      err.statusCode = 404;
      throw err;
    }
    return showtime;
  }

  async getShowtimesByMovie(movieId) {
    return await ShowTimeRepository.findByMovie(movieId);
  }

  async createShowtime(data) {
    let { movie_id, cinema_id, room_id, start_time } = data;

    start_time = formatDateTime(start_time);
    movie_id = Number(movie_id);
    cinema_id = Number(cinema_id);
    room_id = Number(room_id);

    const error = validateShowtime({ movie_id, cinema_id, room_id, start_time });
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const isPast = await ShowTimeRepository.isPastTime(start_time);
    if (isPast) {
      const err = new Error("Không thể tạo suất chiếu trong quá khứ");
      err.statusCode = 400;
      err.field = "start_time";
      throw err;
    }

    const conflict = await ShowTimeRepository.findConflict(room_id, start_time);
    if (conflict) {
      const err = new Error("Phòng này đã có lịch chiếu vào giờ đó");
      err.statusCode = 400;
      err.field = "start_time";
      throw err;
    }

    return await ShowTimeRepository.create({
      movie_id,
      cinema_id,
      room_id,
      start_time,
    });
  }

  async updateShowtime(id, data) {
    let { movie_id, cinema_id, room_id, start_time } = data;

    const existing = await ShowTimeRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy suất chiếu");
      err.statusCode = 404;
      throw err;
    }

    start_time = formatDateTime(start_time);
    movie_id = Number(movie_id);
    cinema_id = Number(cinema_id);
    room_id = Number(room_id);

    const error = validateShowtime({ movie_id, cinema_id, room_id, start_time });
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const isPast = await ShowTimeRepository.isPastTime(start_time);
    if (isPast) {
      const err = new Error("Không thể cập nhật suất chiếu trong quá khứ");
      err.statusCode = 400;
      err.field = "start_time";
      throw err;
    }

    const conflict = await ShowTimeRepository.findConflict(room_id, start_time, id);
    if (conflict) {
      const err = new Error("Phòng này đã có lịch chiếu giờ đó");
      err.statusCode = 400;
      err.field = "start_time";
      throw err;
    }

    const affected = await ShowTimeRepository.update(id, {
      movie_id,
      cinema_id,
      room_id,
      start_time,
    });

    if (affected === 0) {
      const err = new Error("Không thể cập nhật suất chiếu");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }

  async deleteShowtime(id) {
    const existing = await ShowTimeRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy suất chiếu");
      err.statusCode = 404;
      throw err;
    }

    const hasTickets = await ShowTimeRepository.hasTickets(id);
    if (hasTickets) {
      const err = new Error("Suất chiếu này đã có vé bán, không thể xóa");
      err.statusCode = 400;
      throw err;
    }

    const affected = await ShowTimeRepository.delete(id);
    if (affected === 0) {
      const err = new Error("Không thể xóa suất chiếu");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }

  async getQuickBookingData(movie_id, cinema_id, date) {
    if (!movie_id && !cinema_id && !date) {
      return await ShowTimeRepository.getQuickBookingMovies();
    }

    if (movie_id && !cinema_id && !date) {
      return await ShowTimeRepository.getQuickBookingCinemas(movie_id);
    }

    if (movie_id && cinema_id && !date) {
      return await ShowTimeRepository.getQuickBookingDates(movie_id, cinema_id);
    }

    if (movie_id && cinema_id && date) {
      return await ShowTimeRepository.getQuickBookingTimes(movie_id, cinema_id, date);
    }

    return [];
  }

  async getShowtimesForBooking(movie_id, cinema_id, date) {
    if (!movie_id || !cinema_id || !date) {
      const err = new Error("Vui lòng chọn rạp và ngày");
      err.statusCode = 400;
      throw err;
    }
    return await ShowTimeRepository.getShowtimesForBooking(movie_id, cinema_id, date);
  }

  async filterShowtimes(movie_id, room_id, date) {
    if (!movie_id || !room_id || !date) {
      const err = new Error("Thiếu dữ liệu lọc");
      err.statusCode = 400;
      throw err;
    }
    return await ShowTimeRepository.filterShowtimes(movie_id, room_id, date);
  }
}

module.exports = new ShowTimeService();