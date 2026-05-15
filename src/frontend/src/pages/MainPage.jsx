import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAllVideos, fetchUserVideos } from '../services/videoApi';
import Navbar from '../components/Navbar';
import CategoryBlock from '../components/CategoryBlock';
import AuthorCard from '../components/AuthorCard';
import { fetchSubscriberCount } from '../services/subscriptionApi';

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

function getPopularityScore(video) {
    const viewCount = Number(video.viewCount) || 0;
    const averageRating = Number(video.averageRating) || 0;
    const ratingCount = Number(video.ratingCount) || 0;

    return viewCount + averageRating * ratingCount;
}

function sortByPopularity(videos) {
    return [...videos].sort((a, b) => {
        const scoreDiff = getPopularityScore(b) - getPopularityScore(a);

        if (scoreDiff !== 0) return scoreDiff;

        const ratingDiff = (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0);
        if (ratingDiff !== 0) return ratingDiff;

        const ratingCountDiff = (Number(b.ratingCount) || 0) - (Number(a.ratingCount) || 0);
        if (ratingCountDiff !== 0) return ratingCountDiff;

        return (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0);
    });
}

function getPopularAuthors(videos, authorStats = {}) {
    const uniqueVideos = Array.from(
        new Map(
            videos
                .filter(video => video?.id)
                .map(video => [video.id, video])
        ).values()
    );

    return Object.entries(groupByAuthor(uniqueVideos))
        .map(([authorName, authorVideosFromMain]) => {
            const firstVideo = authorVideosFromMain.find(v => v.uploadedById || v.uploaderAvatarUrl) || authorVideosFromMain[0];

            const stats = firstVideo?.uploadedById
                ? authorStats[firstVideo.uploadedById]
                : null;

            const authorVideos = stats?.videos?.length
                ? stats.videos
                : authorVideosFromMain;

            const videoCount = stats?.videoCount || authorVideos.length;
            
            const subscriberCount = stats?.subscriberCount ?? 0;

            const viewCount = authorVideos.reduce(
                (sum, video) => sum + (Number(video.viewCount) || 0),
                0
            );

            const ratingCount = authorVideos.reduce(
                (sum, video) => sum + (Number(video.ratingCount) || 0),
                0
            );

            const ratingSum = authorVideos.reduce(
                (sum, video) => {
                    const averageRating = Number(video.averageRating) || 0;
                    const videoRatingCount = Number(video.ratingCount) || 0;

                    return sum + averageRating * videoRatingCount;
                },
                0
            );

            const averageRating = ratingCount > 0
                ? Math.round((ratingSum / ratingCount) * 10) / 10
                : 0;

            return {
                id: firstVideo?.uploadedById,
                name: authorName,
                avatarUrl: firstVideo?.uploaderAvatarUrl || null,
                videoCount,
                subscriberCount,
                viewCount,
                averageRating,
                ratingCount,
                score: viewCount + averageRating * ratingCount + subscriberCount * 5,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
        
}

export default function MainPage() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupMode, setGroupMode] = useState('tag');
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [authorStats, setAuthorStats] = useState({});

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

    useEffect(() => {
        const authorIds = Array.from(
            new Set(
                videos
                    .map(video => video.uploadedById)
                    .filter(Boolean)
            )
        );

        if (authorIds.length === 0) {
            setAuthorStats({});
            return;
        }

        let cancelled = false;

        Promise.all(
            authorIds.map(async authorId => {
                try {
                    const [authorVideos, subscriberCount] = await Promise.all([
                        fetchUserVideos(authorId),
                        fetchSubscriberCount(authorId),
                    ]);

                    return [
                        authorId,
                        {
                            videos: authorVideos,
                            videoCount: authorVideos.length,
                            subscriberCount,
                        },
                    ];
                } catch {
                    return [
                        authorId,
                        {
                            subscriberCount: 0,
                        },
                    ];
                }
            })
        ).then(entries => {
            if (!cancelled) {
                setAuthorStats(Object.fromEntries(entries));
            }
        });

        return () => {
            cancelled = true;
        };
    }, [videos]);

    const filteredVideos = searchQuery
        ? videos.filter(v => {
            const q = searchQuery.toLowerCase();
            return (v.title || v.filename || '').toLowerCase().includes(q)
            || (v.uploadedBy || '').toLowerCase().includes(q)
            || (v.tags || []).some(t => t.toLowerCase().includes(q));
        })
        : videos;

    const allGroups = groupMode === 'tag'
        ? groupByTag(filteredVideos)
        : groupByAuthor(filteredVideos);

    const groups = activeTag && groupMode !== 'popular'
        ? Object.fromEntries(Object.entries(allGroups).filter(([k]) => k === activeTag))
        : allGroups;

    const popularVideos = sortByPopularity(filteredVideos).slice(0, 12);

    const popularAuthors = getPopularAuthors(filteredVideos, authorStats);

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
                    <button
                        className={`btn btn-sm ${groupMode === 'popular' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => {
                            setGroupMode('popular');
                            setSearchParams({});
                        }}>
                        Популярное
                    </button>
                    {activeTag && groupMode !== 'popular' && (
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

                {!loading && !error && groupMode === 'popular' && (
                    <>
                        <section className="popular-authors-section">
                            <h2>Популярные авторы</h2>

                            <div className="popular-authors-grid">
                                {popularAuthors.map(author => (
                                    <AuthorCard
                                        key={author.id || author.name}
                                        author={author}
                                    />
                                ))}
                            </div>
                        </section>
                        <CategoryBlock
                            title="Популярные видео"
                            videos={popularVideos}
                        />
                    </>
                )}

                {!loading && !error && groupMode !== 'popular' && Object.entries(groups).map(([groupTitle, groupVideos]) => (
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