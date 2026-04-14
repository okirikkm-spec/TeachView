package com.teachview.teachview_web.service;

import io.minio.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class MinioService {

    private static final Logger log = LoggerFactory.getLogger(MinioService.class);

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @PostConstruct
    public void createBucketIfNotExists() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Bucket '{}' создан", bucket);
            } else {
                log.info("Bucket '{}' уже существует", bucket);
            }
        } catch (Exception e) {
            log.warn("Не удалось создать bucket '{}': {}", bucket, e.getMessage());
        }
    }

    public void uploadFile(Path filePath, String objectName) throws Exception {
        String contentType = Files.probeContentType(filePath);

        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        minioClient.uploadObject(
            UploadObjectArgs.builder()
                .bucket(bucket)
                .object(objectName)
                .filename(filePath.toString())
                .contentType(contentType)
                .build()    
        );
    }

    public InputStream getObject(String objectName) throws Exception {
        return minioClient.getObject(
            GetObjectArgs.builder()
                .bucket(bucket)
                .object(objectName)
                .build()
        );
    }

    public void deleteFolder(String prefix) throws Exception {
        Iterable<Result<io.minio.messages.Item>> objects = minioClient.listObjects(
            ListObjectsArgs.builder().bucket(bucket).prefix(prefix).recursive(true).build()
        );
        for (Result<io.minio.messages.Item> result : objects) {
            String objectName = result.get().objectName();
            minioClient.removeObject(
                RemoveObjectArgs.builder().bucket(bucket).object(objectName).build()
            );
        }
    }
}
