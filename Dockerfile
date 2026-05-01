# Шаг 1: Собираем React фронтенд
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY src/frontend/ ./
RUN npm run build

# Шаг 2: Собираем Spring Boot
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline
COPY src/main ./src/main
COPY --from=frontend-build /app/frontend/build ./src/main/resources/static
RUN mvn package -DskipTests

# Шаг 3: Финальный образ (Debian-based для Python + faster-whisper)
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir faster-whisper==1.2.1 \
        nvidia-cublas-cu12 nvidia-cudnn-cu12==9.*
RUN pip install --no-cache-dir transformers>=4.40.0 sentencepiece accelerate \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu121

# CUDA библиотеки из pip-пакетов nvidia-* -> в ld.so.conf
RUN SITE_PKG=$(python3 -c 'import site; print(site.getsitepackages()[0])') \
    && echo "$SITE_PKG/nvidia/cublas/lib"  > /etc/ld.so.conf.d/nvidia-cublas.conf \
    && echo "$SITE_PKG/nvidia/cudnn/lib"   > /etc/ld.so.conf.d/nvidia-cudnn.conf \
    && ldconfig

COPY scripts /app/scripts
COPY --from=backend-build /app/target/*.jar app.jar

ENV TRANSCRIBE_SCRIPTS_DIR=/app/scripts
ENV WHISPER_DEVICE=cuda
ENV WHISPER_COMPUTE_TYPE=float16
ENV WHISPER_MODEL=large-v3
# Кэш модели Whisper (~3GB для large-v3-turbo)
ENV HF_HOME=/app/whisper-cache

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
