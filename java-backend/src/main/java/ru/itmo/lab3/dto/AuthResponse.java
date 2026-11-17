package ru.itmo.lab3.dto;

public class AuthResponse {
    public String accessToken;
    public String refreshToken;
    public UserDto user;

    public AuthResponse() {}

    public AuthResponse(String accessToken, String refreshToken, UserDto user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
    }
}
