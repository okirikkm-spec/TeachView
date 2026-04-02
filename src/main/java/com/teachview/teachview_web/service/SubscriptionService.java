package com.teachview.teachview_web.service;

import com.teachview.teachview_web.dto.SubscriptionDto;
import com.teachview.teachview_web.dto.SubscriptionTierDto;
import com.teachview.teachview_web.entity.Subscription;
import com.teachview.teachview_web.entity.SubscriptionTier;
import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.repository.SubscriptionRepository;
import com.teachview.teachview_web.repository.SubscriptionTierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SubscriptionService {

    private final SubscriptionTierRepository tierRepository;
    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(SubscriptionTierRepository tierRepository,
                               SubscriptionRepository subscriptionRepository) {
        this.tierRepository = tierRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    // ─── Tier management (author) ───

    public List<SubscriptionTierDto> getTiersByAuthor(Long authorId) {
        return tierRepository.findByAuthorIdOrderBySortOrderAscPriceAsc(authorId)
                .stream()
                .map(SubscriptionTierDto::from)
                .toList();
    }

    @Transactional
    public SubscriptionTierDto createTier(User author, String name, String description, Integer price, Integer sortOrder) {
        SubscriptionTier tier = new SubscriptionTier();
        tier.setAuthor(author);
        tier.setName(name);
        tier.setDescription(description);
        tier.setPrice(price);
        tier.setSortOrder(sortOrder != null ? sortOrder : 0);
        tierRepository.save(tier);
        return SubscriptionTierDto.from(tier);
    }

    @Transactional
    public SubscriptionTierDto updateTier(Long tierId, User author, String name, String description, Integer price, Integer sortOrder) {
        SubscriptionTier tier = tierRepository.findById(tierId)
                .orElseThrow(() -> new RuntimeException("Уровень подписки не найден"));
        if (!tier.getAuthor().getId().equals(author.getId())) {
            throw new RuntimeException("Нет прав на редактирование");
        }
        if (name != null) tier.setName(name);
        if (description != null) tier.setDescription(description);
        if (price != null) tier.setPrice(price);
        if (sortOrder != null) tier.setSortOrder(sortOrder);
        tierRepository.save(tier);
        return SubscriptionTierDto.from(tier);
    }

    @Transactional
    public void deleteTier(Long tierId, User author) {
        SubscriptionTier tier = tierRepository.findById(tierId)
                .orElseThrow(() -> new RuntimeException("Уровень подписки не найден"));
        if (!tier.getAuthor().getId().equals(author.getId())) {
            throw new RuntimeException("Нет прав на удаление");
        }
        tierRepository.delete(tier);
    }

    // ─── Subscription management ───

    @Transactional
    public SubscriptionDto subscribe(User subscriber, Long tierId) {
        SubscriptionTier tier = tierRepository.findById(tierId)
                .orElseThrow(() -> new RuntimeException("Уровень подписки не найден"));

        User author = tier.getAuthor();
        if (author.getId().equals(subscriber.getId())) {
            throw new RuntimeException("Нельзя подписаться на себя");
        }

        Subscription sub = subscriptionRepository
                .findBySubscriberIdAndAuthorId(subscriber.getId(), author.getId())
                .orElse(null);

        if (sub != null) {
            // Обновляем уровень подписки
            sub.setTier(tier);
            sub.setActive(true);
            sub.setStartedAt(LocalDateTime.now());
            sub.setExpiresAt(LocalDateTime.now().plusMonths(1));
        } else {
            sub = new Subscription();
            sub.setSubscriber(subscriber);
            sub.setAuthor(author);
            sub.setTier(tier);
            sub.setActive(true);
            sub.setStartedAt(LocalDateTime.now());
            sub.setExpiresAt(LocalDateTime.now().plusMonths(1));
        }

        subscriptionRepository.save(sub);
        return SubscriptionDto.from(sub);
    }

    @Transactional
    public void unsubscribe(User subscriber, Long authorId) {
        Subscription sub = subscriptionRepository
                .findBySubscriberIdAndAuthorId(subscriber.getId(), authorId)
                .orElseThrow(() -> new RuntimeException("Подписка не найдена"));
        sub.setActive(false);
        subscriptionRepository.save(sub);
    }

    public SubscriptionDto getSubscription(Long subscriberId, Long authorId) {
        return subscriptionRepository.findBySubscriberIdAndAuthorId(subscriberId, authorId)
                .filter(Subscription::getActive)
                .map(SubscriptionDto::from)
                .orElse(null);
    }

    public List<SubscriptionDto> getMySubscriptions(Long subscriberId) {
        return subscriptionRepository.findBySubscriberIdAndActiveTrue(subscriberId)
                .stream()
                .map(SubscriptionDto::from)
                .toList();
    }

    public long getSubscriberCount(Long authorId) {
        return subscriptionRepository.countByAuthorIdAndActiveTrue(authorId);
    }

    /**
     * Проверяет, имеет ли пользователь доступ к видео.
     * Видео доступно если: нет requiredTier, или пользователь — автор,
     * или у пользователя активная подписка с ценой >= требуемой.
     */
    public boolean hasAccessToVideo(Video video, User user) {
        if (video.getRequiredTier() == null) return true;
        if (user == null) return false;
        if (video.getUploadedBy().getId().equals(user.getId())) return true;

        Subscription sub = subscriptionRepository
                .findBySubscriberIdAndAuthorId(user.getId(), video.getUploadedBy().getId())
                .orElse(null);

        if (sub == null || !sub.getActive()) return false;
        if (sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(LocalDateTime.now())) return false;

        // Доступ есть если цена подписки >= цена требуемого уровня
        return sub.getTier().getPrice() >= video.getRequiredTier().getPrice();
    }
}
