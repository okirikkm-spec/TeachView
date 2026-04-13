package com.teachview.teachview_web.service;

import io.minio.*;
import io.minio.errors.MinioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    private void uploadFile(Path filePath, String objectName) throws Exception {
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
