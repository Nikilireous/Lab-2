package ru.itmo.lab3.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.NewCookie;
import ru.itmo.lab3.dto.AuthResponse;

@ApplicationScoped
public class AuthCookies {
    public static final String ACCESS = "lab4_access";
    public static final String REFRESH = "lab4_refresh";
    public static final String CSRF = "XSRF-TOKEN";

    @Inject
    private JwtService jwt;

    private final boolean secure = Boolean.parseBoolean(
        System.getenv().getOrDefault("COOKIE_SECURE", "false"));

    public NewCookie[] issue(AuthResponse tokens) {
        return new NewCookie[] {
            cookie(ACCESS, tokens.accessToken, jwt.accessMaxAgeSeconds(), true),
            cookie(REFRESH, tokens.refreshToken, jwt.refreshMaxAgeSeconds(), true),
            cookie(CSRF, jwt.csrfToken(tokens.refreshToken), jwt.refreshMaxAgeSeconds(), false)
        };
    }

    public NewCookie access(String token) {
        return cookie(ACCESS, token, jwt.accessMaxAgeSeconds(), true);
    }

    public NewCookie[] clear() {
        return new NewCookie[] {
            cookie(ACCESS, "", 0, true),
            cookie(REFRESH, "", 0, true),
            cookie(CSRF, "", 0, false)
        };
    }

    private NewCookie cookie(String name, String value, int maxAge, boolean httpOnly) {
        return new NewCookie.Builder(name).value(value).path("/").maxAge(maxAge)
            .httpOnly(httpOnly).secure(secure).sameSite(NewCookie.SameSite.LAX).build();
    }
}
