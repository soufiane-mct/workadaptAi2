import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../core/data/data.service';
import { AssessmentStageCode, FORMAT_LABELS, QUIZ_TYPE_LABELS } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-employee-assessment',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    PageHeader,
  ],
  templateUrl: './assessment.html',
  styleUrl: './assessment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeAssessment {
  private readonly data = inject(DataService);
  private readonly snack = inject(MatSnackBar);

  readonly assessment = this.data.assessment;
  readonly stages = this.data.assessmentStages;
  readonly current = this.data.assessmentStage;
  readonly answers = this.data.answers;
  readonly quizScore = this.data.quizScore;
  readonly quizSubmitted = this.data.quizSubmitted;
  readonly quizPassed = this.data.quizPassed;
  readonly answeredCount = this.data.answeredCount;
  readonly quizTotal = this.data.quizTotal;
  readonly practicalSubmitted = this.data.practicalSubmitted;
  readonly report = this.data.assessmentReport;
  readonly certificateEligible = this.data.certificateEligible;
  readonly activeCourse = this.data.activeCourse;
  readonly typeLabels = QUIZ_TYPE_LABELS;
  readonly formatLabels = FORMAT_LABELS;

  readonly practicalDraft = signal(this.data.practicalSubmission());
  readonly myCertificate = computed(
    () =>
      this.data
        .certificates()
        .find((certificate) => certificate.courseId === this.assessment().courseId) ?? null,
  );

  readonly passScore = computed(() => this.assessment().passScore);

  readonly canSubmitPractical = computed(() => this.practicalDraft().trim().length >= 20);

  readonly quizProgress = computed(() =>
    this.quizTotal() === 0 ? 0 : Math.round((this.answeredCount() / this.quizTotal()) * 100),
  );

  answer(questionId: string, optionIndex: number): void {
    this.data.answerQuestion(questionId, optionIndex);
  }

  submitQuiz(): void {
    if (this.data.submitQuiz()) {
      const passed = this.quizScore() >= this.passScore();
      this.snack.open(
        passed
          ? `Quiz soumis : ${this.quizScore()} % — seuil de ${this.passScore()} % atteint.`
          : `Quiz soumis : ${this.quizScore()} % — seuil de ${this.passScore()} % non atteint.`,
        'Fermer',
        { duration: 5000 },
      );
    }
  }

  retryQuiz(): void {
    this.data.retryQuiz();
    this.snack.open('Quiz réinitialisé. Vous pouvez reprendre les questions.', 'Fermer', {
      duration: 4000,
    });
  }

  submitPractical(): void {
    if (!this.canSubmitPractical()) {
      return;
    }
    this.data.submitPractical(this.practicalDraft());
    this.snack.open('Travail soumis. Les critères automatiques ont été vérifiés.', 'Fermer', {
      duration: 5000,
    });
  }

  goTo(code: AssessmentStageCode): void {
    this.data.goToAssessmentStage(code);
  }

  isCorrect(questionId: string, optionIndex: number): boolean {
    const question = this.assessment().quiz.find((item) => item.id === questionId);
    return question?.correctIndex === optionIndex;
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  plan(title: string): void {
    this.snack.open(
      `« ${title} » ajouté à vos recommandations. Une validation du superviseur reste requise.`,
      'Fermer',
      { duration: 5000 },
    );
  }
}
