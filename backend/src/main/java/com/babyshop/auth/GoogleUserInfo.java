package com.babyshop.auth;

/** Minimal identity extracted from a verified Google ID token. */
public record GoogleUserInfo(String email, String firstName, String lastName) {
}
