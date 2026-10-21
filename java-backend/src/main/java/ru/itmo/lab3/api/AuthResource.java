package ru.itmo.lab3.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
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
import ru.itmo.lab3.dto.RefreshRequest;
import ru.itmo.lab3.dto.RegisterRequest;
import ru.itmo.lab3.dto.UserDto;
import ru.itmo.lab3.service.AuthService;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject
    private AuthService service;

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response register(RegisterRequest request) {
        AuthResponse response = service.register(request);
        return Response.status(201).entity(response).build();
    }

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    public AuthResponse login(LoginRequest request) {
        return service.login(request);
    }

    @POST
    @Path("/refresh")
    @Consumes(MediaType.APPLICATION_JSON)
    public AuthResponse refresh(RefreshRequest request) {
        return service.refresh(request);
    }

    @GET
    @Path("/me")
    public UserDto me(@Context SecurityContext security) {
        return UserDto.from(service.currentUser(security.getUserPrincipal().getName()));
    }
}
