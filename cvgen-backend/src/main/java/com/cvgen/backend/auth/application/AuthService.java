package com.cvgen.backend.auth.application;

import com.cvgen.backend.auth.api.dto.AuthResponse;
import com.cvgen.backend.auth.api.dto.LoginRequest;
import com.cvgen.backend.auth.api.dto.RegisterRequest;
import com.cvgen.backend.auth.infrastructure.persistence.RefreshTokenJpaRepository;
import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.auth.infrastructure.persistence.entity.RefreshTokenEntity;
import com.cvgen.backend.auth.infrastructure.persistence.entity.RoleEntity;
import com.cvgen.backend.auth.infrastructure.persistence.entity.UserEntity;
import com.cvgen.backend.auth.infrastructure.security.JwtService;
import com.cvgen.backend.shared.config.JwtProperties;
import com.cvgen.backend.shared.exception.EmailAlreadyExistsException;
import com.cvgen.backend.shared.exception.InvalidTokenException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

/**
 * Cas d'usage d'authentification : inscription, connexion, refresh.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserJpaRepository userRepository;
    private final RefreshTokenJpaRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    // -------------------------------------------------
    // Inscription
    // -------------------------------------------------
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        UserEntity user = UserEntity.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(RoleEntity.ROLE_USER)
                .enabled(true)
                .build();

        UserEntity saved = userRepository.save(user);

        UserDetails userDetails = toUserDetails(saved);
        return issueTokens(saved, userDetails);
    }

    // -------------------------------------------------
    // Connexion
    // -------------------------------------------------
    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Authentification déléguée à Spring Security
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserEntity user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new InvalidTokenException("Utilisateur introuvable"));

        // Révocation des anciens refresh tokens
        refreshTokenRepository.revokeAllByUser(user);

        UserDetails userDetails = toUserDetails(user);
        return issueTokens(user, userDetails);
    }

    // -------------------------------------------------
    // Rafraîchissement de l'access token
    // -------------------------------------------------
    @Transactional
    public AuthResponse refreshToken(String refreshToken) {
        RefreshTokenEntity stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new InvalidTokenException("Refresh token introuvable"));

        if (stored.isRevoked()) {
            throw new InvalidTokenException("Refresh token révoqué");
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("Refresh token expiré");
        }
        if (jwtService.isTokenExpired(refreshToken)) {
            throw new InvalidTokenException("Refresh token expiré");
        }

        UserEntity user = stored.getUser();
        UserDetails userDetails = toUserDetails(user);

        String newAccessToken = jwtService.generateAccessToken(userDetails);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.accessTokenExpiration() / 1000)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    // -------------------------------------------------
    // Helpers
    // -------------------------------------------------
    private AuthResponse issueTokens(UserEntity user, UserDetails userDetails) {
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        RefreshTokenEntity refreshEntity = RefreshTokenEntity.builder()
                .token(refreshToken)
                .user(user)
                .expiresAt(LocalDateTime.now().plusSeconds(
                        jwtProperties.refreshTokenExpiration() / 1000))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.accessTokenExpiration() / 1000)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    private UserDetails toUserDetails(UserEntity user) {
        return User.withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(Collections.singletonList(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                user.getRole().name())))
                .disabled(!user.isEnabled())
                .build();
    }
}
