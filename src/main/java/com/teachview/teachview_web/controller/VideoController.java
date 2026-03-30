package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.VideoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoService videoService;
    

    public VideoController(VideoService videoService) {
        this.videoService = videoService;
    }

    @GetMapping("/all")
    public List<VideoResponseDto> getAllVideos() {
        return videoService.getAllVideos();
    }

    @GetMapping("/my")
    public List<VideoResponseDto> getMyVideo(@AuthenticationPrincipal User currentUser) {
        return videoService.getMyVideos(currentUser);
    }

    @GetMapping("/user/{userId}")
    public List<VideoResponseDto> getVideosByUser(@PathVariable Long userId) {
        return videoService.getVideosByUserId(userId);
    }

    @GetMapping("/{id}")
    public VideoResponseDto getVideoById(@PathVariable Long id) {
        return videoService.getVideoById(id);
    }

    @PostMapping("/upload")
    public ResponseEntity<VideoResponseDto> uploadVideo(
        @RequestParam("file")                                    MultipartFile file,
        @RequestParam(value = "title",     required = false)     String title,
        @RequestParam(value = "thumbnail", required = false)     MultipartFile thumbnail,
        @RequestParam(value = "tags",      required = false)     List<String> tags,
        @AuthenticationPrincipal User currentUser
    ) {
        VideoResponseDto result = videoService.uploadAndProcess(file, title, thumbnail, currentUser, tags);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Void> recordView(@PathVariable Long id){
        videoService.incrementViewCount(id);
        return ResponseEntity.ok().build();
    }
}