package ru.itmo.lab3.dto;

import java.time.LocalDate;

public class StudentFilter {
    public String fullName;
    public String group;
    public String isuId;
    public Integer dormitory;
    public Integer room;
    public LocalDate settlementDate;
    public Boolean isForeign;
    public LocalDate dateFrom;
    public LocalDate dateTo;
    public String search;
    public String sort = "isuId";
    public boolean descending;
    public int page = 1;
    public int size = 20;
    public boolean paginated;
}
