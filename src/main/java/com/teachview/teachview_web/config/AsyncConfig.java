package com.teachview.teachview_web.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class AsyncConfig {

    /**
     * Executor for FFmpeg video processing.
     *
     * - corePoolSize / maxPoolSize = 2: не более 2 FFmpeg-процессов одновременно.
     *   Измени под своё железо (количество ядер CPU).
     * - queueCapacity = 50: до 50 загрузок могут ждать в очереди (FIFO).
     *   Задачи обрабатываются в том порядке, в котором пришли.
     * - Если очередь переполнена — Spring бросает исключение (загрузка отклоняется).
     */
    @Bean(name = "videoProcessingExecutor")
    public Executor videoProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("ffmpeg-");
        executor.initialize();
        return executor;
    }
}
