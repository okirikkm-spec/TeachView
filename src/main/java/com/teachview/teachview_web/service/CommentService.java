package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.CommentResponseDto;
import com.teachview.teachview_web.entity.Comment;
import com.teachview.teachview_web.entity.CommentLike;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.exception.VideoNotFoundException;
import com.teachview.teachview_web.repository.CommentLikeRepository;
import com.teachview.teachview_web.repository.CommentRepository;
import com.teachview.teachview_web.repository.VideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final VideoRepository videoRepository;

    public CommentService(CommentRepository commentRepository,
                          CommentLikeRepository commentLikeRepository,
                          VideoRepository videoRepository) {
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.videoRepository = videoRepository;
    }

    @Transactional(readOnly = true)
    public List<CommentResponseDto> getComments(Long videoId, User currentUser) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));
        Long videoAuthorId = video.getUploadedBy().getId();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        return commentRepository.findByVideoIdOrderByCreatedAtDesc(videoId)
                .stream()
                .filter(c -> {
                    if (!c.getHidden()) return true;
                    return currentUserId != null &&
                            (currentUserId.equals(videoAuthorId) || currentUserId.equals(c.getUser().getId()));
                })
                .map(c -> toDto(c, currentUserId, videoAuthorId))
                .toList();
    }

    @Transactional
    public CommentResponseDto addComment(Long videoId, User user, String text, boolean hidden) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));
        Comment comment = new Comment();
        comment.setVideo(video);
        comment.setUser(user);
        comment.setText(text);
        comment.setHidden(hidden);
        commentRepository.save(comment);

        Long videoAuthorId = video.getUploadedBy().getId();
        return toDto(comment, user.getId(), videoAuthorId);
    }

    @Transactional
    public CommentResponseDto editComment(Long commentId, User user, String text) {
        Comment comment = commentRepository.findByIdWithRelations(commentId)
                .orElseThrow(() -> new RuntimeException("Комментарий не найден"));
        if (!comment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Нет прав на редактирование");
        }
        comment.setText(text);
        comment.setEdited(true);
        commentRepository.save(comment);

        Long videoAuthorId = comment.getVideo().getUploadedBy().getId();
        return toDto(comment, user.getId(), videoAuthorId);
    }

    @Transactional
    public void deleteComment(Long commentId, User user) {
        Comment comment = commentRepository.findByIdWithRelations(commentId)
                .orElseThrow(() -> new RuntimeException("Комментарий не найден"));
        Long videoAuthorId = comment.getVideo().getUploadedBy().getId();
        if (!comment.getUser().getId().equals(user.getId()) && !videoAuthorId.equals(user.getId())) {
            throw new RuntimeException("Нет прав на удаление");
        }
        commentRepository.delete(comment);
    }

    @Transactional
    public CommentResponseDto toggleLike(Long commentId, User user, boolean isLike) {
        Comment comment = commentRepository.findByIdWithRelations(commentId)
                .orElseThrow(() -> new RuntimeException("Комментарий не найден"));

        var existing = commentLikeRepository.findByCommentIdAndUserId(commentId, user.getId());
        if (existing.isPresent()) {
            CommentLike like = existing.get();
            if (like.getLiked().equals(isLike)) {
                commentLikeRepository.delete(like);
            } else {
                like.setLiked(isLike);
                commentLikeRepository.save(like);
            }
        } else {
            CommentLike like = new CommentLike();
            like.setComment(comment);
            like.setUser(user);
            like.setLiked(isLike);
            commentLikeRepository.save(like);
        }

        Long videoAuthorId = comment.getVideo().getUploadedBy().getId();
        return toDto(comment, user.getId(), videoAuthorId);
    }

    @Transactional
    public CommentResponseDto toggleAuthorLike(Long commentId, User user) {
        Comment comment = commentRepository.findByIdWithRelations(commentId)
                .orElseThrow(() -> new RuntimeException("Комментарий не найден"));
        Long videoAuthorId = comment.getVideo().getUploadedBy().getId();
        if (!videoAuthorId.equals(user.getId())) {
            throw new RuntimeException("Только автор видео может ставить авторский лайк");
        }
        comment.setAuthorLiked(!comment.getAuthorLiked());
        commentRepository.save(comment);

        return toDto(comment, user.getId(), videoAuthorId);
    }

    private CommentResponseDto toDto(Comment comment, Long currentUserId, Long videoAuthorId) {
        long likes = commentLikeRepository.countByCommentIdAndLiked(comment.getId(), true);
        long dislikes = commentLikeRepository.countByCommentIdAndLiked(comment.getId(), false);
        String myReaction = null;
        if (currentUserId != null) {
            myReaction = commentLikeRepository.findByCommentIdAndUserId(comment.getId(), currentUserId)
                    .map(cl -> cl.getLiked() ? "like" : "dislike")
                    .orElse(null);
        }
        return CommentResponseDto.from(comment, likes, dislikes, myReaction, videoAuthorId);
    }
}
