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

# Шаг 3: Финальный образ
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
RUN apk add --no-cache ffmpeg
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
