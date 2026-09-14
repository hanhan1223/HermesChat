package com.hermes.admin.repository;

import com.hermes.admin.entity.Skill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String> {

    Page<Skill> findByUserId(String userId, Pageable pageable);

    long countByIsPublicTrue();

    @Query("SELECT s FROM Skill s WHERE " +
           "(:keyword IS NULL OR s.name LIKE %:keyword%)")
    Page<Skill> search(@Param("keyword") String keyword, Pageable pageable);
}
