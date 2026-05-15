import { Link } from "react-router-dom";

import { API_BASE } from '../services/authApi';

function getAuthorAvatarUrl(avatarPath) {
    if (!avatarPath) return null;

    if (avatarPath.startsWith('http')) {
        return avatarPath;
    }

    return `${API_BASE}${avatarPath}`;
}

function getAuthorAverageRating(author) {
    const directRating = Number(
        author.averageRating ??
        author.avgRating ??
        author.ratingAverage
    );

    if (Number.isFinite(directRating) && directRating > 0) {
        return directRating;
    }

    const videos = Array.isArray(author.videos) ? author.videos : [];

    const videoRatings = videos
        .map(video => {
            const averageRating = Number(video.averageRating);
            const ratingCount = Number(video.ratingCount) || 0;

            if (!Number.isFinite(averageRating)) {
                return null;
            }

            if (ratingCount <= 0) {
                return null;
            }

            return averageRating;
        })
        .filter(rating => rating !== null);

    if (videoRatings.length === 0) {
        return null;
    }

    const sum = videoRatings.reduce((acc, rating) => acc + rating, 0);

    return sum / videoRatings.length;
}

export default function AuthorCard({ author }) {
    const avatarUrl = getAuthorAvatarUrl(author.avatarUrl);
    const avatarLetter = author.name?.[0]?.toUpperCase() || '?';
    const averageRating = getAuthorAverageRating(author);

    const cardContent = (
        <>
            <div className="video-card-thumb author-card-thumb">
                <div className="author-card-avatar">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={author.name} />
                    ) : (
                        avatarLetter
                    )}
                </div>
            </div>

            <div className="video-card-info author-card-info">
                <p className="video-card-title author-card-title">
                    {author.name}
                </p>

                <div className="video-card-meta author-card-meta">
                    <span>{author.videoCount ?? 0} видео</span>

                    <span>
                        {Number(author.viewCount ?? 0).toLocaleString('ru-RU')} просмотров
                    </span>

                    <span className="author-card-rating">
                        ★ {averageRating !== null ? `${averageRating.toFixed(1)} / 10` : 'нет оценок'}
                    </span>
                </div>
            </div>
        </>
    );

    if (!author.id) {
        return (
            <div className="video-card author-card">
                {cardContent}
            </div>
        );
    }

    return (
        <Link
            className="video-card author-card"
            to={`/profile/${author.id}`}
        >
            {cardContent}
        </Link>
    );
}