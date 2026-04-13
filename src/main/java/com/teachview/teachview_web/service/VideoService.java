package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.SubscriptionTier;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.entity.VideoStatus;
import com.teachview.teachview_web.exception.VideoNotFoundException;
import com.teachview.teachview_web.exception.VideoProcessingException;
import com.teachview.teachview_web.repository.SubscriptionTierRepository;
import com.teachview.teachview_web.repository.VideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VideoService {

    private static final String UPLOAD_DIR = "uploads/videos/";

    private final VideoRepository videoRepository;
    private final SubscriptionTierRepository subscriptionTierRepository;
    private final VideoProcessingService videoProcessingService;

    public VideoService(VideoRepository videoRepository,
                        SubscriptionTierRepository subscriptionTierRepository,
                        VideoProcessingService videoProcessingService) {
        this.videoRepository = videoRepository;
        this.subscriptionTierRepository = subscriptionTierRepository;
        this.videoProcessingService = videoProcessingService;
    }

    public List<VideoResponseDto> getAllVideos() {
        return videoRepository.findByStatus(VideoStatus.READY)
                .stream()
                .map(VideoResponseDto::from)
                .toList();
    }

    public List<VideoResponseDto> getMyVideos(User user){
        return videoRepository.findByUploadedBy(user)
            .stream()
            .map(VideoResponseDto::from)
            .toList();
    }

    public List<VideoResponseDto> getVideosByUserId(Long userId) {
        return videoRepository.findByUploadedById(userId)
                .stream()
                .map(VideoResponseDto::from)
                .toList();
    }

    public VideoResponseDto getVideoById(Long id) {
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new VideoNotFoundException(id));
        return VideoResponseDto.from(video);
    }

    /**
     * Быстрая загрузка — сохраняет файл на диск и запись в БД,
     * сразу возвращает ответ клиенту. FFmpeg запускается в фоне.
     */
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

        // Сохраняем превью сразу (пока MultipartFile ещё доступен)
        String thumbnailPath = null;
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String ext = getExtension(thumbnail.getOriginalFilename());
            Path thumbDest = workDir.resolve("thumbnail." + ext);
            try {
                Files.copy(thumbnail.getInputStream(), thumbDest);
                thumbnailPath = "uploads/videos/" + videoId + "/thumbnail." + ext;
            } catch (IOException e) {
                // не критично
            }
        }

        // Создаём запись в БД со статусом PROCESSING
        Video video = new Video();
        video.setTitle(title != null && !title.isBlank() ? title : file.getOriginalFilename());
        video.setDescription(description);
        video.setFilePath("uploads/videos/" + videoId + "/master.m3u8");
        video.setThumbnailPath(thumbnailPath);
        video.setStatus(VideoStatus.PROCESSING);
        video.setUploadedBy(uploader);
        video.setTags(tags != null ? tags : new ArrayList<>());
        videoRepository.save(video);

        // Запускаем FFmpeg обработку в фоне (отдельный бин — @Async работает через прокси)
        videoProcessingService.processAsync(video.getId(), tempFile, workDir, videoId, thumbnailPath == null);

        return VideoResponseDto.from(video);
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
            String ext = getExtension(thumbnail.getOriginalFilename());
            Path thumbDest = Paths.get(videoDir, "thumbnail." + ext);
            try {
                Files.deleteIfExists(thumbDest);
                Files.copy(thumbnail.getInputStream(), thumbDest);
                video.setThumbnailPath(videoDir + "thumbnail." + ext);
            } catch (IOException e) {
            }
        }
        videoRepository.save(video);
        return VideoResponseDto.from(video);
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
                .map(VideoResponseDto::from)
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

        String filePath = video.getFilePath();
        if (filePath != null) {
            Path videoDir = Paths.get(filePath).getParent();
            if (videoDir != null && Files.exists(videoDir)) {
                try {
                    Files.walk(videoDir)
                         .sorted(Comparator.reverseOrder())
                         .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
                } catch (IOException ignored) {}
            }
        }

        videoRepository.delete(video);
    }

    private String getExtension(String filename) {
        if (filename == null) return "jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "jpg";
    }
}