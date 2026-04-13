package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.PlaylistDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.PlaylistService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {
    
    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping("/my")
    public List<PlaylistDto> getMyPlaylists(@AuthenticationPrincipal User user) {
        return playlistService.getMyPlaylists(user);
    }

    @GetMapping("/author/{authorId}")
    public List<PlaylistDto> getAuthorPlaylists(@PathVariable Long authorId) {
        return playlistService.getPublicPlaylistsByAuthor(authorId);
    }

    @GetMapping("/{id}")
    public PlaylistDto getPlaylist(@PathVariable Long id,
            @AuthenticationPrincipal User user) {

        return playlistService.getPlaylist(id, user);
    }

    @PostMapping
    public PlaylistDto createPlaylist(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.getOrDefault("description", "");
        Object pub = body.get("isPublic");
        if (pub == null) pub = body.get("publicVisible");
        boolean isPublic = pub != null ? (Boolean) pub : true;
        return playlistService.createPlaylist(user, name, description, isPublic);
    }

    @PutMapping("/{id}")
    public PlaylistDto updatePlaylist(@PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        Object pub = body.get("isPublic");
        if (pub == null) pub = body.get("publicVisible");
        Boolean isPublic = pub != null ? (Boolean) pub : null;
        return playlistService.updatePlaylist(id, user, name, description, isPublic);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlaylist(@PathVariable Long id,
            @AuthenticationPrincipal User user) {
        playlistService.deletePlaylist(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/videos/{videoId}")
    public PlaylistDto addVideo(@PathVariable Long id,
            @PathVariable Long videoId,
            @AuthenticationPrincipal User user) {
        return playlistService.addVideo(id, videoId, user);
    }

    @DeleteMapping("/{id}/videos/{videoId}")
    public PlaylistDto removeVideo(@PathVariable Long id,
            @PathVariable Long videoId,
            @AuthenticationPrincipal User user) {
        return playlistService.removeVideo(id, videoId, user);
    }

    // PUT /api/playlists/1/reorder
    // Body: [10, 5, 3] — список videoId в нужном порядке
    @PutMapping("/{id}/reorder")
    public PlaylistDto reorderVideos(@PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody List<Long> videoIds) {
        return playlistService.reorderVideos(id, videoIds, user);
    }
}
