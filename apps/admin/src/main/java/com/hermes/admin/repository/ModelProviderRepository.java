package com.hermes.admin.repository;

import com.hermes.admin.entity.ModelProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModelProviderRepository extends JpaRepository<ModelProvider, String> {

    List<ModelProvider> findByEnabledTrue();

    List<ModelProvider> findByProtocolAndEnabledTrue(String protocol);

    List<ModelProvider> findByModelIdAndEnabledTrue(String modelId);
}
