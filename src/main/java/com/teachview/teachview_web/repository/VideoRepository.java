package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import com.teachview.teachview_web.entity.VideoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface VideoRepository extends JpaRepository<Video, Long> {

    @Query("SELECT DISTINCT v FROM Video v LEFT JOIN FETCH v.uploadedBy LEFT JOIN FETCH v.tags WHERE v.status = :status ORDER BY v.updatedAt DESC")
    List<Video> findByStatus(@Param("status") VideoStatus status);

    @Query("SELECT DISTINCT v FROM Video v LEFT JOIN FETCH v.uploadedBy LEFT JOIN FETCH v.tags WHERE v.uploadedBy = :uploadedBy ORDER BY v.updatedAt DESC")
    List<Video> findByUploadedBy(@Param("uploadedBy") User uploadedBy);

    @Query("SELECT DISTINCT v FROM Video v LEFT JOIN FETCH v.uploadedBy LEFT JOIN FETCH v.tags WHERE v.uploadedBy.id = :userId ORDER BY v.updatedAt DESC")
    List<Video> findByUploadedById(@Param("userId") Long userId);

    @Query("SELECT DISTINCT v FROM Video v LEFT JOIN FETCH v.uploadedBy LEFT JOIN FETCH v.tags WHERE v.uploadedBy.id = :uploadedById AND v.id <> :id ORDER BY v.updatedAt DESC")
    List<Video> findByUploadedByIdAndIdNot(@Param("uploadedById") Long uploadedById, @Param("id") Long id);

    @Query("SELECT DISTINCT v FROM Video v LEFT JOIN FETCH v.uploadedBy JOIN v.tags t WHERE t IN :tags AND v.id <> :videoId")
    List<Video> findByTagsInAndIdNot(@Param("tags") List<String> tags, @Param("videoId") Long videoId);

    @Modifying
    @Query("UPDATE Video v SET v.viewCount = COALESCE(v.viewCount, 0) + 1 WHERE v.id = :id")
    void incrementViewCount(@Param("id") Long id);
}