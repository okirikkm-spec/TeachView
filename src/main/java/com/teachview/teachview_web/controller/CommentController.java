package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.CommentResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.CommentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos/{videoId}/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public List<CommentResponseDto> getComments(
        @PathVariable Long videoId,
        @AuthenticationPrincipal User currentUser
    ) {
        return commentService.getComments(videoId, currentUser);
    }

    @PostMapping
    public ResponseEntity<CommentResponseDto> addComment(
        @PathVariable Long videoId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User currentUser
    ) {
        String text = (String) body.get("text");
        boolean hidden = Boolean.TRUE.equals(body.get("hidden"));
        return ResponseEntity.ok(commentService.addComment(videoId, currentUser, text, hidden));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<CommentResponseDto> editComment(
        @PathVariable Long videoId,
        @PathVariable Long commentId,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(commentService.editComment(commentId, currentUser, body.get("text")));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
        @PathVariable Long videoId,
        @PathVariable Long commentId,
        @AuthenticationPrincipal User currentUser
    ) {
        commentService.deleteComment(commentId, currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{commentId}/like")
    public ResponseEntity<CommentResponseDto> likeComment(
        @PathVariable Long videoId,
        @PathVariable Long commentId,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(commentService.toggleLike(commentId, currentUser, true));
    }

    @PostMapping("/{commentId}/dislike")
    public ResponseEntity<CommentResponseDto> dislikeComment(
        @PathVariable Long videoId,
        @PathVariable Long commentId,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(commentService.toggleLike(commentId, currentUser, false));
    }

    @PostMapping("/{commentId}/author-like")
    public ResponseEntity<CommentResponseDto> authorLike(
        @PathVariable Long videoId,
        @PathVariable Long commentId,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(commentService.toggleAuthorLike(commentId, currentUser));
    }
}
