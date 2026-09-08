package com.hermes.admin.repository;

import com.hermes.admin.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, String> {

    Optional<UserSubscription> findByUserIdAndStatus(String userId, UserSubscription.SubscriptionStatus status);

    List<UserSubscription> findByUserId(String userId);

    List<UserSubscription> findByEndDateBeforeAndStatus(LocalDateTime now, UserSubscription.SubscriptionStatus status);

    @Query("SELECT COUNT(us) FROM UserSubscription us WHERE us.status = 'ACTIVE'")
    long countActiveSubscriptions();

    @Query("SELECT COUNT(us) FROM UserSubscription us WHERE us.planId = :planId AND us.status = 'ACTIVE'")
    long countByPlanId(String planId);
}