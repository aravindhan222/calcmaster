package com.calcmaster.repository;

import com.calcmaster.entity.CalculationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoryRepository extends JpaRepository<CalculationHistory, Long> {

    List<CalculationHistory> findAllByOrderByTimestampDesc();

    List<CalculationHistory> findByTypeOrderByTimestampDesc(String type);
}
