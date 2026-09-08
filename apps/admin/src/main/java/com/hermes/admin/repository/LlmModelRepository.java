package com.hermes.admin.repository;

import com.hermes.admin.entity.LlmModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LlmModelRepository extends JpaRepository<LlmModel, String> {

    List<LlmModel> findByEnabledTrueOrderByPriorityDesc();

    List<LlmModel> findByProviderAndEnabledTrue(String provider);
}