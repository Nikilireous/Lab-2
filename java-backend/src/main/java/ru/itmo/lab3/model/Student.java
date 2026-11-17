package ru.itmo.lab3.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "students", indexes = {
    @Index(name = "idx_students_name", columnList = "full_name"),
    @Index(name = "idx_students_group", columnList = "group_name"),
    @Index(name = "idx_students_dorm_room", columnList = "dormitory, room"),
    @Index(name = "idx_students_date", columnList = "settlement_date")
})
public class Student {
    @Id
    @Column(name = "isu_id", length = 6)
    private String isuId;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "group_name", nullable = false, length = 5)
    private String group;

    @Column(nullable = false)
    private int dormitory;

    @Column(nullable = false)
    private int room;

    @Column(name = "settlement_date", nullable = false)
    private LocalDate settlementDate;

    @Column(name = "is_foreign", nullable = false)
    private boolean isForeign;

    @Column(nullable = false, length = 500)
    private String notes = "";

    public String getIsuId() { return isuId; }
    public void setIsuId(String isuId) { this.isuId = isuId; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getGroup() { return group; }
    public void setGroup(String group) { this.group = group; }
    public int getDormitory() { return dormitory; }
    public void setDormitory(int dormitory) { this.dormitory = dormitory; }
    public int getRoom() { return room; }
    public void setRoom(int room) { this.room = room; }
    public LocalDate getSettlementDate() { return settlementDate; }
    public void setSettlementDate(LocalDate settlementDate) { this.settlementDate = settlementDate; }
    public boolean isForeign() { return isForeign; }
    public void setForeign(boolean foreign) { isForeign = foreign; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
