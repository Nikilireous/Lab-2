package ru.itmo.lab3.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import ru.itmo.lab3.dto.StudentDto;
import ru.itmo.lab3.repository.StudentRepository;
import ru.itmo.lab3.service.StudentService;

@Path("/students")
@Produces(MediaType.APPLICATION_JSON)
public class StudentResource {
    @Inject
    private StudentService service;

    @GET
    public Response list(@Context UriInfo uriInfo) {
        Map<String, String> filters = new HashMap<>();
        uriInfo.getQueryParameters().forEach((key, values) -> {
            if (!values.isEmpty()) filters.put(key, values.get(0));
        });
        return listResponse(filters);
    }

    @QUERY
    @Consumes(MediaType.APPLICATION_JSON)
    public Response query(Map<String, Object> body) {
        Map<String, String> filters = new HashMap<>();
        if (body != null) body.forEach((key, value) -> {
            if (value != null) filters.put(key, value.toString());
        });
        return listResponse(filters);
    }

    private Response listResponse(Map<String, String> filters) {
        StudentRepository.SearchResult result = service.search(filters);
        List<StudentDto> students = result.students().stream().map(StudentDto::from).toList();
        return Response.ok(students).header("X-Total-Count", result.total())
            .header("X-Page", filters.getOrDefault("page", "1"))
            .header("X-Page-Size", filters.getOrDefault("size", String.valueOf(students.size())))
            .build();
    }

    @GET
    @Path("/{isuId}")
    public StudentDto get(@PathParam("isuId") String isuId) {
        return StudentDto.from(service.find(isuId));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(StudentDto input, @Context UriInfo uriInfo) {
        StudentDto student = StudentDto.from(service.create(input));
        return Response.created(uriInfo.getAbsolutePathBuilder().path(student.isuId).build())
            .entity(student).build();
    }

    @PUT
    @Path("/{isuId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public StudentDto replace(@PathParam("isuId") String isuId, StudentDto input) {
        return StudentDto.from(service.update(isuId, input, true));
    }

    @PATCH
    @Path("/{isuId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public StudentDto patch(@PathParam("isuId") String isuId, StudentDto input) {
        return StudentDto.from(service.update(isuId, input, false));
    }

    @DELETE
    @Path("/{isuId}")
    public Response delete(@PathParam("isuId") String isuId) {
        service.delete(isuId);
        return Response.noContent().build();
    }
}
