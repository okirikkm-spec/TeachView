package com.teachview.teachview_web.dto;

import com.teachview.teachview_web.entity.Comment;
import lombok.Data;

@Data
public class CommentResponseDto {

    private Long id;
    private String text;
    private Boolean hidden;
    private Boolean edited;
    private Long userId;
    private String username;
    private String userAvatarUrl;
    private Long videoAuthorId;
    private Boolean authorLiked;
    private Long likes;
    private Long dislikes;
    private String myReaction;
    private String createdAt;

    public static CommentResponseDto from(Comment comment, Long likes, Long dislikes,
            String myReaction, Long videoAuthorId) {
        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setText(comment.getText());
        dto.setHidden(comment.getHidden());
        dto.setEdited(comment.getEdited());
        dto.setAuthorLiked(comment.getAuthorLiked());
        dto.setUserId(comment.getUser().getId());
        dto.setUsername(comment.getUser().getUsername());
        String avatarPath = comment.getUser().getAvatarPath();
        dto.setUserAvatarUrl(avatarPath != null ? "/" + avatarPath : null);
        dto.setVideoAuthorId(videoAuthorId);
        dto.setLikes(likes);
        dto.setDislikes(dislikes);
        dto.setMyReaction(myReaction);
        dto.setCreatedAt(comment.getCreatedAt().toString());
        return dto;
    }
}
