package com.hermes.admin.repository;

import com.hermes.admin.entity.CreditPurchaseRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditPurchaseRequestRepository extends JpaRepository<CreditPurchaseRequest, String> {

    Page<CreditPurchaseRequest> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<CreditPurchaseRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<CreditPurchaseRequest> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<CreditPurchaseRequest> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, String status);

    long countByStatus(String status);
}
