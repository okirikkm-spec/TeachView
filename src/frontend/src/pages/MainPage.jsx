import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAllVideos } from '../services/videoApi';
import Navbar from '../components/Navbar';
import CategoryBlock from '../components/CategoryBlock';


function groupByTag(videos) {
    const map = {};
    videos.forEach(v => {
        const tags = Array.isArray(v.tags) && v.tags.length > 0
        ? v.tags : ['Без категории'];

        tags.forEach(tag => {
            if (!map[tag]) map[tag] = [];
            map[tag].push(v);
        });
    });
    return map;
}

function groupByAuthor(videos) {
    const map = {};
    videos.forEach(v => {
        const author = v.uploadedBy || 'Неизвестен';
        if (!map[author]) map[author] = [];
        map[author].push(v);
    });
    return map;
}

export default function MainPage() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupMode, setGroupMode] = useState('tag');
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');

    const activeTag = searchParams.get('tag');

    useEffect(() => {
        fetchAllVideos()
            .then(data => {
                setVideos(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const filteredVideos = searchQuery
        ? videos.filter(v => {
            const q = searchQuery.toLowerCase();
            return (v.title || v.filename || '').toLowerCase().includes(q)
            || (v.uploadedBy || '').toLowerCase().includes(q)
            || (v.tags || []).some(t => t.toLowerCase().includes(q));
        })
        : videos;

    const allGroups = groupMode === 'tag' ? groupByTag(filteredVideos) : groupByAuthor(filteredVideos);

    const groups = activeTag
        ? Object.fromEntries(Object.entries(allGroups).filter(([k]) => k === activeTag))
        : allGroups;

    return(
        <>
            <Navbar showSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

            <div className="main-page">

                <div className="main-page-controls">
                    <button className={`btn btn-sm ${groupMode === 'tag' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setGroupMode('tag')}>
                        По категориям
                    </button>
                    <button className={`btn btn-sm ${groupMode === 'author' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setGroupMode('author')}>
                        По авторам
                    </button>
                    {activeTag && (
                        <span className="tag-filter-badge">
                            #{activeTag}
                            <button
                                className="tag-filter-clear"
                                onClick={() => setSearchParams({})}
                                title="Сбросить фильтр"
                            >×</button>
                        </span>
                    )}
                </div>

                {!loading && error && (
                    <p className="main-page-state main-page--error">{error}</p>
                )}

                {!loading && !error && videos.length === 0 && (
                    <p className="main-page-state">Видео пока нет</p>
                )}

                {!loading && !error && Object.entries(groups).map(([groupTitle, groupVideos]) => (
                    <CategoryBlock
                        key={groupTitle}
                        title={groupTitle}
                        videos={groupVideos}
                    />
                ))}
            </div>
        </>
    );
}