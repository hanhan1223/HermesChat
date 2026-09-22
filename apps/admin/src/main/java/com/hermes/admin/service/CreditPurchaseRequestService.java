package com.hermes.admin.service;

import com.hermes.admin.dto.BillingDto;
import com.hermes.admin.entity.CreditPurchaseRequest;
import com.hermes.admin.entity.CreditTransaction;
import com.hermes.admin.entity.User;
import com.hermes.admin.exception.BusinessException;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.CreditPurchaseRequestRepository;
import com.hermes.admin.repository.CreditTransactionRepository;
import com.hermes.admin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 额度购买申请审批服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreditPurchaseRequestService {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";

    private final CreditPurchaseRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final CreditTransactionRepository creditTransactionRepository;

    public Page<BillingDto.PurchaseRequestResponse> list(String status, Pageable pageable) {
        Page<CreditPurchaseRequest> page = (status == null || status.isBlank())
                ? requestRepository.findAllByOrderByCreatedAtDesc(pageable)
                : requestRepository.findByStatusOrderByCreatedAtDesc(status.trim().toUpperCase(), pageable);
        return page.map(this::toResponse);
    }

    public Page<BillingDto.PurchaseRequestResponse> listByUser(String userId, Pageable pageable) {
        return requestRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::toResponse);
    }

    @Transactional
    public BillingDto.PurchaseRequestResponse approve(
            String requestId, BillingDto.ReviewPurchaseRequest review, String adminId) {
        CreditPurchaseRequest req = getRequest(requestId);
        if (!STATUS_PENDING.equalsIgnoreCase(req.getStatus())) {
            throw new BusinessException("该申请已处理，无法重复审批");
        }

        int granted = review != null && review.getGrantedAmount() != null
                ? review.getGrantedAmount()
                : req.getAmount();
        if (granted <= 0) {
            throw new BusinessException("发放额度必须大于 0");
        }

        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在: " + req.getUserId()));

        int newBalance = user.getCredits() + granted;
        user.setCredits(newBalance);
        userRepository.save(user);

        CreditTransaction tx = CreditTransaction.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(user.getId())
                .type(CreditTransaction.TransactionType.REFILL)
                .amount(granted)
                .balanceAfter(newBalance)
                .reason("额度购买申请通过")
                .adminId(adminId)
                .referenceId(req.getId())
                .build();
        creditTransactionRepository.save(tx);

        req.setStatus(STATUS_APPROVED);
        req.setGrantedAmount(granted);
        req.setAdminId(adminId);
        req.setAdminNote(review != null ? review.getAdminNote() : null);
        req.setReviewedAt(LocalDateTime.now());
        requestRepository.save(req);

        log.info("额度购买申请 {} 已通过，用户 {} 到账 {}", requestId, req.getUserId(), granted);
        return toResponse(req);
    }

    @Transactional
    public BillingDto.PurchaseRequestResponse reject(
            String requestId, BillingDto.ReviewPurchaseRequest review, String adminId) {
        CreditPurchaseRequest req = getRequest(requestId);
        if (!STATUS_PENDING.equalsIgnoreCase(req.getStatus())) {
            throw new BusinessException("该申请已处理，无法重复审批");
        }

        req.setStatus(STATUS_REJECTED);
        req.setAdminId(adminId);
        req.setAdminNote(review != null ? review.getAdminNote() : null);
        req.setReviewedAt(LocalDateTime.now());
        requestRepository.save(req);

        log.info("额度购买申请 {} 已拒绝，操作人 {}", requestId, adminId);
        return toResponse(req);
    }

    private CreditPurchaseRequest getRequest(String requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("申请不存在: " + requestId));
    }

    private BillingDto.PurchaseRequestResponse toResponse(CreditPurchaseRequest req) {
        BillingDto.PurchaseRequestResponse resp = new BillingDto.PurchaseRequestResponse();
        resp.setId(req.getId());
        resp.setUserId(req.getUserId());
        resp.setAmount(req.getAmount());
        resp.setNote(req.getNote());
        resp.setContact(req.getContact());
        resp.setStatus(req.getStatus());
        resp.setAdminId(req.getAdminId());
        resp.setAdminNote(req.getAdminNote());
        resp.setGrantedAmount(req.getGrantedAmount());
        resp.setCreatedAt(req.getCreatedAt() != null ? req.getCreatedAt().toString() : null);
        resp.setReviewedAt(req.getReviewedAt() != null ? req.getReviewedAt().toString() : null);

        userRepository.findById(req.getUserId()).ifPresent(u -> {
            resp.setUserEmail(u.getEmail());
            resp.setUserName(u.getName());
        });
        return resp;
    }
}
