import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import '../styles/Actor.css';

const Actor = () => {

    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);

    const IMAGE_BASE_URL =
        'https://api.quangdungcinema.id.vn/uploads';

    useEffect(() => {

        const fetchActors = async () => {

            try{

                const res = await axios.get(
                    'https://api.quangdungcinema.id.vn/api/actors'
                );

                setActors(res.data);

            }catch(error){

                console.error(error);

            }finally{

                setLoading(false);

            }

        };

        fetchActors();

        window.scrollTo(0,0);

    },[]);

    if(loading){

        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Đang tải dữ liệu...</p>
            </div>
        );

    }

    return (

        <div className="actor-page">

         {/* ===== HERO ===== */}
        <section className="actor-hero">
            <img
                src="https://api.quangdungcinema.id.vn/uploads/banner_actor/actor_hero.png"
                alt="Actor Banner"
                className="hero-banner-img"
            />
        </section>

            {/* ===== LIST ===== */}
            <section
                id="actor-list"
                className="actor-section"
            >

                <div className="actor-section-header">
                    <div className="section-header-left">
                        <h2 className="section-title">DANH SÁCH DIỄN VIÊN</h2>
                    </div>
                </div>

                <div className="actor-grid">

                    {actors.map(actor => (

                        <div
                            key={actor.actor_id}
                            className="actor-card"
                        >

                            <Link
                                to={`/actor/${actor.slug}`}
                                className="actor-image"
                            >

                                <img
                                    src={`${IMAGE_BASE_URL}/actors/${actor.avatar}`}
                                    alt={actor.name}
                                />

                            </Link>

                            <div className="actor-info">

                                <Link
                                    to={`/actor/${actor.slug}`}
                                    className="actor-title"
                                >
                                    {actor.name}
                                </Link>

                                <div className="actor-meta">

                                    <Eye size={14}/>

                                    <span>
                                        {Math.floor(
                                            Math.random() * 5000
                                        )}
                                        lượt xem
                                    </span>

                                </div>

                                <p>

                                    {actor.biography
                                        ? actor.biography
                                            .replace(/<[^>]*>/g,'')
                                            .replace(/&nbsp;/g,' ')
                                            .substring(0,140) + '...'
                                        : 'Thông tin đang cập nhật...'}

                                </p>

                            </div>

                        </div>

                    ))}

                </div>

            </section>

        </div>

    );

};

export default Actor;