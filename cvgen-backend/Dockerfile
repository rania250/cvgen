# =====================================================
# Stage 1 : Builder - compilation du JAR avec Maven
# =====================================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Cache des dépendances : copier d'abord le pom seul
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Copie du code source puis packaging
COPY src ./src
RUN mvn -B clean package -DskipTests

# =====================================================
# Stage 2 : Runtime - image légère JRE Alpine
# =====================================================
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Utilisateur non-root pour la sécurité
RUN addgroup -S cvgen && adduser -S cvgen -G cvgen

# Copie du JAR depuis le builder
COPY --from=builder /build/target/*.jar app.jar

USER cvgen

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
