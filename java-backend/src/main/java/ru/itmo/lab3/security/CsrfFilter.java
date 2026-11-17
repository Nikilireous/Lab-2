package ru.itmo.lab3.security;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@Provider
@Priority(Priorities.AUTHORIZATION)
public class CsrfFilter implements ContainerRequestFilter {
    @Inject
    private JwtService jwt;

    @Override
    public void filter(ContainerRequestContext request) {
        String method = request.getMethod();
        if (method.equals("GET") || method.equals("HEAD") || method.equals("QUERY")
                || method.equals("OPTIONS")) return;

        String path = request.getUriInfo().getPath();
        if (path.endsWith("/")) path = path.substring(0, path.length() - 1);
        if (path.endsWith("auth/login") || path.endsWith("auth/register")) return;

        Cookie refresh = request.getCookies().get(AuthCookies.REFRESH);
        if (refresh == null && path.endsWith("auth/logout")) return;
        if (refresh == null && path.endsWith("auth/refresh")) return;

        Cookie csrf = request.getCookies().get(AuthCookies.CSRF);
        String header = request.getHeaderString("X-XSRF-TOKEN");
        if (refresh != null && csrf != null && header != null
                && equal(csrf.getValue(), header)
                && equal(jwt.csrfToken(refresh.getValue()), header)) return;

        request.abortWith(Response.status(403).type(MediaType.APPLICATION_JSON)
            .entity(Map.of("errors", Map.of("detail", "CSRF: нет или неверен заголовок X-XSRF-TOKEN.")))
            .build());
    }

    private static boolean equal(String first, String second) {
        return MessageDigest.isEqual(first.getBytes(StandardCharsets.UTF_8),
            second.getBytes(StandardCharsets.UTF_8));
    }
}
