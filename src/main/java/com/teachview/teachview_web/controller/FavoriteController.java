package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.FavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @PostMapping("/{videoId}")
    public ResponseEntity<Map<String, Object>> toggle(
        @PathVariable Long videoId,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(favoriteService.toggle(videoId, currentUser));
    }

    @GetMapping
    public ResponseEntity<List<VideoResponseDto>> getFavorites(
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(favoriteService.getFavorites(currentUser));
    }
}
