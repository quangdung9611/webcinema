const express = require('express');
const router = express.Router();
const movieGenreController = require('../Controllers/MovieGenreController');

// GET ALL ASSIGNMENTS
router.get(
  '/all-assignments',
  movieGenreController.getAllAssignments
);

// UPDATE MOVIE GENRES
router.post(
  '/update',
  movieGenreController.updateMovieGenres
);

// GET MOVIES BY GENRE SLUG
router.get(
  '/:slug',
  movieGenreController.getMoviesByGenreSlug
);

// GET GENRES BY MOVIE ID
router.get(
  '/movie/:movie_id',
  movieGenreController.getGenresByMovieId
);

module.exports = router;