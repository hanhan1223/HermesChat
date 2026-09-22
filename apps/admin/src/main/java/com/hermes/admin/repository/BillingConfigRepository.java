package com.hermes.admin.repository;

import com.hermes.admin.entity.BillingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BillingConfigRepository extends JpaRepository<BillingConfig, String> {
}
