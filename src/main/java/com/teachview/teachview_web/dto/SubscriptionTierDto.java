package com.teachview.teachview_web.dto;

import com.teachview.teachview_web.entity.SubscriptionTier;
import lombok.Data;

@Data
public class SubscriptionTierDto {
    private Long id;
    private String name;
    private String description;
    private Integer price;
    private Integer sortOrder;
    private Long authorId;
    private String authorName;

    public static SubscriptionTierDto from(SubscriptionTier tier) {
        SubscriptionTierDto dto = new SubscriptionTierDto();
        dto.setId(tier.getId());
        dto.setName(tier.getName());
        dto.setDescription(tier.getDescription());
        dto.setPrice(tier.getPrice());
        dto.setSortOrder(tier.getSortOrder());
        if (tier.getAuthor() != null) {
            dto.setAuthorId(tier.getAuthor().getId());
            dto.setAuthorName(tier.getAuthor().getUsername());
        }
        return dto;
    }
}
