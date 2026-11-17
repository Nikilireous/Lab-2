package ru.itmo.lab3.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import ru.itmo.lab3.dto.AuthResponse;
import ru.itmo.lab3.dto.LoginRequest;
import ru.itmo.lab3.dto.RegisterRequest;
import ru.itmo.lab3.dto.UserDto;
import ru.itmo.lab3.service.AuthService;
import ru.itmo.lab3.security.AuthCookies;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject
    private AuthService service;

    @Inject
    private AuthCookies cookies;

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response register(RegisterRequest request) {
        AuthResponse response = service.register(request);
        return Response.status(201).entity(response.user).cookie(cookies.issue(response)).build();
    }

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response login(LoginRequest request) {
        AuthResponse response = service.login(request);
        return Response.ok(response.user).cookie(cookies.issue(response)).build();
    }

    @POST
    @Path("/refresh")
    public Response refresh(@CookieParam(AuthCookies.REFRESH) String refreshToken) {
        String access = service.refresh(refreshToken);
        return Response.noContent().cookie(cookies.access(access)).build();
    }

    @POST
    @Path("/logout")
    public Response logout(@CookieParam(AuthCookies.REFRESH) String refreshToken) {
        service.logout(refreshToken);
        return Response.noContent().cookie(cookies.clear()).build();
    }

    @GET
    @Path("/me")
    public UserDto me(@Context SecurityContext security) {
        return UserDto.from(service.currentUser(security.getUserPrincipal().getName()));
    }
}
