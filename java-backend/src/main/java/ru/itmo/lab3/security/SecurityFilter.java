package ru.itmo.lab3.security;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import jakarta.ws.rs.ext.Provider;
import java.security.Principal;
import java.util.Map;
import ru.itmo.lab3.api.ApiException;
import ru.itmo.lab3.model.Role;
import ru.itmo.lab3.model.UserAccount;
import ru.itmo.lab3.repository.UserRepository;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class SecurityFilter implements ContainerRequestFilter {
    @Inject
    private JwtService jwt;

    @Inject
    private UserRepository users;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (path.endsWith("/")) path = path.substring(0, path.length() - 1);
        String method = request.getMethod();
        if (method.equals("OPTIONS") || path.endsWith("auth/register")
                || path.endsWith("auth/login") || path.endsWith("auth/refresh")) return;

        try {
            String header = request.getHeaderString("Authorization");
            if (header == null || !header.startsWith("Bearer "))
                throw new ApiException(401, "detail", "Нужен Bearer access-токен.");
            String username = jwt.subject(header.substring(7), "access");
            UserAccount user = users.findByUsername(username);
            if (user == null) throw new ApiException(401, "detail", "Пользователь не найден.");

            boolean reading = method.equals("GET") || method.equals("HEAD") || method.equals("QUERY");
            if (!reading && user.getRole() != Role.ADMIN)
                throw new ApiException(403, "detail", "Изменять студентов может только ADMIN.");

            SecurityContext original = request.getSecurityContext();
            request.setSecurityContext(new SecurityContext() {
                public Principal getUserPrincipal() { return user::getUsername; }
                public boolean isUserInRole(String role) { return user.getRole().name().equals(role); }
                public boolean isSecure() { return original.isSecure(); }
                public String getAuthenticationScheme() { return "Bearer"; }
            });
        } catch (ApiException error) {
            request.abortWith(Response.status(error.getStatus()).type(MediaType.APPLICATION_JSON)
                .entity(Map.of("errors", error.getErrors())).build());
        }
    }
}
