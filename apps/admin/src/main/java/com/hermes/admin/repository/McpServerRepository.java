package com.hermes.admin.repository;

import com.hermes.admin.entity.McpServer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface McpServerRepository extends JpaRepository<McpServer, String> {

    Page<McpServer> findByUserId(String userId, Pageable pageable);

    List<McpServer> findByStatus(String status);

    long countByStatus(String status);
}
