package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findByUploadedBy(User uploadedBy);
    List<Video> findByUploadedById(Long userId);
    List<Video> findByUploadedByIdAndIdNot(Long uploadedById, Long id);

    @Query("SELECT DISTINCT v FROM Video v JOIN v.tags t WHERE t IN :tags AND v.id <> :videoId")
    List<Video> findByTagsInAndIdNot(@Param("tags") List<String> tags, @Param("videoId") Long videoId);
}