package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findBySubscriberIdAndAuthorId(Long subscriberId, Long authorId);
    List<Subscription> findBySubscriberIdAndActiveTrue(Long subscriberId);
    List<Subscription> findByAuthorIdAndActiveTrue(Long authorId);
    long countByAuthorIdAndActiveTrue(Long authorId);
}
