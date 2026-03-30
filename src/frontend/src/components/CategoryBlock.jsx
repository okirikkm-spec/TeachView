import { useState, useRef } from "react";
import VideoCard from "./VideoCard";

export default function CategoryBlock({ title, videos }) {
    
    const [expanded, setExpanded] = useState(false);

    const scrollRef = useRef(null);

    const scroll = (dir) => {
        scrollRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth'})
    };

    return(
        <section className="category-block">

            <div className="category-header" onClick={() => setExpanded(e => !e)}>
                <h2 className="category-title">{title}</h2>
                <span className="category-arrow">
                    {expanded ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    )}
                </span>
            </div>

            {expanded ? (
                <div className="category-grid">
                    {videos.map(v => (
                        <VideoCard key={v.id} video={v} />
                    ))}
                </div>
            ) : (
                <div className="category-scroll-wrapper">
                    <button className="category-scroll-btn category-scroll-btn--left"
                        onClick={(e) => {e.stopPropagation(); scroll(-1); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <div className="category-scroll" ref={scrollRef}>
                        {videos.map(v => (
                            <VideoCard key={v.id} video={v} />
                        ))}
                    </div>

                    <button
                        className="category-scroll-btn category-scroll-btn--right"
                        onClick={(e) => { e.stopPropagation(); scroll(1); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )
        }

        </section>
    )
}