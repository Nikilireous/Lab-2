package ru.itmo.lab3.repository;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import ru.itmo.lab3.dto.StudentFilter;
import ru.itmo.lab3.model.Student;

@Stateless
public class StudentRepository {
    @PersistenceContext(unitName = "students")
    private EntityManager em;

    public Student find(String isuId) {
        return em.find(Student.class, isuId);
    }

    public void create(Student student) {
        em.persist(student);
    }

    public void delete(Student student) {
        em.remove(student);
    }

    public SearchResult search(StudentFilter filter) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Student> query = cb.createQuery(Student.class);
        Root<Student> root = query.from(Student.class);
        query.where(predicates(cb, root, filter));
        Order mainOrder = filter.descending
            ? cb.desc(root.get(filter.sort)) : cb.asc(root.get(filter.sort));
        if (filter.sort.equals("isuId")) {
            query.orderBy(mainOrder);
        } else {
            query.orderBy(mainOrder, cb.asc(root.get("isuId")));
        }

        TypedQuery<Student> students = em.createQuery(query);
        if (filter.paginated) {
            students.setFirstResult((filter.page - 1) * filter.size);
            students.setMaxResults(filter.size);
        }

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Student> countRoot = countQuery.from(Student.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(predicates(cb, countRoot, filter));
        long total = em.createQuery(countQuery).getSingleResult();
        return new SearchResult(students.getResultList(), total);
    }

    private Predicate[] predicates(CriteriaBuilder cb, Root<Student> root, StudentFilter filter) {
        List<Predicate> parts = new ArrayList<>();
        if (filter.fullName != null) parts.add(cb.equal(root.get("fullName"), filter.fullName));
        if (filter.group != null) parts.add(cb.equal(root.get("group"), filter.group));
        if (filter.isuId != null) parts.add(cb.equal(root.get("isuId"), filter.isuId));
        if (filter.dormitory != null) parts.add(cb.equal(root.get("dormitory"), filter.dormitory));
        if (filter.room != null) parts.add(cb.equal(root.get("room"), filter.room));
        if (filter.isForeign != null) parts.add(cb.equal(root.get("isForeign"), filter.isForeign));
        if (filter.settlementDate != null) parts.add(cb.equal(root.get("settlementDate"), filter.settlementDate));
        if (filter.dateFrom != null) parts.add(cb.greaterThanOrEqualTo(root.get("settlementDate"), filter.dateFrom));
        if (filter.dateTo != null) parts.add(cb.lessThanOrEqualTo(root.get("settlementDate"), filter.dateTo));
        if (filter.search != null && !filter.search.isBlank()) {
            String escaped = filter.search.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            String term = "%" + escaped + "%";
            parts.add(cb.or(
                cb.like(cb.lower(root.get("fullName")), term, '\\'),
                cb.like(root.get("isuId"), term, '\\')
            ));
        }
        return parts.toArray(Predicate[]::new);
    }

    public record SearchResult(List<Student> students, long total) {}
}
