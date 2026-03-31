package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.VideoResponseDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.exception.VideoNotFoundException;
import com.teachview.teachview_web.exception.VideoProcessingException;
import com.teachview.teachview_web.repository.VideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;


import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class VideoService {

    private static final String UPLOAD_DIR = "uploads/videos/";

    private final VideoRepository videoRepository;

    public VideoService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    public List<VideoResponseDto> getAllVideos() {
        return videoRepository.findAll()
                .stream()
                .map(VideoResponseDto::from)
                .toList();
    }

    public List<VideoResponseDto> getMyVideos(User user){
        return videoRepository.findByUploadedBy(user)
            .stream()
            .map(VideoResponseDto::from)
            .toList();
    }

    public List<VideoResponseDto> getVideosByUserId(Long userId) {
        return videoRepository.findByUploadedById(userId)
                .stream()
                .map(VideoResponseDto::from)
                .toList();
    }

    public VideoResponseDto getVideoById(Long id) {
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new VideoNotFoundException(id));
        return VideoResponseDto.from(video);
    }

    public VideoResponseDto uploadAndProcess(MultipartFile file, String title,
            String description, MultipartFile thumbnail, User uploader,
            List<String> tags) {
            
        String videoId = UUID.randomUUID().toString();
        Path workDir = Paths.get(UPLOAD_DIR, videoId);

        try {
            Files.createDirectories(workDir);
        } catch (IOException e) {
            throw new VideoProcessingException("Не удалось создать рабочую директорию", e);
        }

        Path tempFile = workDir.resolve("temp_" + file.getOriginalFilename());

        try {
            Files.copy(file.getInputStream(), tempFile);
        } catch (IOException e) {
            throw new VideoProcessingException("Не удалось сохранить файл на диск", e);
        }

        try {
            int height    = getVideoHeight(tempFile.toString());
            boolean hasAudio = hasAudioStream(tempFile.toString());
            long duration = getVideoDuration(tempFile.toString());

            List<String> command = buildFfmpegCommand(tempFile, workDir, height, hasAudio);
            int exitCode = runProcess(command);

            if (exitCode != 0) {
                throw new VideoProcessingException("FFmpeg завершился с кодом: " + exitCode);
            }
            String thumbnailPath = null;

            if (thumbnail != null && !thumbnail.isEmpty()) {
                // Пользователь загрузил своё превью
                String ext = getExtension(thumbnail.getOriginalFilename());
                Path thumbDest = workDir.resolve("thumbnail." + ext);
                try {
                    Files.copy(thumbnail.getInputStream(), thumbDest);
                    thumbnailPath = "uploads/videos/" + videoId + "/thumbnail." + ext;
                } catch (IOException e) {
                    // не критично
                }
            } else {
                // Превью не загрузили — берём первый кадр через ffmpeg
                Path thumbDest = workDir.resolve("thumbnail.jpg");
                try {
                    int exitCodeThumb = runProcess(List.of(
                        "ffmpeg",
                        "-i", tempFile.toString(),
                        "-ss", "00:00:01",   // 1 секунда от начала
                        "-frames:v", "1",    // только 1 кадр
                        "-q:v", "2",         // высокое качество JPEG
                        thumbDest.toString()
                    ));
                    if (exitCodeThumb == 0) {
                        thumbnailPath = "uploads/videos/" + videoId + "/thumbnail.jpg";
                    }
                } catch (Exception e) {
                    // не критично
                }
            }

            Video video = new Video();
            video.setTitle(title != null && !title.isBlank()
                ? title
                : file.getOriginalFilename());
            video.setDescription(description);
            video.setFilePath("uploads/videos/" + videoId + "/master.m3u8");
            video.setThumbnailPath(thumbnailPath);
            video.setDuration(duration);
            video.setUploadedBy(uploader);
            video.setTags(tags != null ? tags : new ArrayList<>());

            videoRepository.save(video);

            return VideoResponseDto.from(video);

        } catch (VideoProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new VideoProcessingException("Ошибка при обработке видео: " + e.getMessage(), e);
        } finally {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignored) {
            }
        }
    }

    @Transactional
    public VideoResponseDto updateVideo(Long id, String title, String description,
                                         List<String> tags, MultipartFile thumbnail, User currentUser) {
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new VideoNotFoundException(id));
        if (!video.getUploadedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Нет прав на редактирование этого видео");
        }
        if (title != null && !title.isBlank()) {
            video.setTitle(title);
        }
        if (description != null) {
            video.setDescription(description);
        }
        if (tags != null) {
            video.setTags(tags);
        }
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String videoDir = video.getFilePath().replace("master.m3u8", "");
            String ext = getExtension(thumbnail.getOriginalFilename());
            Path thumbDest = Paths.get(videoDir, "thumbnail." + ext);
            try {
                Files.deleteIfExists(thumbDest);
                Files.copy(thumbnail.getInputStream(), thumbDest);
                video.setThumbnailPath(videoDir + "thumbnail." + ext);
            } catch (IOException e) {
                // не критично
            }
        }
        videoRepository.save(video);
        return VideoResponseDto.from(video);
    }

    public List<VideoResponseDto> getRelatedVideos(Long videoId, int limit) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));
        List<Video> related = new ArrayList<>();

        // По тегам
        if (video.getTags() != null && !video.getTags().isEmpty()) {
            List<Video> byTags = videoRepository.findByTagsInAndIdNot(video.getTags(), videoId);
            related.addAll(byTags);
        }

        // По автору (если мало по тегам)
        if (related.size() < limit) {
            List<Video> byAuthor = videoRepository.findByUploadedByIdAndIdNot(
                    video.getUploadedBy().getId(), videoId);
            for (Video v : byAuthor) {
                if (related.stream().noneMatch(r -> r.getId().equals(v.getId()))) {
                    related.add(v);
                }
            }
        }

        return related.stream()
                .limit(limit)
                .map(VideoResponseDto::from)
                .toList();
    }

    @Transactional
    public void incrementViewCount(Long id) {
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        Long current = video.getViewCount() != null ? video.getViewCount() : 0L;
        video.setViewCount(current + 1);
        videoRepository.save(video);
    }

    // --- Приватные вспомогательные методы ---

    private long getVideoDuration(String filePath) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                filePath
            );
            Process process = pb.start();
            try (Scanner scanner = new Scanner(process.getInputStream())) {
                return scanner.hasNextDouble() ? (long) scanner.nextDouble() : 0L;
            }
        } catch (Exception e) {
            return 0L;
        }
    }


    private List<String> buildFfmpegCommand(Path inputFile, Path workDir, int height, boolean hasAudio) {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-i");
        command.add(inputFile.toString());

        List<String> varStreamMaps = new ArrayList<>();
        int vIndex = 0;
        String audioSuffix = hasAudio ? ",a:0" : "";

        if (height >= 1080) {
            command.addAll(List.of(
                "-map", "0:v:0", "-filter:v:" + vIndex, "scale=1920:1080",
                "-b:v:" + vIndex, "5000k", "-maxrate:v:" + vIndex, "5350k", "-bufsize:v:" + vIndex, "7500k"
            ));
            varStreamMaps.add("v:" + vIndex + audioSuffix);
            vIndex++;
        }

        if (height >= 720) {
            command.addAll(List.of(
                "-map", "0:v:0", "-filter:v:" + vIndex, "scale=1280:720",
                "-b:v:" + vIndex, "2800k", "-maxrate:v:" + vIndex, "2996k", "-bufsize:v:" + vIndex, "4200k"
            ));
            varStreamMaps.add("v:" + vIndex + audioSuffix);
            vIndex++;
        }

        command.addAll(List.of(
            "-map", "0:v:0", "-filter:v:" + vIndex, "scale=854:480",
            "-b:v:" + vIndex, "1400k", "-maxrate:v:" + vIndex, "1498k", "-bufsize:v:" + vIndex, "2100k"
        ));
        varStreamMaps.add("v:" + vIndex + audioSuffix);

        if (hasAudio) {
            command.addAll(List.of("-map", "0:a:0", "-c:a", "aac", "-b:a", "128k", "-ac", "2"));
        }

        command.addAll(List.of(
            "-c:v", "libx264", "-profile:v", "main", "-crf", "20",
            "-sc_threshold", "0", "-g", "48", "-keyint_min", "48",
            "-f", "hls",
            "-hls_time", "4",
            "-hls_playlist_type", "vod",
            "-master_pl_name", "master.m3u8",
            "-var_stream_map", String.join(" ", varStreamMaps),
            workDir.resolve("stream_%v.m3u8").toString()
        ));

        return command;
    }

    private int runProcess(List<String> command) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.inheritIO();
        Process process = pb.start();
        return process.waitFor();
    }

    private int getVideoHeight(String filePath) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=height", "-of", "csv=p=0", filePath
        );
        Process process = pb.start();
        try (Scanner scanner = new Scanner(process.getInputStream())) {
            return scanner.hasNextInt() ? scanner.nextInt() : 0;
        }
    }

    private boolean hasAudioStream(String filePath) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "ffprobe", "-v", "error", "-select_streams", "a:0",
                "-show_entries", "stream=codec_type", "-of", "csv=p=0", filePath
            );
            Process process = pb.start();
            boolean hasAudio;
            try (Scanner s = new Scanner(process.getInputStream())) {
                hasAudio = s.hasNextLine() && "audio".equalsIgnoreCase(s.nextLine().trim());
            }
            process.waitFor();
            return hasAudio;
        } catch (Exception e) {
            return false;
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return "jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "jpg";
    }
}