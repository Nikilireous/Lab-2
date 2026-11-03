package ru.itmo.lab3.repository;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaDelete;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import ru.itmo.lab3.model.RefreshToken;
import ru.itmo.lab3.model.UserAccount;

@Stateless
public class RefreshTokenRepository {
    @PersistenceContext(unitName = "students")
    private EntityManager em;

    public void save(String token, UserAccount user, Instant expiresAt) {
        CriteriaDelete<RefreshToken> expired = em.getCriteriaBuilder().createCriteriaDelete(RefreshToken.class);
        expired.where(em.getCriteriaBuilder().lessThan(expired.from(RefreshToken.class)
            .get("expiresAt"), Instant.now()));
        em.createQuery(expired).executeUpdate();
        em.persist(new RefreshToken(hash(token), user, expiresAt));
    }

    public boolean isValid(String token, UserAccount user) {
        RefreshToken saved = em.find(RefreshToken.class, hash(token));
        return saved != null && saved.getUser().getId().equals(user.getId())
            && saved.getExpiresAt().isAfter(Instant.now());
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}
