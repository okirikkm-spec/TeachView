package com.teachview.teachview_web.dto;

import com.teachview.teachview_web.entity.Subscription;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SubscriptionDto {
    private Long id;
    private Long subscriberId;
    private String subscriberName;
    private Long authorId;
    private String authorName;
    private String authorAvatarUrl;
    private SubscriptionTierDto tier;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private Boolean active;

    public static SubscriptionDto from(Subscription sub) {
        SubscriptionDto dto = new SubscriptionDto();
        dto.setId(sub.getId());
        dto.setStartedAt(sub.getStartedAt());
        dto.setExpiresAt(sub.getExpiresAt());
        dto.setActive(sub.getActive());
        if (sub.getSubscriber() != null) {
            dto.setSubscriberId(sub.getSubscriber().getId());
            dto.setSubscriberName(sub.getSubscriber().getUsername());
        }
        if (sub.getAuthor() != null) {
            dto.setAuthorId(sub.getAuthor().getId());
            dto.setAuthorName(sub.getAuthor().getUsername());
            String avatar = sub.getAuthor().getAvatarPath();
            dto.setAuthorAvatarUrl(avatar != null ? "/" + avatar : null);
        }
        if (sub.getTier() != null) {
            dto.setTier(SubscriptionTierDto.from(sub.getTier()));
        }
        return dto;
    }
}
