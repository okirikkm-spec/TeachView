package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.FavoriteService;
import com.teachview.teachview_web.service.RatingService;
import com.teachview.teachview_web.service.SubscriptionService;
import com.teachview.teachview_web.service.VideoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoService videoService;
    private final FavoriteService favoriteService;
    private final RatingService ratingService;
    private final SubscriptionService subscriptionService;

    public VideoController(VideoService videoService, FavoriteService favoriteService,
            RatingService ratingService, SubscriptionService subscriptionService) {
        this.videoService = videoService;
        this.favoriteService = favoriteService;
        this.ratingService = ratingService;
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/all")
    public List<VideoResponseDto> getAllVideos() {
        return videoService.getAllVideos();
    }

    @GetMapping("/my")
    public List<VideoResponseDto> getMyVideo(@AuthenticationPrincipal User currentUser) {
        return videoService.getMyVideos(currentUser);
    }

    @GetMapping("/user/{userId}")
    public List<VideoResponseDto> getVideosByUser(@PathVariable Long userId) {
        return videoService.getVideosByUserId(userId);
    }

    @GetMapping("/{id}")
    public VideoResponseDto getVideoById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        VideoResponseDto dto = videoService.getVideoById(id);

        if (currentUser != null) {
            dto.setFavorite(favoriteService.isFavorite(id, currentUser.getId()));
        }

        boolean hasAccess = videoService.checkAccess(id, currentUser, subscriptionService);
        dto.setHasAccess(hasAccess);
        
        return dto;
    }

    @PostMapping("/upload")
    public ResponseEntity<VideoResponseDto> uploadVideo(
            @RequestParam("file")                                    MultipartFile file,
            @RequestParam(value = "description", required = false)   String description,
            @RequestParam(value = "thumbnail",   required = false)   MultipartFile thumbnail,
            @RequestParam(value = "tags",        required = false)   List<String> tags,
            @RequestParam(value = "requiredTierId", required = false) Long requiredTierId,
            @RequestParam(value = "title",       required = false)   String title,
            @AuthenticationPrincipal User currentUser) {

        VideoResponseDto result = videoService.upload(file, title, description, thumbnail, currentUser, tags);

        if (requiredTierId != null) {
            videoService.setRequiredTier(result.getId(), requiredTierId, currentUser);
            result = videoService.getVideoById(result.getId());
        }

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VideoResponseDto> updateVideo(
            @PathVariable Long id,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "tags", required = false) List<String> tags,
            @RequestParam(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "requiredTierId", required = false) String requiredTierId,
            @AuthenticationPrincipal User currentUser) {

        VideoResponseDto result = videoService.updateVideo(id, title, description, tags, thumbnail, currentUser);

        if (requiredTierId != null) {
            Long tierId = requiredTierId.isEmpty() || "null".equals(requiredTierId) ? null : Long.parseLong(requiredTierId);
            videoService.setRequiredTier(id, tierId, currentUser);
            result = videoService.getVideoById(id);
        }

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVideo(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        videoService.deleteVideo(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related")
    public List<VideoResponseDto> getRelatedVideos(
            @PathVariable Long id,
            @RequestParam(value = "limit", defaultValue = "8") int limit) {

        List<VideoResponseDto> related = videoService.getRelatedVideos(id, limit);

        related.forEach(dto -> {
            Map<String, Object> ratingInfo = ratingService.getRatingInfo(dto.getId(), null);
            dto.setAverageRating((Double) ratingInfo.get("average"));
            dto.setRatingCount((Integer) ratingInfo.get("count"));
        });

        return related;
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getVideoStatus(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("status", videoService.getVideoStatus(id)));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Void> recordView(@PathVariable Long id){
        videoService.incrementViewCount(id);
        return ResponseEntity.ok().build();
    }
}