import { useState, useEffect } from 'react';
import { getRating, rateVideo } from '../services/videoApi';

export default function StarRating({ videoId }) {
  const [rating, setRating] = useState({ average: 0, count: 0, myRating: 0 });
  const [hovered, setHovered] = useState(0);

  useEffect(() => {
    getRating(videoId).then(setRating);
  }, [videoId]);

  const handleRate = async (value) => {
    try {
      const updated = await rateVideo(videoId, value);
      setRating(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const displayValue = hovered || rating.myRating || 0;

  return (
    <div className="star-rating">
      <div className="star-rating-stars">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <button
            key={i}
            className={`star-rating-star ${i <= displayValue ? 'star-rating-star--filled' : ''} ${i <= rating.myRating && !hovered ? 'star-rating-star--my' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(i)}
            title={`${i} / 10`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={i <= displayValue ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      <div className="star-rating-info">
        <span className="star-rating-value">{rating.average > 0 ? rating.average.toFixed(1) : '—'}</span>
        <span className="star-rating-count">{rating.count} {ratingWord(rating.count)}</span>
      </div>
    </div>
  );
}

function ratingWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'оценка';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'оценки';
  return 'оценок';
}
