package com.hermes.admin.repository;

import com.hermes.admin.entity.SearchProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchProviderRepository extends JpaRepository<SearchProvider, String> {

    List<SearchProvider> findByEnabledTrueOrderByPriorityDesc();

    List<SearchProvider> findByProviderType(String providerType);
}
