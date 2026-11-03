package ru.itmo.lab3.repository;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import java.util.List;
import ru.itmo.lab3.model.UserAccount;

@Stateless
public class UserRepository {
    @PersistenceContext(unitName = "students")
    private EntityManager em;

    public UserAccount findByUsername(String username) {
        return findBy("username", username);
    }

    public UserAccount findByEmail(String email) {
        return findBy("email", email);
    }

    private UserAccount findBy(String field, String value) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<UserAccount> query = cb.createQuery(UserAccount.class);
        Root<UserAccount> user = query.from(UserAccount.class);
        query.where(cb.equal(user.get(field), value));
        List<UserAccount> users = em.createQuery(query).getResultList();
        return users.isEmpty() ? null : users.get(0);
    }

    public void save(UserAccount user) {
        em.persist(user);
    }
}
