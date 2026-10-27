FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package \
    && mvn -q dependency:copy -Dartifact=org.postgresql:postgresql:42.7.14 -DoutputDirectory=/build/target

FROM quay.io/wildfly/wildfly:39.0.1.Final-2-jdk21
COPY --from=build /build/target/ROOT.war /opt/jboss/ROOT.war
COPY --from=build /build/target/postgresql-42.7.14.jar /opt/jboss/postgresql.jar
COPY docker-entrypoint.sh /opt/jboss/docker-entrypoint.sh
CMD ["/bin/bash", "/opt/jboss/docker-entrypoint.sh"]
