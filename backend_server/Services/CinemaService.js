const CinemaRepository = require("../Repositories/CinemaRepository");

const createSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/([^0-9a-z-\s])/g, "")
    .replace(/(\s+)/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const validateCinema = (data) => {
  const { cinema_name, address, city, hotline, map_link } = data;

  if (!cinema_name || !address || !city || !hotline || !map_link) {
    return "Vui lòng nhập đầy đủ thông tin rạp";
  }
  if (cinema_name.trim().length < 5) {
    return "Tên rạp phải từ 5 ký tự trở lên";
  }
  if (!/^[0-9]{8,15}$/.test(hotline)) {
    return "Hotline không hợp lệ";
  }
  try {
    new URL(map_link);
  } catch {
    return "Link Google Map không hợp lệ";
  }
  return null;
};

class CinemaService {
  async getAllCinemas() {
    return await CinemaRepository.findAll();
  }

  async getCinemaById(id) {
    const cinema = await CinemaRepository.findById(id);
    if (!cinema) {
      const err = new Error("Không tìm thấy rạp");
      err.statusCode = 404;
      throw err;
    }
    return cinema;
  }

  async getCinemaBySlug(slug) {
    const cinema = await CinemaRepository.findBySlug(slug);
    if (!cinema) {
      const err = new Error("Không tìm thấy rạp");
      err.statusCode = 404;
      throw err;
    }
    // Lấy thêm danh sách phim đang chiếu tại rạp
    const movies = await CinemaRepository.getMoviesByCinema(cinema.cinema_id);
    // Nhóm phim theo movie_id
    const map = {};
    movies.forEach(row => {
      if (!map[row.movie_id]) {
        map[row.movie_id] = {
          movie_id: row.movie_id,
          title: row.title,
          movie_poster: row.movie_poster,
          showtimes: []
        };
      }
      map[row.movie_id].showtimes.push({
        showtime_id: row.showtime_id,
        start_time: row.start_time
      });
    });
    return {
      ...cinema,
      movies: Object.values(map)
    };
  }

  async createCinema(data) {
    const { cinema_name, address, city, hotline, map_link } = data;

    const error = validateCinema(data);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const name = cinema_name.trim();

    // Check duplicate name
    const dupName = await CinemaRepository.findByName(name);
    if (dupName) {
      const err = new Error("Tên rạp này đã tồn tại");
      err.statusCode = 400;
      err.field = "cinema_name";
      throw err;
    }

    // Check duplicate hotline
    const dupHotline = await CinemaRepository.findByHotline(hotline);
    if (dupHotline) {
      const err = new Error("Số hotline này đã tồn tại");
      err.statusCode = 400;
      err.field = "hotline";
      throw err;
    }

    const slug = createSlug(name);

    return await CinemaRepository.create({
      cinema_name: name,
      slug,
      address,
      city,
      hotline,
      map_link
    });
  }

  async updateCinema(id, data) {
    const existing = await CinemaRepository.findById(id);
    if (!existing) {
      const err = new Error("Rạp không tồn tại");
      err.statusCode = 404;
      throw err;
    }

    const { cinema_name, address, city, hotline, map_link } = data;

    const error = validateCinema(data);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const name = cinema_name.trim();

    // Check duplicate name (exclude self)
    const dupName = await CinemaRepository.findByName(name, id);
    if (dupName) {
      const err = new Error("Tên rạp này đã được sử dụng");
      err.statusCode = 400;
      err.field = "cinema_name";
      throw err;
    }

    const dupHotline = await CinemaRepository.findByHotline(hotline, id);
    if (dupHotline) {
      const err = new Error("Số hotline đã được sử dụng");
      err.statusCode = 400;
      err.field = "hotline";
      throw err;
    }

    const slug = createSlug(name);

    await CinemaRepository.update(id, {
      cinema_name: name,
      slug,
      address,
      city,
      hotline,
      map_link
    });

    return true;
  }

  async deleteCinema(id) {
    const existing = await CinemaRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy rạp");
      err.statusCode = 404;
      throw err;
    }
    const affected = await CinemaRepository.delete(id);
    if (affected === 0) {
      const err = new Error("Không thể xóa rạp (có thể đang liên kết dữ liệu)");
      err.statusCode = 400;
      throw err;
    }
    return true;
  }
}

module.exports = new CinemaService();