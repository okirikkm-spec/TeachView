package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.service.MinioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;

@RestController
public class StreamingController {

    private final MinioService minioService;

    public StreamingController(MinioService minioService) {
        this.minioService = minioService;
    }

    /**
     * Перехватывает запросы к /uploads/** и отдаёт файлы из MinIO.
     *
     * URL:       /uploads/videos/{videoId}/master.m3u8  → MinIO key: videos/{videoId}/master.m3u8
     * URL:       /uploads/avatars/{userId}.jpg          → MinIO key: avatars/{userId}.jpg
     */
    @GetMapping("/uploads/**")
    public ResponseEntity<StreamingResponseBody> streamVideo(HttpServletRequest request) {
        // Вырезаем "/uploads/" → получаем ключ в MinIO: "videos/{videoId}/filename"
        String minioKey = request.getRequestURI().substring("/uploads/".length());

        try {
            InputStream stream = minioService.getObject(minioKey);
            String contentType = resolveContentType(minioKey);

            StreamingResponseBody body = outputStream -> {
                try {
                    stream.transferTo(outputStream);
                } finally {
                    stream.close();
                }
            };

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(body);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String resolveContentType(String filename) {
        if (filename.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
        if (filename.endsWith(".ts"))   return "video/mp2t";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        if (filename.endsWith(".png"))  return "image/png";
        return "application/octet-stream";
    }
}
