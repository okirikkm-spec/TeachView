package com.teachview.teachview_web.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_SECONDS = 15 * 60L; // 15 минут

    private final ConcurrentHashMap<String, AttemptInfo> cache = new ConcurrentHashMap<>();

    public void loginFailed(String email) {
        cache.compute(email, (k, v) -> {
            if (v == null) v = new AttemptInfo();
            v.count++;
            if (v.count >= MAX_ATTEMPTS) {
                v.lockedUntil = Instant.now().plusSeconds(LOCK_SECONDS);
            }
            return v;
        });
    }

    public void loginSucceeded(String email) {
        cache.remove(email);
    }

    public boolean isBlocked(String email) {
        AttemptInfo info = cache.get(email);
        if (info == null || info.lockedUntil == null) return false;
        if (Instant.now().isAfter(info.lockedUntil)) {
            cache.remove(email);
            return false;
        }
        return true;
    }

    public long secondsUntilUnlock(String email) {
        AttemptInfo info = cache.get(email);
        if (info == null || info.lockedUntil == null) return 0;
        return Math.max(0, info.lockedUntil.getEpochSecond() - Instant.now().getEpochSecond());
    }

    private static class AttemptInfo {
        int count = 0;
        Instant lockedUntil = null;
    }
}
