package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.RatingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/videos/{videoId}/rating")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> rate(
        @PathVariable Long videoId,
        @RequestBody Map<String, Integer> body,
        @AuthenticationPrincipal User currentUser
    ) {
        int value = body.getOrDefault("value", 0);
        return ResponseEntity.ok(ratingService.rate(videoId, currentUser, value));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getRating(
        @PathVariable Long videoId,
        @AuthenticationPrincipal User currentUser
    ) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        return ResponseEntity.ok(ratingService.getRatingInfo(videoId, userId));
    }
}
