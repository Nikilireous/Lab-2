package ru.itmo.lab3.repository;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import ru.itmo.lab3.model.UserAccount;

@Stateless
public class UserRepository {
    @PersistenceContext(unitName = "students")
    private EntityManager em;

    public UserAccount findByUsername(String username) {
        List<UserAccount> users = em.createQuery(
                "SELECT u FROM UserAccount u WHERE u.username = :username", UserAccount.class)
            .setParameter("username", username)
            .getResultList();
        return users.isEmpty() ? null : users.get(0);
    }

    public UserAccount findByEmail(String email) {
        List<UserAccount> users = em.createQuery(
                "SELECT u FROM UserAccount u WHERE u.email = :email", UserAccount.class)
            .setParameter("email", email)
            .getResultList();
        return users.isEmpty() ? null : users.get(0);
    }

    public void save(UserAccount user) {
        em.persist(user);
    }
}
