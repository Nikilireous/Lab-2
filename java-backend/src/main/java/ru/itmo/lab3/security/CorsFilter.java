package ru.itmo.lab3.security;

import jakarta.annotation.Priority;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Provider
@Priority(500)
public class CorsFilter implements ContainerRequestFilter, ContainerResponseFilter {
    private final Set<String> allowed = Arrays.stream(System.getenv()
            .getOrDefault("CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500")
            .split(","))
        .map(String::trim).collect(Collectors.toSet());

    @Override
    public void filter(ContainerRequestContext request) {
        if (request.getMethod().equals("OPTIONS")) request.abortWith(Response.ok().build());
    }

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        String origin = request.getHeaderString("Origin");
        if (origin != null && allowed.contains(origin)) {
            response.getHeaders().putSingle("Access-Control-Allow-Origin", origin);
            response.getHeaders().putSingle("Vary", "Origin");
            response.getHeaders().putSingle("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, QUERY, OPTIONS");
            response.getHeaders().putSingle("Access-Control-Allow-Headers", "Authorization, Content-Type");
            response.getHeaders().putSingle("Access-Control-Expose-Headers", "X-Total-Count, X-Page, X-Page-Size");
        }
    }
}
