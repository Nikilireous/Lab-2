package ru.itmo.lab3.service;

import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.mindrot.jbcrypt.BCrypt;
import ru.itmo.lab3.api.ApiException;
import ru.itmo.lab3.dto.AuthResponse;
import ru.itmo.lab3.dto.LoginRequest;
import ru.itmo.lab3.dto.RefreshRequest;
import ru.itmo.lab3.dto.RegisterRequest;
import ru.itmo.lab3.model.Role;
import ru.itmo.lab3.model.UserAccount;
import ru.itmo.lab3.repository.UserRepository;
import ru.itmo.lab3.security.JwtService;

@Stateless
public class AuthService {
    @Inject
    private UserRepository users;

    @Inject
    private JwtService jwt;

    public AuthResponse register(RegisterRequest request) {
        if (request == null) throw new ApiException(422, "detail", "Тело запроса обязательно.");
        String username = username(request.username);
        String email = email(request.email);
        password(request.password);
        if (users.findByUsername(username) != null)
            throw new ApiException(409, "username", "Имя пользователя уже занято.");
        if (users.findByEmail(email) != null)
            throw new ApiException(409, "email", "Электронная почта уже занята.");

        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(BCrypt.hashpw(request.password, BCrypt.gensalt(12)));
        user.setRole(Role.USER);
        users.save(user);
        return jwt.issue(user);
    }

    public AuthResponse login(LoginRequest request) {
        if (request == null || request.username == null || request.password == null)
            throw new ApiException(422, "detail", "Введите имя и пароль.");
        String name = request.username.trim().toLowerCase(Locale.ROOT);
        UserAccount user = name.contains("@") ? users.findByEmail(name) : users.findByUsername(name);
        if (user == null || !BCrypt.checkpw(request.password, user.getPasswordHash()))
            throw new ApiException(401, "detail", "Неверное имя пользователя или пароль.");
        return jwt.issue(user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        if (request == null || request.refreshToken == null)
            throw new ApiException(422, "refreshToken", "Токен обновления обязателен.");
        String username = jwt.subject(request.refreshToken, "refresh");
        UserAccount user = users.findByUsername(username);
        if (user == null) throw new ApiException(401, "detail", "Пользователь не найден.");
        return jwt.issue(user);
    }

    public UserAccount currentUser(String username) {
        UserAccount user = users.findByUsername(username);
        if (user == null) throw new ApiException(401, "detail", "Пользователь не найден.");
        return user;
    }

    public void ensureAdmin(String username, String email, String rawPassword) {
        if (username == null || email == null || rawPassword == null) return;
        String name = username(username);
        UserAccount existing = users.findByUsername(name);
        if (existing != null) {
            if (existing.getRole() != Role.ADMIN)
                throw new IllegalStateException("ADMIN_USERNAME уже занят пользователем с ролью USER.");
            return;
        }
        String normalizedEmail = email(email);
        if (users.findByEmail(normalizedEmail) != null)
            throw new IllegalStateException("ADMIN_EMAIL уже занят другим пользователем.");
        password(rawPassword);
        UserAccount admin = new UserAccount();
        admin.setUsername(name);
        admin.setEmail(normalizedEmail);
        admin.setPasswordHash(BCrypt.hashpw(rawPassword, BCrypt.gensalt(12)));
        admin.setRole(Role.ADMIN);
        users.save(admin);
    }

    private static String username(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (!value.matches("[a-z][a-z0-9_]{2,29}"))
            throw new ApiException(422, "username", "Имя: 3–30 латинских букв, цифр или _.");
        return value;
    }

    private static String email(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (value.length() > 254 || !value.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))
            throw new ApiException(422, "email", "Некорректная электронная почта.");
        return value;
    }

    private static void password(String value) {
        if (value == null || value.length() < 8
                || value.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ApiException(422, "password", "Пароль должен содержать 8–72 байта.");
    }
}
