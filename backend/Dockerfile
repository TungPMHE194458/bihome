# Backend BiHome — build bằng Maven trong Docker, chạy bằng JRE 21 (profile prod).
# Build:  docker build -t bihome-api backend/
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src src
# Test chạy ở máy dev / CI (`./mvnw clean verify`, IT cần Docker) — không chạy lại khi đóng image.
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests \
    && cp target/bihome-backend-*.jar /src/app.jar

FROM eclipse-temurin:21-jre
# fontconfig + font: Apache POI (autoSizeColumn khi xuất Excel) cần font hệ thống; curl cho healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --home /app bihome \
    && mkdir -p /app /data/storage && chown -R bihome /app /data
WORKDIR /app
COPY --from=build /src/app.jar app.jar
USER bihome
ENV TZ=Asia/Ho_Chi_Minh \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-Xms256m -Xmx1g -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Duser.timezone=Asia/Ho_Chi_Minh -jar /app/app.jar"]
