import React,{
    useEffect,
    useState,
    useCallback
} from "react";

import axios from "axios";

import {
    motion,
    AnimatePresence
} from "framer-motion";

import MovieCard from "../components/MovieCard";

import "../styles/FilmGenre.css";


const FilmGenre = () => {


const [movies,setMovies]=useState([]);

const [genres,setGenres]=useState([]);

const [loading,setLoading]=useState(true);

const [activeGenre,setActiveGenre]=useState("");



const baseUrl =
"https://api.quangdungcinema.id.vn/uploads/posters/";



/*==========================
FETCH MOVIES
==========================*/

const fetchMovies = useCallback(

async(genreSlug)=>{


try{

setLoading(true);


let url="";


if(!genreSlug){

url=
"https://api.quangdungcinema.id.vn/api/movies";

}
else{

url=
`https://api.quangdungcinema.id.vn/api/movies/with-genre?genre=${genreSlug}`;

}


const res =
await axios.get(url);


setMovies(

res.data || []

);


}


catch(error){

console.error(error);

setMovies([]);

}


finally{

setLoading(false);

}


},[]);



/*==========================
FETCH GENRES
==========================*/


useEffect(()=>{


const fetchGenres = async()=>{


try{


const res = await axios.get(

"https://api.quangdungcinema.id.vn/api/genres"

);


setGenres(

res.data || []

);


}

catch(error){

console.error(error);

}


};


fetchGenres();


},[]);




/*==========================
LOAD MOVIES
==========================*/


useEffect(()=>{


fetchMovies(

activeGenre

);


},

[
activeGenre,
fetchMovies
]

);




/*==========================
ANIMATION
==========================*/


const containerVariants={


hidden:{},


show:{


transition:{

staggerChildren:.08

}


}


};



const cardVariants={


hidden:{


opacity:0,

y:80,

scale:.9,

filter:"blur(10px)"


},



show:{


opacity:1,

y:0,

scale:1,

filter:"blur(0px)",


transition:{


duration:.9,

ease:[0.16,1,0.3,1]


}


}


};



return(


<div className="film-genre-page">


{/* TABS */}

<div className="genre-tabs">


<button

className={

activeGenre===""

?

"genre-tab active"

:

"genre-tab"

}

onClick={()=>setActiveGenre("")}

>

Tất cả

</button>



{

genres.map((genre)=>(


<button

key={genre.genre_id}


className={

activeGenre===genre.slug

?

"genre-tab active"

:

"genre-tab"

}


onClick={()=>setActiveGenre(

genre.slug

)}

>


{genre.genre_name}


</button>


))

}


</div>





{/* MOVIES */}


<div className="filmgenre-container">


<div className="filmgenre-section-header">


<h2>

DANH SÁCH PHIM

</h2>


<div className="filmgenre-line"/>


</div>



{

loading

?


<div className="loading-movies">

Đang tải phim...

</div>


:


movies.length===0


?


<div className="empty-movies">

Không có phim nào

</div>



:



<motion.div


className="genre-movies-grid"


variants={containerVariants}

initial="hidden"

animate="show"

>



<AnimatePresence>


{

movies.map(movie=>(


<motion.div


key={movie.movie_id}


variants={cardVariants}

layout


>


<MovieCard


movie={movie}

baseUrl={baseUrl}


/>



</motion.div>


))


}


</AnimatePresence>



</motion.div>



}


</div>


</div>


);


};


export default FilmGenre;