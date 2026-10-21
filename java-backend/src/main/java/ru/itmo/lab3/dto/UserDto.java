package ru.itmo.lab3.dto;

import ru.itmo.lab3.model.UserAccount;

public class UserDto {
    public String username;
    public String email;
    public String role;

    public static UserDto from(UserAccount user) {
        UserDto dto = new UserDto();
        dto.username = user.getUsername();
        dto.email = user.getEmail();
        dto.role = user.getRole().name();
        return dto;
    }
}
