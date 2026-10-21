package ru.itmo.lab3.service;

import jakarta.annotation.PostConstruct;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;
import jakarta.inject.Inject;
import java.util.logging.Logger;

@Singleton
@Startup
public class AdminBootstrap {
    private static final Logger LOG = Logger.getLogger(AdminBootstrap.class.getName());

    @Inject
    private AuthService auth;

    @PostConstruct
    void initialize() {
        String username = System.getenv("ADMIN_USERNAME");
        String email = System.getenv("ADMIN_EMAIL");
        String password = System.getenv("ADMIN_PASSWORD");
        if (username == null || email == null || password == null) {
            LOG.warning("ADMIN_USERNAME, ADMIN_EMAIL и ADMIN_PASSWORD не заданы: администратор не создан.");
            return;
        }
        auth.ensureAdmin(username, email, password);
        LOG.info("Администратор проверен при запуске приложения.");
    }
}
