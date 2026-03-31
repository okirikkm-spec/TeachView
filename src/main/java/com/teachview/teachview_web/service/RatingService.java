package com.teachview.teachview_web.service;

import com.teachview.teachview_web.entity.Rating;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.exception.VideoNotFoundException;
import com.teachview.teachview_web.repository.RatingRepository;
import com.teachview.teachview_web.repository.VideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class RatingService {

    private final RatingRepository ratingRepository;
    private final VideoRepository videoRepository;

    public RatingService(RatingRepository ratingRepository, VideoRepository videoRepository) {
        this.ratingRepository = ratingRepository;
        this.videoRepository = videoRepository;
    }

    @Transactional
    public Map<String, Object> rate(Long videoId, User user, int value) {
        if (value < 1 || value > 10) {
            throw new IllegalArgumentException("Оценка должна быть от 1 до 10");
        }
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));

        Rating rating = ratingRepository.findByVideoIdAndUserId(videoId, user.getId())
                .orElse(new Rating());
        rating.setVideo(video);
        rating.setUser(user);
        rating.setValue(value);
        ratingRepository.save(rating);

        return getRatingInfo(videoId, user.getId());
    }

    public Map<String, Object> getRatingInfo(Long videoId, Long userId) {
        Double avg = ratingRepository.getAverageByVideoId(videoId);
        Integer count = ratingRepository.getCountByVideoId(videoId);
        Integer myRating = null;
        if (userId != null) {
            myRating = ratingRepository.findByVideoIdAndUserId(videoId, userId)
                    .map(Rating::getValue)
                    .orElse(null);
        }
        return Map.of(
            "average", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
            "count", count != null ? count : 0,
            "myRating", myRating != null ? myRating : 0
        );
    }
}
