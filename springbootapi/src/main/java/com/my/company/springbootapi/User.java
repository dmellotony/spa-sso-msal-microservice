package com.my.company.springbootapi;

public class User {
    private Long userId;
    private String name;
    private String emailAddress;
    private String role;

    public User() {
    }

    public User(Long userId, String name, String emailAddress, String role) {
        this.userId = userId;
        this.name = name;
        this.emailAddress = emailAddress;
        this.role = role;
    }

    // Getters (Required for JSON serialization)
    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmailAddress() {
        return emailAddress;
    }

    public String getRole() {
        return role;
    }
}
