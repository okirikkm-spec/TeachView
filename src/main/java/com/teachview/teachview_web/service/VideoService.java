package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.SubscriptionTier;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.entity.VideoStatus;
import com.teachview.teachview_web.exception.VideoNotFoundException;
import com.teachview.teachview_web.exception.VideoProcessingException;
import com.teachview.teachview_web.repository.CommentLikeRepository;
import com.teachview.teachview_web.repository.CommentRepository;
import com.teachview.teachview_web.repository.FavoriteRepository;
import com.teachview.teachview_web.repository.PlaylistVideoRepository;
import com.teachview.teachview_web.repository.RatingRepository;
import com.teachview.teachview_web.repository.SubscriptionTierRepository;
import com.teachview.teachview_web.repository.VideoRepository;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VideoService {

    private static final String UPLOAD_DIR = "uploads/videos/";

    private final VideoRepository videoRepository;
    private final SubscriptionTierRepository subscriptionTierRepository;
    private final VideoProcessingService videoProcessingService;
    private final MinioService minioService;
    private final PlaylistVideoRepository playlistVideoRepository;
    private final FavoriteRepository favoriteRepository;
    private final RatingRepository ratingRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;

    public VideoService(VideoRepository videoRepository,
            SubscriptionTierRepository subscriptionTierRepository,
            VideoProcessingService videoProcessingService,
            MinioService minioService,
            PlaylistVideoRepository playlistVideoRepository,
            FavoriteRepository favoriteRepository,
            RatingRepository ratingRepository,
            CommentRepository commentRepository,
            CommentLikeRepository commentLikeRepository) {
        this.videoRepository = videoRepository;
        this.subscriptionTierRepository = subscriptionTierRepository;
        this.videoProcessingService = videoProcessingService;
        this.minioService = minioService;
        this.playlistVideoRepository = playlistVideoRepository;
        this.favoriteRepository = favoriteRepository;
        this.ratingRepository = ratingRepository;
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
    }

    public List<VideoResponseDto> getAllVideos() {
        return videoRepository.findByStatus(VideoStatus.READY)
            .stream()
            .map(this::toDtoWithRatingStats)
            .toList();
    }

    public List<VideoResponseDto> getMyVideos(User user){
        return videoRepository.findByUploadedBy(user)
            .stream()
            .map(this::toDtoWithRatingStats)
            .toList();
    }

    public List<VideoResponseDto> getVideosByUserId(Long userId) {
        return videoRepository.findByUploadedById(userId)
            .stream()
            .map(this::toDtoWithRatingStats)
            .toList();
    }

    public VideoResponseDto getVideoById(Long id) {
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        return toDtoWithRatingStats(video);
    }

    public String getVideoStatus(Long id) {
        VideoStatus status = videoRepository.findStatusById(id);
        if (status == null) throw new VideoNotFoundException(id);
        return status.name();
    }


    public VideoResponseDto upload(MultipartFile file, String title,
            String description, MultipartFile thumbnail, User uploader,
            List<String> tags) {

        String videoId = UUID.randomUUID().toString();
        Path workDir = Paths.get(UPLOAD_DIR, videoId);

        try {
            Files.createDirectories(workDir);
        } catch (IOException e) {
            throw new VideoProcessingException("Не удалось создать рабочую директорию", e);
        }

        Path tempFile = workDir.resolve("original_" + file.getOriginalFilename());
        try {
            Files.copy(file.getInputStream(), tempFile);
        } catch (IOException e) {
            throw new VideoProcessingException("Не удалось сохранить файл на диск", e);
        }

        String thumbnailPath = null;
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String ext = getExtension(thumbnail.getOriginalFilename());
            Path thumbDest = workDir.resolve("thumbnail." + ext);
            try {
                Files.copy(thumbnail.getInputStream(), thumbDest);
                thumbnailPath = "uploads/videos/" + videoId + "/thumbnail." + ext;
                minioService.uploadFile(thumbDest, "videos/" + videoId + "/thumbnail." + ext);
            } catch (Exception e) {
                // не критично
            }
        }

        Video video = new Video();
        video.setTitle(title != null && !title.isBlank() ? title : file.getOriginalFilename());
        video.setDescription(description);
        video.setFilePath("uploads/videos/" + videoId + "/master.m3u8");
        video.setThumbnailPath(thumbnailPath);
        video.setStatus(VideoStatus.PROCESSING);
        video.setUploadedBy(uploader);
        video.setTags(tags != null ? tags : new ArrayList<>());
        videoRepository.save(video);

        videoProcessingService.processAsync(video.getId(), tempFile, workDir, videoId, thumbnailPath == null);

        return toDtoWithRatingStats(video);
    }

    @Transactional
    public VideoResponseDto updateVideo(Long id, String title, String description,
            List<String> tags, MultipartFile thumbnail, User currentUser) {
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        if (!video.getUploadedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Нет прав на редактирование этого видео");
        }
        if (title != null && !title.isBlank()) {
            video.setTitle(title);
        }
        if (description != null) {
            video.setDescription(description);
        }
        if (tags != null) {
            video.setTags(tags);
        }
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String videoDir = video.getFilePath().replace("master.m3u8", "");
            String minioPrefix = videoDir.replaceFirst("^uploads/", "");
            String ext = getExtension(thumbnail.getOriginalFilename());
            Path tempThumb = null;
            try {
                tempThumb = Files.createTempFile("thumb_", "." + ext);
                Files.copy(thumbnail.getInputStream(), tempThumb, StandardCopyOption.REPLACE_EXISTING);
                String newMinioKey = minioPrefix + "thumbnail." + ext;
                minioService.uploadFile(tempThumb, newMinioKey);

                String newThumbPath = videoDir + "thumbnail." + ext;
                String oldThumbPath = video.getThumbnailPath();
                if (oldThumbPath != null && !oldThumbPath.equals(newThumbPath)) {
                    try {
                        minioService.deleteFolder(oldThumbPath.replaceFirst("^uploads/", ""));
                    } catch (Exception ignored) {}
                }
                video.setThumbnailPath(newThumbPath);
                video.setUpdatedAt(LocalDateTime.now());
            } catch (Exception e) {
            } finally {
                if (tempThumb != null) {
                    try { Files.deleteIfExists(tempThumb); } catch (IOException ignored) {}
                }
            }
        }
        Video saved = videoRepository.saveAndFlush(video);
        return toDtoWithRatingStats(saved);
    }

    public List<VideoResponseDto> getRelatedVideos(Long videoId, int limit) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));
        List<Video> related = new ArrayList<>();

        if (video.getTags() != null && !video.getTags().isEmpty()) {
            List<Video> byTags = videoRepository.findByTagsInAndIdNot(video.getTags(), videoId);
            related.addAll(byTags);
        }

        if (related.size() < limit) {
            Set<Long> addedIds = related.stream().map(Video::getId).collect(Collectors.toSet());
            videoRepository.findByUploadedByIdAndIdNot(video.getUploadedBy().getId(), videoId)
                .stream()
                .filter(v -> addedIds.add(v.getId()))
                .forEach(related::add);
        }

        return related.stream()
            .limit(limit)
            .map(this::toDtoWithRatingStats)
            .toList();
    }

    @Transactional
    public void incrementViewCount(Long id) {
        if (!videoRepository.existsById(id)) throw new VideoNotFoundException(id);
        videoRepository.incrementViewCount(id);
    }

    public boolean checkAccess(Long videoId, User user, SubscriptionService subscriptionService) {
        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new VideoNotFoundException(videoId));
        return subscriptionService.hasAccessToVideo(video, user);
    }

    @Transactional
    public void setRequiredTier(Long videoId, Long tierId, User currentUser) {
        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new VideoNotFoundException(videoId));
        if (!video.getUploadedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Нет прав на редактирование этого видео");
        }
        if (tierId == null) {
            video.setRequiredTier(null);
        } else {
            SubscriptionTier tier = subscriptionTierRepository.findById(tierId)
                .orElseThrow(() -> new RuntimeException("Уровень подписки не найден"));
            if (!tier.getAuthor().getId().equals(currentUser.getId())) {
                throw new RuntimeException("Этот уровень подписки принадлежит другому автору");
            }
            video.setRequiredTier(tier);
        }
        videoRepository.save(video);
    }

    @Transactional
    public void deleteVideo(Long id, User currentUser) {
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        if (!video.getUploadedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Нет прав на удаление этого видео");
        }

        playlistVideoRepository.deleteByVideoId(id);

        List<Long> commentIds = commentRepository.findIdsByVideoId(id);
        if (!commentIds.isEmpty()) {
            commentLikeRepository.deleteByCommentIdIn(commentIds);
        }
        commentRepository.deleteByVideoId(id);
        favoriteRepository.deleteByVideoId(id);
        ratingRepository.deleteByVideoId(id);

        String filePath = video.getFilePath();
        if (filePath != null) {
            String minioPrefix = filePath.replace("uploads/", "").replace("master.m3u8", "");
            try {
                minioService.deleteFolder(minioPrefix);
            } catch (Exception ignored) {}
        }

        videoRepository.delete(video);
    }

    private VideoResponseDto toDtoWithRatingStats(Video video) {
        VideoResponseDto dto = VideoResponseDto.from(video);

        Double averageRating = ratingRepository.getAverageByVideoId(video.getId());
        Integer ratingCount = ratingRepository.getCountByVideoId(video.getId());

        dto.setAverageRating(
            averageRating != null
                ? Math.round(averageRating * 10.0) / 10.0
                : 0.0
        );

        dto.setRatingCount(
            ratingCount != null
                ? ratingCount.intValue()
                : 0
        );

        return dto;
    }

    private String getExtension(String filename) {
        if (filename == null) return "jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "jpg";
    }
}