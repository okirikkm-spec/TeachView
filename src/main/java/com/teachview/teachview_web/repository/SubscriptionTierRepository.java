package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.SubscriptionTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubscriptionTierRepository extends JpaRepository<SubscriptionTier, Long> {
    List<SubscriptionTier> findByAuthorIdOrderBySortOrderAscPriceAsc(Long authorId);
}
