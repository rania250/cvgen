# =====================================================
# Stage 1 : Builder - compilation du JAR avec Maven
# =====================================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copie du code source puis packaging
COPY pom.xml .
COPY src ./src
RUN mvn -B clean package -DskipTests

# =====================================================
# Stage 2 : Runtime - image avec JRE et Tectonic
# =====================================================
FROM eclipse-temurin:17-jre AS runtime

WORKDIR /app

# Installation de Tectonic et dépendances
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && wget https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.14.1/tectonic-0.14.1-x86_64-unknown-linux-gnu.tar.gz \
    && tar -xzf tectonic-*.tar.gz \
    && mv tectonic /usr/local/bin/ \
    && rm tectonic-*.tar.gz \
    && apt-get remove -y wget \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Utilisateur non-root pour la sécurité
RUN groupadd -r cvgen && useradd -r -g cvgen cvgen

# Copie du JAR depuis le builder
COPY --from=builder /build/target/*.jar app.jar

USER cvgen

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
