package com.teachview.teachview_web.repository;

import com.teachview.teachview_web.entity.User;
import com.teachview.teachview_web.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {
    // Здесь уже есть методы save(), findAll(), findById()
    List<Video> findByUploadedBy(User uploadedBy);
    List<Video> findByUploadedById(Long userId);
}