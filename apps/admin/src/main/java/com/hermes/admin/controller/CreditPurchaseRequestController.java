package com.hermes.admin.controller;

import com.hermes.admin.dto.BillingDto;
import com.hermes.admin.entity.CreditPurchaseRequest;
import com.hermes.admin.service.CreditPurchaseRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 额度购买申请审批 API
 */
@RestController
@RequestMapping("/purchase-requests")
@RequiredArgsConstructor
public class CreditPurchaseRequestController {

    private final CreditPurchaseRequestService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<BillingDto.PurchaseRequestResponse> list(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return service.list(status, pageable);
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<BillingDto.PurchaseRequestResponse> listByUser(
            @PathVariable String userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return service.listByUser(userId, pageable);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public BillingDto.PurchaseRequestResponse approve(
            @PathVariable String id,
            @Valid @RequestBody(required = false) BillingDto.ReviewPurchaseRequest request,
            @AuthenticationPrincipal String adminId) {
        return service.approve(id, request != null ? request : new BillingDto.ReviewPurchaseRequest(), adminId);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public BillingDto.PurchaseRequestResponse reject(
            @PathVariable String id,
            @Valid @RequestBody(required = false) BillingDto.ReviewPurchaseRequest request,
            @AuthenticationPrincipal String adminId) {
        return service.reject(id, request != null ? request : new BillingDto.ReviewPurchaseRequest(), adminId);
    }
}
