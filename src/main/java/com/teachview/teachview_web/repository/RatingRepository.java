package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

    Optional<Rating> findByVideoIdAndUserId(Long videoId, Long userId);

    @Query("SELECT AVG(r.value) FROM Rating r WHERE r.video.id = :videoId")
    Double getAverageByVideoId(@Param("videoId") Long videoId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.video.id = :videoId")
    Integer getCountByVideoId(@Param("videoId") Long videoId);
}
