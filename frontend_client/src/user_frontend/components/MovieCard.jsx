import { Star, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Tilt from "react-parallax-tilt";

import "../styles/MovieCard.css";

const MovieCard = ({ movie, baseUrl }) => {

    const navigate = useNavigate();


    const goDetail = () => {

        navigate(

            `/movies/detail/${movie.slug || movie.movie_slug}`

        );

    };


    const goBooking = (e) => {

        e.stopPropagation();

        navigate(

            `/booking/${movie.slug || movie.movie_slug}`,

            {

                state:{

                    movie:{

                        movie_id:movie.movie_id,

                        title:movie.title,

                        poster_url:movie.poster_url,

                        age_rating:movie.age_rating,

                        slug:movie.slug || movie.movie_slug

                    }

                }

            }

        );

    };


    return(

<Tilt

tiltMaxAngleX={6}
tiltMaxAngleY={6}

perspective={1200}

transitionSpeed={1200}

scale={1.03}

glareEnable

glareMaxOpacity={0.18}

className="movie-card"

>


<div className="movie-inner">


<div className="movie-poster">


<img

src={`${baseUrl}${movie.poster_url}`}

alt={movie.title}

/>



<div className="movie-overlay">


<button

className="movie-detail-btn"

onClick={goDetail}

>

CHI TIẾT

</button>



<button

className="movie-book-btn"

onClick={goBooking}

>


<Ticket size={16}/>

ĐẶT VÉ


</button>



</div>




<div className="movie-age-badge">


{

movie.age_rating ||

"T18"

}


</div>



</div>



<div

className="movie-info"

onClick={goDetail}

>


<h3>

{movie.title}

</h3>



<div className="movie-meta">


<span className="movie-rating">


<Star

size={16}

fill="#ffad27"

color="#ffad27"

/>


{

movie.rating ||

"9.0"

}



</span>




<span className="movie-type">


{

movie.language ||

"2D Phụ Đề"

}


</span>



</div>



</div>



</div>


</Tilt>

    );


};

export default MovieCard;