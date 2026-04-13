package com.teachview.teachview_web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.teachview.teachview_web.entity.Playlist;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PlaylistDto {
    
    private Long id;
    private String name;
    private String description;
    @JsonProperty("isPublic")
    private boolean publicVisible;
    private Long ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private int videoCount;
    private List<VideoResponseDto> videos;

    public static PlaylistDto from(Playlist playlist){
        PlaylistDto dto = new PlaylistDto();
        dto.setId(playlist.getId());
        dto.setName(playlist.getName());
        dto.setDescription(playlist.getDescription());
        dto.setPublicVisible(playlist.isPublicVisible());
        dto.setOwnerId(playlist.getOwner().getId());
        dto.setOwnerName(playlist.getOwner().getUsername());
        dto.setCreatedAt(playlist.getCreatedAt());
        dto.setVideoCount(playlist.getPlaylistVideos().size());
        dto.setVideos(playlist.getPlaylistVideos().stream()
            .map(pv -> VideoResponseDto.from(pv.getVideo()))
            .toList());
        return dto;
    }
}
