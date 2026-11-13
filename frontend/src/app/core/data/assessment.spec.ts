import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';

describe('Parcours et évaluation (CDC §5.X)', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  /** Répond à toutes les questions, juste ou faux. */
  function answerAll(correct: boolean): void {
    for (const question of service.assessment().quiz) {
      const index = correct ? question.correctIndex : (question.correctIndex + 1) % question.options.length;
      service.answerQuestion(question.id, index);
    }
  }

  describe('catalogue des formats', () => {
    it('expose les sept formats du cahier des charges', () => {
      const formats = service.formats();

      expect(formats).toHaveLength(7);
      for (const format of formats) {
        expect(format.presentation.length).toBeGreaterThan(20);
        expect(format.howItWorks.length).toBeGreaterThan(0);
        expect(format.aiRole.length).toBeGreaterThan(0);
        expect(format.example.length).toBeGreaterThan(10);
      }
    });

    it('couvre chaque format utilisé par les parcours', () => {
      const catalogued = new Set(service.formats().map((format) => format.code));

      for (const course of service.courses()) {
        for (const module of course.modules) {
          expect(catalogued.has(module.format)).toBe(true);
        }
      }
    });
  });

  describe('quiz final', () => {
    it('couvre les quatre types de questions imposés par le CDC', () => {
      const types = new Set(service.assessment().quiz.map((question) => question.type));

      expect(types).toEqual(new Set(['QCM', 'TRUE_FALSE', 'TECHNICAL', 'SCENARIO']));
    });

    it('bloque l’évaluation pratique tant que le seuil de 75 % n’est pas atteint', () => {
      answerAll(false);

      expect(service.quizComplete()).toBe(true);
      expect(service.quizScore()).toBeLessThan(75);
      expect(service.submitQuiz()).toBe(true);
      expect(service.quizPassed()).toBe(false);
      expect(service.goToAssessmentStage('PRACTICAL')).toBe(false);
    });

    it('débloque l’évaluation pratique après un score suffisant', () => {
      answerAll(true);

      const score = service.quizScore();
      expect(service.quizComplete()).toBe(true);
      expect(score).toBe(100);
      expect(service.submitQuiz()).toBe(true);
      expect(service.quizPassed()).toBe(true);
      expect(service.goToAssessmentStage('PRACTICAL')).toBe(true);
    });
  });

  describe('évaluation pratique et certification', () => {
    function passQuiz(): void {
      answerAll(true);
      service.submitQuiz();
    }

    it('refuse le certificat avant la soumission pratique', () => {
      passQuiz();

      expect(service.practicalPassed()).toBe(false);
      expect(service.certificateEligible()).toBe(false);
      expect(service.goToAssessmentStage('FEEDBACK')).toBe(false);
    });

    it('délivre un certificat interne avec les critères validés', () => {
      passQuiz();
      service.submitPractical('Dockerfile et commandes de build soumis pour vérification.');

      const before = service.certificates().length;
      expect(service.practicalPassed()).toBe(true);
      expect(service.certificateEligible()).toBe(true);

      expect(service.goToAssessmentStage('CERTIFICATE')).toBe(true);
      expect(service.certificates()).toHaveLength(before + 1);

      const [certificate] = service.certificates();
      expect(certificate.courseId).toBe(service.assessment().courseId);
      expect(certificate.score).toBe(100);
      expect(certificate.practicalPassed).toBe(true);
      expect(certificate.criteria?.length).toBeGreaterThan(1);
    });

    it('ne délivre qu’un seul certificat par session', () => {
      passQuiz();
      service.submitPractical('Dockerfile et commandes de build soumis pour vérification.');

      service.goToAssessmentStage('CERTIFICATE');
      const afterFirst = service.certificates().length;
      service.goToAssessmentStage('QUIZ');
      service.goToAssessmentStage('CERTIFICATE');

      expect(service.certificates()).toHaveLength(afterFirst);
    });
  });

  describe('navigation dans le processus', () => {
    it('verrouille les étapes suivantes avant le quiz', () => {
      const stages = service.assessmentStages();

      expect(stages[0].status).toBe('CURRENT');
      expect(stages[1].status).toBe('LOCKED');
      expect(stages[5].status).toBe('LOCKED');
    });

    it('réinitialise le quiz et les résultats', () => {
      answerAll(true);
      service.submitQuiz();
      service.submitPractical('Dockerfile et commandes de build soumis pour vérification.');

      service.retryQuiz();

      expect(service.answeredCount()).toBe(0);
      expect(service.quizSubmitted()).toBe(false);
      expect(service.practicalSubmitted()).toBe(false);
      expect(service.assessmentStage()).toBe('QUIZ');
    });
  });
});
