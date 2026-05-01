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
import java.util.Comparator;
import java.util.concurrent.CompletableFuture;

@Service
public class VideoProcessingService {

    private static final Logger log = LoggerFactory.getLogger(VideoProcessingService.class);

    private final VideoRepository videoRepository;
    private final MinioService minioService;

    public VideoProcessingService(VideoRepository videoRepository, MinioService minioService) {
        this.videoRepository = videoRepository;
        this.minioService = minioService;
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

            CompletableFuture<Void> transcriptionFuture = CompletableFuture.runAsync(
                () -> transcribeVideo(tempFile, workDir)
            );

            int exitCode = runProcess(command);

            if (exitCode != 0) {
                log.error("FFmpeg завершился с кодом {} для видео {}", exitCode, videoDbId);
                transcriptionFuture.cancel(true);
                markFailed(videoDbId);
                return;
            }

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

            transcriptionFuture.join();
            List<String> tags = generateTags(workDir);

            Path transcriptionFile = workDir.resolve("transcription.txt");
            if (Files.exists(transcriptionFile)) {
                try {
                    String outputDir = System.getenv("TRANSCRIPTION_OUTPUT_DIR");
                    Path dest = (outputDir != null && !outputDir.isBlank())
                        ? Path.of(outputDir)
                        : Path.of(System.getProperty("user.home"), "Desktop");
                    Files.copy(transcriptionFile,
                        dest.resolve("transcription_" + videoId + ".txt"),
                        java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    log.info("Транскрипция скопирована в {} для видео {}", dest, videoDbId);
                } catch (Exception e) {
                    log.warn("Не удалось скопировать транскрипцию: {}", e.getMessage());
                }
            }

            try {
                Files.walk(workDir)
                    .filter(Files::isRegularFile)
                    .filter(p -> !p.getFileName().toString().startsWith("original_"))
                    .forEach(p -> {
                        String key = "videos/" + videoId + "/" + workDir.relativize(p).toString().replace("\\", "/");
                        try {
                            minioService.uploadFile(p, key);
                        } catch (Exception e) {
                            log.warn("Не удалось загрузить файл {} в MinIO: {}", p, e.getMessage());
                        }
                    });
                log.info("Файлы видео {} загружены в MinIO", videoDbId);
            } catch (Exception e) {
                log.warn("Ошибка при загрузке файлов в MinIO для видео {}: {}", videoDbId, e.getMessage());
            }

            Video video = videoRepository.findById(videoDbId).orElse(null);
            if (video != null) {
                video.setDuration(duration);
                video.setStatus(VideoStatus.READY);
                if (thumbnailPath != null) {
                    video.setThumbnailPath(thumbnailPath);
                }
                if (!tags.isEmpty()) video.setTags(tags);
                videoRepository.save(video);
            }

            log.info("Видео {} успешно обработано", videoDbId);

        } catch (Exception e) {
            log.error("Ошибка обработки видео {}: {}", videoDbId, e.getMessage(), e);
            markFailed(videoDbId);
        } finally {
            try {
                Files.walk(workDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
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


    private long getVideoDuration(String filePath) {
        for (String entry : List.of("format=duration", "stream=duration")) {
            try {
                ProcessBuilder pb = new ProcessBuilder(
                    "ffprobe", "-v", "error",
                    "-show_entries", entry,
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    filePath
                );
                Process process = pb.start();
                try (Scanner scanner = new Scanner(process.getInputStream())) {
                    if (scanner.hasNextDouble()) {
                        long dur = (long) scanner.nextDouble();
                        if (dur > 0) return dur;
                    }
                }
            } catch (Exception ignored) {}
        }
        return 0L;
    }

    private List<String> buildFfmpegCommand(Path inputFile, Path workDir, int height, boolean hasAudio) {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-i");
        command.add(inputFile.toString());

        List<String> varStreamMaps = new ArrayList<>();
        int vIndex = 0;
        int aIndex = 0;

        if (height >= 1440) {
            command.addAll(List.of(
                "-map", "0:v:0", "-filter:v:" + vIndex, "scale=2560:1440",
                "-b:v:" + vIndex, "9000k", "-maxrate:v:" + vIndex, "9630k", "-bufsize:v:" + vIndex, "13500k"
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
            "-c:v", "h264_nvenc", "-profile:v", "high", "-level", "5.1",
            "-preset", "p4", "-rc", "vbr", "-cq", "23",
            "-g", "48", "-no-scenecut", "1", "-forced-idr", "1",
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

        LinkedList<String> lastLines = new LinkedList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lastLines.add(line);
                if (lastLines.size() > 50) lastLines.removeFirst();
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.error("Процесс завершился с кодом {}. Последние строки:\n{}", exitCode, String.join("\n", lastLines));
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

    private void transcribeVideo(Path videoFile, Path workDir) {
        Path outputFile = workDir.resolve("transcription.txt");
        Path scriptPath = resolveTranscribeScript();
        String python = System.getenv().getOrDefault("PYTHON_BIN",
            System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3");
        try {
            log.info("Запуск транскрипции: python={}, script={}, input={}, output={}",
                python, scriptPath, videoFile, outputFile);
            int exitCode = runProcess(List.of(python, scriptPath.toString(),
                videoFile.toString(), outputFile.toString()));
            if (exitCode != 0) {
                log.warn("Транскрипция завершилась с кодом {}", exitCode);
            } else {
                log.info("Транскрипция сохранена в {}", outputFile);
            }
        } catch (Exception e) {
            log.warn("Ошибка при транскрипции видео: {}", e.getMessage(), e);
        }
    }

    private Path resolveTranscribeScript() {
        String override = System.getenv("TRANSCRIBE_SCRIPTS_DIR");
        if (override != null && !override.isBlank()) {
            return Path.of(override, "transcribe.py");
        }
        Path docker = Path.of("/app/scripts/transcribe.py");
        if (Files.exists(docker)) return docker;
        return Path.of(System.getProperty("user.home"), "Desktop", "teachview-web", "scripts", "transcribe.py");
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

    private Path resolveTagsScript() {
        String override = System.getenv("TRANSCRIBE_SCRIPTS_DIR");
        if (override != null && !override.isBlank())
            return Path.of(override, "generate_tags.py");
        Path docker = Path.of("/app/scripts/generate_tags.py");
        if (Files.exists(docker)) return docker;
        return Path.of(System.getProperty("user.home"), "Desktop", "teachview-web", "scripts", "generate_tags.py");
    }

    private List<String> generateTags(Path workDir) {
        Path transcriptionFile = workDir.resolve("transcription.txt");
        Path tagsFile = workDir.resolve("tags.json");
        if (!Files.exists(transcriptionFile)) return List.of();

        Path scriptPath = resolveTagsScript();
        String python = System.getenv().getOrDefault("PYTHON_BIN",
            System.getProperty("os.name").toLowerCase().contains("win")? "python" : "python3");
        try{
            log.info("Запуск генерации тегов...");
            int exitCode = runProcess(List.of(python, scriptPath.toString(),
                transcriptionFile.toString(), tagsFile.toString()));
            if (exitCode != 0 || !Files.exists(tagsFile)) return List.of();
            
            String json = Files.readString(tagsFile);
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) {
           log.warn("Ошибка генерации тегов: {}", e.getMessage());
            return List.of(); 
        }
    }
}
