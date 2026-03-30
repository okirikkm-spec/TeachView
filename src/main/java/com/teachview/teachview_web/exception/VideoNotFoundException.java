package com.teachview.teachview_web.exception;

public class VideoNotFoundException extends RuntimeException {

    public VideoNotFoundException(Long id) {
        super("Видео с id=" + id + " не найдено");
    }
}