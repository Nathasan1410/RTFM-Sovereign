import { RubricSystem, RubricConfig } from '../../judging/rubric/RubricSystem';
import { JudgingResult } from '../../judging/schemas';
import * as z from 'zod';

describe('RubricSystem', () => {
  describe('DEFAULT_RUBRIC', () => {
    it('should have correct default weights', () => {
      expect(RubricSystem.DEFAULT_RUBRIC.functionality_weight).toBe(0.4);
      expect(RubricSystem.DEFAULT_RUBRIC.quality_weight).toBe(0.3);
      expect(RubricSystem.DEFAULT_RUBRIC.best_practices_weight).toBe(0.2);
      expect(RubricSystem.DEFAULT_RUBRIC.innovation_weight).toBe(0.1);
    });

    it('should sum to approximately 1.0', () => {
      const total = 
        RubricSystem.DEFAULT_RUBRIC.functionality_weight +
        RubricSystem.DEFAULT_RUBRIC.quality_weight +
        RubricSystem.DEFAULT_RUBRIC.best_practices_weight +
        RubricSystem.DEFAULT_RUBRIC.innovation_weight;
      
      expect(total).toBeCloseTo(1.0, 5);
    });
  });

  describe('STRICT_RUBRIC', () => {
    it('should emphasize functionality and quality', () => {
      expect(RubricSystem.STRICT_RUBRIC.functionality_weight).toBe(0.5);
      expect(RubricSystem.STRICT_RUBRIC.quality_weight).toBe(0.3);
      expect(RubricSystem.STRICT_RUBRIC.best_practices_weight).toBe(0.15);
      expect(RubricSystem.STRICT_RUBRIC.innovation_weight).toBe(0.05);
    });

    it('should sum to 1.0', () => {
      const total = 
        RubricSystem.STRICT_RUBRIC.functionality_weight +
        RubricSystem.STRICT_RUBRIC.quality_weight +
        RubricSystem.STRICT_RUBRIC.best_practices_weight +
        RubricSystem.STRICT_RUBRIC.innovation_weight;
      
      expect(total).toBe(1.0);
    });
  });

  describe('CREATIVE_RUBRIC', () => {
    it('should emphasize innovation and best practices', () => {
      expect(RubricSystem.CREATIVE_RUBRIC.functionality_weight).toBe(0.3);
      expect(RubricSystem.CREATIVE_RUBRIC.quality_weight).toBe(0.25);
      expect(RubricSystem.CREATIVE_RUBRIC.best_practices_weight).toBe(0.25);
      expect(RubricSystem.CREATIVE_RUBRIC.innovation_weight).toBe(0.2);
    });

    it('should sum to 1.0', () => {
      const total = 
        RubricSystem.CREATIVE_RUBRIC.functionality_weight +
        RubricSystem.CREATIVE_RUBRIC.quality_weight +
        RubricSystem.CREATIVE_RUBRIC.best_practices_weight +
        RubricSystem.CREATIVE_RUBRIC.innovation_weight;
      
      expect(total).toBe(1.0);
    });
  });

  describe('createRubric', () => {
    it('should create rubric with provided weights', () => {
      const config: RubricConfig = {
        functionality_weight: 0.5,
        quality_weight: 0.3,
        best_practices_weight: 0.15,
        innovation_weight: 0.05
      };

      const rubric = RubricSystem.createRubric(config);

      expect(rubric.functionality_weight).toBe(0.5);
      expect(rubric.quality_weight).toBe(0.3);
      expect(rubric.best_practices_weight).toBe(0.15);
      expect(rubric.innovation_weight).toBe(0.05);
    });

    it('should use default weights for undefined values', () => {
      const config: RubricConfig = {
        functionality_weight: 0.5
      };

      const rubric = RubricSystem.createRubric(config);

      expect(rubric.functionality_weight).toBe(0.5);
      expect(rubric.quality_weight).toBe(0.3);
      expect(rubric.best_practices_weight).toBe(0.2);
      expect(rubric.innovation_weight).toBe(0.1);
    });

    it('should use all default weights when config is empty', () => {
      const config: RubricConfig = {};
      const rubric = RubricSystem.createRubric(config);

      expect(rubric).toEqual(RubricSystem.DEFAULT_RUBRIC);
    });
  });

  describe('validateRubric', () => {
    it('should return true for valid rubric (sum = 1.0)', () => {
      const valid = RubricSystem.validateRubric(RubricSystem.DEFAULT_RUBRIC);
      expect(valid).toBe(true);
    });

    it('should return true for rubric with slight floating point variance', () => {
      const rubric = {
        functionality_weight: 0.333,
        quality_weight: 0.333,
        best_practices_weight: 0.334,
        innovation_weight: 0.0
      };

      const valid = RubricSystem.validateRubric(rubric);
      expect(valid).toBe(true);
    });

    it('should return false for invalid rubric (sum != 1.0)', () => {
      const invalidRubric = {
        functionality_weight: 0.5,
        quality_weight: 0.3,
        best_practices_weight: 0.3,
        innovation_weight: 0.0
      };

      const valid = RubricSystem.validateRubric(invalidRubric);
      expect(valid).toBe(false);
    });

    it('should return false for rubric summing to > 1.0', () => {
      const invalidRubric = {
        functionality_weight: 0.4,
        quality_weight: 0.4,
        best_practices_weight: 0.3,
        innovation_weight: 0.1
      };

      const valid = RubricSystem.validateRubric(invalidRubric);
      expect(valid).toBe(false);
    });

    it('should return false for rubric summing to < 1.0', () => {
      const invalidRubric = {
        functionality_weight: 0.3,
        quality_weight: 0.2,
        best_practices_weight: 0.2,
        innovation_weight: 0.1
      };

      const valid = RubricSystem.validateRubric(invalidRubric);
      expect(valid).toBe(false);
    });
  });

  describe('getCriteria', () => {
    it('should return 4 criteria', () => {
      const criteria = RubricSystem.getCriteria(RubricSystem.DEFAULT_RUBRIC);
      expect(criteria).toHaveLength(4);
    });

    it('should have correct criterion names', () => {
      const criteria = RubricSystem.getCriteria(RubricSystem.DEFAULT_RUBRIC);
      const names = criteria.map(c => c.name);
      expect(names).toEqual(['Functionality', 'Code Quality', 'Best Practices', 'Innovation']);
    });

    it('should match weights from rubric', () => {
      const criteria = RubricSystem.getCriteria(RubricSystem.DEFAULT_RUBRIC);
      expect(criteria[0].weight).toBe(0.4);
      expect(criteria[1].weight).toBe(0.3);
      expect(criteria[2].weight).toBe(0.2);
      expect(criteria[3].weight).toBe(0.1);
    });

    it('should include checklist items for each criterion', () => {
      const criteria = RubricSystem.getCriteria(RubricSystem.DEFAULT_RUBRIC);
      criteria.forEach(criterion => {
        expect(criterion.checklist).toBeDefined();
        expect(criterion.checklist.length).toBeGreaterThan(0);
      });
    });

    it('should include description for each criterion', () => {
      const criteria = RubricSystem.getCriteria(RubricSystem.DEFAULT_RUBRIC);
      criteria.forEach(criterion => {
        expect(criterion.description).toBeDefined();
        expect(criterion.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('calculatePassingThreshold', () => {
    it('should return 60 for creative rubric (innovation > 0.15)', () => {
      const threshold = RubricSystem.calculatePassingThreshold(RubricSystem.CREATIVE_RUBRIC);
      expect(threshold).toBe(60);
    });

    it('should return 85 for strict rubric (functionality > 0.45)', () => {
      const threshold = RubricSystem.calculatePassingThreshold(RubricSystem.STRICT_RUBRIC);
      expect(threshold).toBe(85);
    });

    it('should return 70 for default rubric', () => {
      const threshold = RubricSystem.calculatePassingThreshold(RubricSystem.DEFAULT_RUBRIC);
      expect(threshold).toBe(70);
    });

    it('should return 60 for high innovation rubric', () => {
      const rubric = {
        functionality_weight: 0.25,
        quality_weight: 0.25,
        best_practices_weight: 0.25,
        innovation_weight: 0.25
      };

      const threshold = RubricSystem.calculatePassingThreshold(rubric);
      expect(threshold).toBe(60);
    });
  });

  describe('generateRubricReport', () => {
    it('should generate report with all sections', () => {
      const mockResult: JudgingResult = {
        session_id: 'test-session',
        milestone_id: 1,
        passed: true,
        overall_score: 85,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 10,
          ast_hash: 'abc123'
        },
        layer2_result: {
          functionality_score: 90,
          quality_score: 85,
          best_practices_score: 80,
          innovation_score: 75,
          weighted_score: 85,
          feedback: 'Good work overall.',
          suggestions: ['Add more comments', 'Consider error handling']
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        cached: false
      };

      const report = RubricSystem.generateRubricReport(mockResult, RubricSystem.DEFAULT_RUBRIC);

      expect(report).toContain('RUBRIC EVALUATION REPORT');
      expect(report).toContain('Overall Score: 85/100');
      expect(report).toContain('PASSED');
      expect(report).toContain('DETAILED SCORES');
      expect(report).toContain('FEEDBACK');
      expect(report).toContain('SUGGESTIONS');
    });

    it('should show FAILED status for scores below threshold', () => {
      const mockResult: JudgingResult = {
        session_id: 'test-session',
        milestone_id: 1,
        passed: false,
        overall_score: 65,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 10,
          ast_hash: 'abc123'
        },
        layer2_result: {
          functionality_score: 60,
          quality_score: 65,
          best_practices_score: 70,
          innovation_score: 60,
          weighted_score: 65,
          feedback: 'Needs improvement.',
          suggestions: []
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        cached: false
      };

      const report = RubricSystem.generateRubricReport(mockResult, RubricSystem.DEFAULT_RUBRIC);

      expect(report).toContain('FAILED');
      expect(report).toContain('(Threshold: 70)');
    });

    it('should include individual scores with weights', () => {
      const mockResult: JudgingResult = {
        session_id: 'test-session',
        milestone_id: 1,
        passed: true,
        overall_score: 80,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 10,
          ast_hash: 'abc123'
        },
        layer2_result: {
          functionality_score: 85,
          quality_score: 80,
          best_practices_score: 75,
          innovation_score: 70,
          weighted_score: 80,
          feedback: 'Good.',
          suggestions: []
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        cached: false
      };

      const report = RubricSystem.generateRubricReport(mockResult, RubricSystem.DEFAULT_RUBRIC);

      expect(report).toContain('Functionality: 85/100 (Weight: 40%)');
      expect(report).toContain('Quality: 80/100 (Weight: 30%)');
      expect(report).toContain('Best Practices: 75/100 (Weight: 20%)');
      expect(report).toContain('Innovation: 70/100 (Weight: 10%)');
    });

    it('should omit suggestions section when empty', () => {
      const mockResult: JudgingResult = {
        session_id: 'test-session',
        milestone_id: 1,
        passed: true,
        overall_score: 80,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 10,
          ast_hash: 'abc123'
        },
        layer2_result: {
          functionality_score: 80,
          quality_score: 80,
          best_practices_score: 80,
          innovation_score: 80,
          weighted_score: 80,
          feedback: 'Excellent work.',
          suggestions: []
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        cached: false
      };

      const report = RubricSystem.generateRubricReport(mockResult, RubricSystem.DEFAULT_RUBRIC);

      expect(report).not.toContain('SUGGESTIONS');
    });

    it('should list suggestions with numbering', () => {
      const mockResult: JudgingResult = {
        session_id: 'test-session',
        milestone_id: 1,
        passed: true,
        overall_score: 80,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 10,
          ast_hash: 'abc123'
        },
        layer2_result: {
          functionality_score: 80,
          quality_score: 80,
          best_practices_score: 80,
          innovation_score: 80,
          weighted_score: 80,
          feedback: 'Good.',
          suggestions: ['First suggestion', 'Second suggestion', 'Third suggestion']
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        cached: false
      };

      const report = RubricSystem.generateRubricReport(mockResult, RubricSystem.DEFAULT_RUBRIC);

      expect(report).toContain('1. First suggestion');
      expect(report).toContain('2. Second suggestion');
      expect(report).toContain('3. Third suggestion');
    });
  });

  describe('adaptRubricForDifficulty', () => {
    it('should set innovation to 0 for beginner difficulty', () => {
      const adapted = RubricSystem.adaptRubricForDifficulty(
        RubricSystem.DEFAULT_RUBRIC,
        'beginner'
      );

      expect(adapted.functionality_weight).toBe(0.5);
      expect(adapted.quality_weight).toBe(0.3);
      expect(adapted.best_practices_weight).toBe(0.2);
      expect(adapted.innovation_weight).toBe(0.0);
    });

    it('should keep default weights for intermediate difficulty', () => {
      const adapted = RubricSystem.adaptRubricForDifficulty(
        RubricSystem.DEFAULT_RUBRIC,
        'intermediate'
      );

      expect(adapted.functionality_weight).toBe(0.4);
      expect(adapted.quality_weight).toBe(0.3);
      expect(adapted.best_practices_weight).toBe(0.2);
      expect(adapted.innovation_weight).toBe(0.1);
    });

    it('should emphasize innovation for advanced difficulty', () => {
      const adapted = RubricSystem.adaptRubricForDifficulty(
        RubricSystem.DEFAULT_RUBRIC,
        'advanced'
      );

      expect(adapted.functionality_weight).toBe(0.35);
      expect(adapted.quality_weight).toBe(0.25);
      expect(adapted.best_practices_weight).toBe(0.2);
      expect(adapted.innovation_weight).toBe(0.2);
    });

    it('should create new rubric object without modifying original', () => {
      const original = { ...RubricSystem.DEFAULT_RUBRIC };
      const adapted = RubricSystem.adaptRubricForDifficulty(original, 'beginner');

      expect(original.innovation_weight).toBe(0.1);
      expect(adapted.innovation_weight).toBe(0.0);
    });
  });
});
