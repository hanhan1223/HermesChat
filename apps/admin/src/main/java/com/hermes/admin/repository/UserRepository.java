package com.hermes.admin.repository;

import com.hermes.admin.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByStatus(User.UserStatus status, Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
           "(:keyword IS NULL OR u.email LIKE %:keyword% OR u.name LIKE %:keyword%) AND " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:status IS NULL OR u.status = :status)")
    Page<User> searchUsers(@Param("keyword") String keyword,
                          @Param("role") User.Role role,
                          @Param("status") User.UserStatus status,
                          Pageable pageable);

    @Query("SELECT COALESCE(SUM(u.credits), 0) FROM User u WHERE u.status = 'ACTIVE'")
    Long sumActiveUserCredits();

    long countByCreatedAtAfter(LocalDateTime date);

    long countByStatus(User.UserStatus status);
}