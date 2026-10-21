package ru.itmo.lab3.dto;

import ru.itmo.lab3.model.Student;

public class StudentDto {
    public String fullName;
    public String group;
    public String isuId;
    public Integer dormitory;
    public Integer room;
    public String settlementDate;
    public Boolean isForeign;
    public String notes;

    public static StudentDto from(Student student) {
        StudentDto dto = new StudentDto();
        dto.fullName = student.getFullName();
        dto.group = student.getGroup();
        dto.isuId = student.getIsuId();
        dto.dormitory = student.getDormitory();
        dto.room = student.getRoom();
        dto.settlementDate = student.getSettlementDate().toString();
        dto.isForeign = student.isForeign();
        dto.notes = student.getNotes();
        return dto;
    }
}
