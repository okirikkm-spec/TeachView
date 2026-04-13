package com.teachview.teachview_web.service;

import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.entity.VideoStatus;
import com.teachview.teachview_web.repository.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Service
public class VideoProcessingService {

    private static final Logger log = LoggerFactory.getLogger(VideoProcessingService.class);

    private final VideoRepository videoRepository;

    public VideoProcessingService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    @Async("videoProcessingExecutor")
    public void processAsync(Long videoDbId, Path tempFile, Path workDir,
                             String videoId, boolean needThumbnail) {
        log.info("Начинаю обработку видео {} — файл: {}", videoDbId, tempFile);
        try {
            if (!Files.exists(tempFile)) {
                log.error("Файл не найден: {}", tempFile);
                markFailed(videoDbId);
                return;
            }
            log.info("Размер файла: {} байт", Files.size(tempFile));

            int height = getVideoHeight(tempFile.toString());
            boolean hasAudio = hasAudioStream(tempFile.toString());
            long duration = getVideoDuration(tempFile.toString());
            log.info("Видео {}: height={}, hasAudio={}, duration={}", videoDbId, height, hasAudio, duration);

            List<String> command = buildFfmpegCommand(tempFile, workDir, height, hasAudio);
            log.info("FFmpeg команда: {}", String.join(" ", command));

            int exitCode = runProcess(command);

            if (exitCode != 0) {
                log.error("FFmpeg завершился с кодом {} для видео {}", exitCode, videoDbId);
                markFailed(videoDbId);
                return;
            }

            // Генерируем превью из видео, если пользователь не загрузил своё
            String thumbnailPath = null;
            if (needThumbnail) {
                Path thumbDest = workDir.resolve("thumbnail.jpg");
                try {
                    int exitCodeThumb = runProcess(List.of(
                        "ffmpeg",
                        "-i", tempFile.toString(),
                        "-ss", "00:00:01",
                        "-frames:v", "1",
                        "-q:v", "2",
                        thumbDest.toString()
                    ));
                    if (exitCodeThumb == 0) {
                        thumbnailPath = "uploads/videos/" + videoId + "/thumbnail.jpg";
                    }
                } catch (Exception e) {
                    log.warn("Не удалось сгенерировать превью для видео {}", videoDbId, e);
                }
            }

            Video video = videoRepository.findById(videoDbId).orElse(null);
            if (video != null) {
                video.setDuration(duration);
                video.setStatus(VideoStatus.READY);
                if (thumbnailPath != null) {
                    video.setThumbnailPath(thumbnailPath);
                }
                videoRepository.save(video);
            }

            log.info("Видео {} успешно обработано", videoDbId);

        } catch (Exception e) {
            log.error("Ошибка обработки видео {}: {}", videoDbId, e.getMessage(), e);
            markFailed(videoDbId);
        } finally {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignored) {}
        }
    }

    private void markFailed(Long videoDbId) {
        Video video = videoRepository.findById(videoDbId).orElse(null);
        if (video != null) {
            video.setStatus(VideoStatus.FAILED);
            videoRepository.save(video);
        }
    }

    // --- FFmpeg вспомогательные методы ---

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
        int aIndex = 0;

        if (height >= 1080) {
            command.addAll(List.of(
                "-map", "0:v:0", "-filter:v:" + vIndex, "scale=1920:1080",
                "-b:v:" + vIndex, "5000k", "-maxrate:v:" + vIndex, "5350k", "-bufsize:v:" + vIndex, "7500k"
            ));
            if (hasAudio) {
                command.addAll(List.of("-map", "0:a:0"));
                varStreamMaps.add("v:" + vIndex + ",a:" + aIndex);
                aIndex++;
            } else {
                varStreamMaps.add("v:" + vIndex);
            }
            vIndex++;
        }

        if (height >= 720) {
            command.addAll(List.of(
                "-map", "0:v:0", "-filter:v:" + vIndex, "scale=1280:720",
                "-b:v:" + vIndex, "2800k", "-maxrate:v:" + vIndex, "2996k", "-bufsize:v:" + vIndex, "4200k"
            ));
            if (hasAudio) {
                command.addAll(List.of("-map", "0:a:0"));
                varStreamMaps.add("v:" + vIndex + ",a:" + aIndex);
                aIndex++;
            } else {
                varStreamMaps.add("v:" + vIndex);
            }
            vIndex++;
        }

        command.addAll(List.of(
            "-map", "0:v:0", "-filter:v:" + vIndex, "scale=854:480",
            "-b:v:" + vIndex, "1400k", "-maxrate:v:" + vIndex, "1498k", "-bufsize:v:" + vIndex, "2100k"
        ));
        if (hasAudio) {
            command.addAll(List.of("-map", "0:a:0"));
            varStreamMaps.add("v:" + vIndex + ",a:" + aIndex);
        } else {
            varStreamMaps.add("v:" + vIndex);
        }

        if (hasAudio) {
            command.addAll(List.of("-c:a", "aac", "-b:a", "128k", "-ac", "2"));
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
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Читаем весь вывод, чтобы процесс не заблокировался на полном буфере
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.error("Процесс завершился с кодом {}. Вывод:\n{}", exitCode, output);
        }
        return exitCode;
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
}
