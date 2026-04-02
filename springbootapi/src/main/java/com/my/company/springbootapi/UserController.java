package com.my.company.springbootapi;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    private final Map<String, User> users = Map.of(
            "liam@dmellotonyhotmail.onmicrosoft.com",
            new User(1L, "Liam Dmello", "liam@dmellotonyhotmail.onmicrosoft.com", "Development Lead"),
            "leah@dmellotonyhotmail.onmicrosoft.com",
            new User(2L, "Leah Dmello", "leah@dmellotonyhotmail.onmicrosoft.com", "Marketing Lead"),
            "tony@dmellotonyhotmail.onmicrosoft.com",
            new User(3L, "Tony Dmello", "tony@dmellotonyhotmail.onmicrosoft.com", "Director"));

    @GetMapping("/users")
    public ResponseEntity<?> getUser(@AuthenticationPrincipal Jwt jwt) {
        // Simulating a database lookup
        String email = jwt.getClaim("unique_name");
        User user = users.get(email);
        if (user == null) {
            return ResponseEntity
                    .status(404)
                    .body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(user);
    }
}
