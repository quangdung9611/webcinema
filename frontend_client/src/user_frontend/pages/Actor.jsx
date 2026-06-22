
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
            <div className="loading">
                Đang tải dữ liệu...
            </div>
        );

    }

    return (

        <div className="actor-page">

            {/* HERO */}

            <section className="actor-hero">
                <img
                    src="https://api.quangdungcinema.id.vn/uploads/banner_actor/actor_hero.png"
                    alt="Actor Banner"
                    className="hero-banner-img"
                />
                <div className="actor-overlay"></div>

                <div className="actor-content">

                    <div className="actor-text">

                        <span>GÓC ĐIỆN ẢNH</span>

                        <h1>ACTORS</h1>

                        <h3>
                            Những gương mặt tạo nên linh hồn điện ảnh
                        </h3>

                        <p>
                            Khám phá thông tin, tiểu sử, sự nghiệp,
                            thành tựu nổi bật và các tác phẩm đáng nhớ
                            của những diễn viên nổi tiếng trong và ngoài
                            nước được cộng đồng yêu điện ảnh quan tâm.
                        </p>

                        <a
                            href="#actor-list"
                            className="actor-hero-btn"
                        >
                            KHÁM PHÁ NGAY
                        </a>

                    </div>

                </div>

            </section>

            {/* LIST */}

            <section
                id="actor-list"
                className="actor-section"
            >

                <div className="actor-section-header">

                    <span className="section-line"></span>

                    <h2>
                        DANH SÁCH DIỄN VIÊN
                    </h2>

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

