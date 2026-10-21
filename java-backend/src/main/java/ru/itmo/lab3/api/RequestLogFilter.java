package ru.itmo.lab3.api;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;
import java.util.logging.Logger;

@Provider
public class RequestLogFilter implements ContainerResponseFilter {
    private static final Logger LOG = Logger.getLogger(RequestLogFilter.class.getName());

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        LOG.info(() -> request.getMethod() + " " + request.getUriInfo().getPath()
            + " -> " + response.getStatus());
    }
}
