package com.teachview.teachview_web.dto;

import com.teachview.teachview_web.entity.Video;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class VideoResponseDto {

    private Long id;
    private String title;
    private String filePath;
    private String thumbnailUrl;
    private String description;
    private Long duration;
    private List<String> tags;
    private Double averageRating;
    private Integer ratingCount;
    private Integer myRating;
    private Long uploadedById;
    private String uploadedBy;
    private String uploaderAvatarUrl;
    private Long viewCount = 0L;
    private boolean favorite;
    private Long requiredTierId;
    private String requiredTierName;
    private Integer requiredTierPrice;
    private boolean hasAccess = true;
    private String status;
    private LocalDateTime updatedAt;

    public static VideoResponseDto from(Video video) {
        VideoResponseDto dto = new VideoResponseDto();
        dto.setId(video.getId());
        dto.setTitle(video.getTitle());
        dto.setFilePath(video.getFilePath().replace("\\", "/"));
        dto.setDescription(video.getDescription());
        if (video.getThumbnailPath() != null) {
            dto.setThumbnailUrl(video.getThumbnailPath().replace("\\", "/"));
        }
        dto.setDuration(video.getDuration());
        dto.setTags(video.getTags() != null ? video.getTags() : new ArrayList<>());
        if (video.getUploadedBy() != null) {
            dto.setUploadedById(video.getUploadedBy().getId());
            dto.setUploadedBy(video.getUploadedBy().getUsername());
            String avatarPath = video.getUploadedBy().getAvatarPath();
            dto.setUploaderAvatarUrl(avatarPath != null ? "/" + avatarPath : null);
        }
        dto.setViewCount(video.getViewCount() != null ? video.getViewCount() : 0L);
        if (video.getRequiredTier() != null) {
            dto.setRequiredTierId(video.getRequiredTier().getId());
            dto.setRequiredTierName(video.getRequiredTier().getName());
            dto.setRequiredTierPrice(video.getRequiredTier().getPrice());
        }
        dto.setStatus(video.getStatus().name());
        dto.setUpdatedAt(video.getUpdatedAt());
        return dto;
    }
}