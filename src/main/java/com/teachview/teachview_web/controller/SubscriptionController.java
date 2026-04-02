package com.teachview.teachview_web.controller;

import com.teachview.teachview_web.dto.SubscriptionDto;
import com.teachview.teachview_web.dto.SubscriptionTierDto;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.service.SubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    // ─── Tiers (уровни подписки автора) ───

    @GetMapping("/tiers/{authorId}")
    public List<SubscriptionTierDto> getTiers(@PathVariable Long authorId) {
        return subscriptionService.getTiersByAuthor(authorId);
    }

    @PostMapping("/tiers")
    public ResponseEntity<SubscriptionTierDto> createTier(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User currentUser
    ) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        Integer price = (Integer) body.get("price");
        Integer sortOrder = (Integer) body.get("sortOrder");
        SubscriptionTierDto tier = subscriptionService.createTier(currentUser, name, description, price, sortOrder);
        return ResponseEntity.ok(tier);
    }

    @PutMapping("/tiers/{tierId}")
    public ResponseEntity<SubscriptionTierDto> updateTier(
            @PathVariable Long tierId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User currentUser
    ) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        Integer price = (Integer) body.get("price");
        Integer sortOrder = (Integer) body.get("sortOrder");
        SubscriptionTierDto tier = subscriptionService.updateTier(tierId, currentUser, name, description, price, sortOrder);
        return ResponseEntity.ok(tier);
    }

    @DeleteMapping("/tiers/{tierId}")
    public ResponseEntity<Void> deleteTier(
            @PathVariable Long tierId,
            @AuthenticationPrincipal User currentUser
    ) {
        subscriptionService.deleteTier(tierId, currentUser);
        return ResponseEntity.ok().build();
    }

    // ─── Subscriptions (подписки пользователя) ───

    @PostMapping("/subscribe/{tierId}")
    public ResponseEntity<SubscriptionDto> subscribe(
            @PathVariable Long tierId,
            @AuthenticationPrincipal User currentUser
    ) {
        SubscriptionDto sub = subscriptionService.subscribe(currentUser, tierId);
        return ResponseEntity.ok(sub);
    }

    @PostMapping("/unsubscribe/{authorId}")
    public ResponseEntity<Void> unsubscribe(
            @PathVariable Long authorId,
            @AuthenticationPrincipal User currentUser
    ) {
        subscriptionService.unsubscribe(currentUser, authorId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/my")
    public List<SubscriptionDto> getMySubscriptions(@AuthenticationPrincipal User currentUser) {
        return subscriptionService.getMySubscriptions(currentUser.getId());
    }

    @GetMapping("/check/{authorId}")
    public ResponseEntity<SubscriptionDto> checkSubscription(
            @PathVariable Long authorId,
            @AuthenticationPrincipal User currentUser
    ) {
        SubscriptionDto sub = subscriptionService.getSubscription(currentUser.getId(), authorId);
        if (sub == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(sub);
    }

    @GetMapping("/count/{authorId}")
    public ResponseEntity<Map<String, Long>> getSubscriberCount(@PathVariable Long authorId) {
        long count = subscriptionService.getSubscriberCount(authorId);
        return ResponseEntity.ok(Map.of("count", count));
    }
}
