FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

COPY backend/.mvn backend/.mvn
COPY backend/mvnw backend/pom.xml backend/

WORKDIR /app/backend
RUN bash ./mvnw -DskipTests dependency:go-offline

COPY backend/src src
RUN bash ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

CMD ["java", "-jar", "app.jar"]
