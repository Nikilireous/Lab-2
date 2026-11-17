package ru.itmo.lab3.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.Mac;
import ru.itmo.lab3.api.ApiException;
import ru.itmo.lab3.dto.AuthResponse;
import ru.itmo.lab3.dto.UserDto;
import ru.itmo.lab3.model.UserAccount;

@ApplicationScoped
public class JwtService {
    private SecretKey key;
    private int accessMinutes;
    private int refreshDays;

    @PostConstruct
    void initialize() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("JWT_SECRET должен содержать не менее 32 байт.");
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        accessMinutes = Integer.parseInt(System.getenv().getOrDefault("ACCESS_MINUTES", "15"));
        refreshDays = Integer.parseInt(System.getenv().getOrDefault("REFRESH_DAYS", "7"));
        if (accessMinutes < 1 || refreshDays < 1)
            throw new IllegalStateException("Сроки действия JWT должны быть положительными.");
    }

    public AuthResponse issue(UserAccount user) {
        return new AuthResponse(
            accessToken(user),
            token(user, "refresh", Instant.now().plus(refreshDays, ChronoUnit.DAYS)),
            UserDto.from(user)
        );
    }

    public String accessToken(UserAccount user) {
        return token(user, "access", Instant.now().plus(accessMinutes, ChronoUnit.MINUTES));
    }

    public int accessMaxAgeSeconds() { return accessMinutes * 60; }
    public int refreshMaxAgeSeconds() { return refreshDays * 24 * 60 * 60; }

    public String csrfToken(String refreshToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                mac.doFinal(refreshToken.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException(error);
        }
    }

    private String token(UserAccount user, String type, Instant expires) {
        return Jwts.builder()
            .subject(user.getUsername())
            .id(UUID.randomUUID().toString())
            .claim("type", type)
            .issuedAt(new Date())
            .expiration(Date.from(expires))
            .signWith(key)
            .compact();
    }

    public String subject(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get("type", String.class)) || claims.getSubject() == null)
                throw new JwtException("Неверный тип токена");
            return claims.getSubject();
        } catch (JwtException | IllegalArgumentException error) {
            throw new ApiException(401, "detail", "Недействительный или истёкший токен.");
        }
    }

    public Instant expiresAt(String token) {
        return Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).getPayload().getExpiration().toInstant();
    }
}
