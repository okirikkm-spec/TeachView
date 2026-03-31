package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.Favorite;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.exception.VideoNotFoundException;
import com.teachview.teachview_web.repository.FavoriteRepository;
import com.teachview.teachview_web.repository.VideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final VideoRepository videoRepository;

    public FavoriteService(FavoriteRepository favoriteRepository, VideoRepository videoRepository) {
        this.favoriteRepository = favoriteRepository;
        this.videoRepository = videoRepository;
    }

    @Transactional
    public Map<String, Object> toggle(Long videoId, User user) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));

        Optional<Favorite> existing = favoriteRepository.findByVideoIdAndUserId(videoId, user.getId());
        boolean isFavorite;
        if (existing.isPresent()) {
            favoriteRepository.delete(existing.get());
            isFavorite = false;
        } else {
            Favorite favorite = new Favorite();
            favorite.setVideo(video);
            favorite.setUser(user);
            favoriteRepository.save(favorite);
            isFavorite = true;
        }
        return Map.of("isFavorite", isFavorite);
    }

    public boolean isFavorite(Long videoId, Long userId) {
        if (userId == null) return false;
        return favoriteRepository.existsByVideoIdAndUserId(videoId, userId);
    }

    public List<VideoResponseDto> getFavorites(User user) {
        return favoriteRepository.findByUserIdWithVideo(user.getId()).stream()
                .map(f -> {
                    VideoResponseDto dto = VideoResponseDto.from(f.getVideo());
                    dto.setFavorite(true);
                    return dto;
                })
                .toList();
    }
}
