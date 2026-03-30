package com.teachview.teachview_web.dto;

import com.teachview.teachview_web.entity.Video;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class VideoResponseDto {

    private Long id;
    private String title;
    private String filePath;
    private String thumbnailUrl;
    private Long duration;
    private List<String> tags;
    private Long uploadedById;
    private String uploadedBy;
    private String uploaderAvatarUrl;
    private Long viewCount = 0L;

    public static VideoResponseDto from(Video video) {
        VideoResponseDto dto = new VideoResponseDto();
        dto.setId(video.getId());
        dto.setTitle(video.getTitle());
        dto.setFilePath(video.getFilePath().replace("\\", "/"));
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
        return dto;
    }
}