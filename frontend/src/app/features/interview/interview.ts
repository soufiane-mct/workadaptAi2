import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { InterviewMessage } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

interface Question {
  text: string;
  topic: string;
}

const QUESTIONS: Question[] = [
  {
    topic: 'Docker',
    text: 'Vous utilisez Docker régulièrement. Sur quels aspects vous sentez-vous le moins à l’aise : écrire un Dockerfile, gérer les volumes, ou diagnostiquer un conteneur qui ne démarre pas ?',
  },
  {
    topic: 'CI/CD',
    text: 'Avez-vous déjà mis en place un pipeline d’intégration continue, ou seulement utilisé un pipeline existant ?',
  },
  {
    topic: 'Objectifs',
    text: 'Quel objectif professionnel aimeriez-vous atteindre dans les six prochains mois ?',
  },
  {
    topic: 'Difficultés',
    text: 'Quelle difficulté rencontrez-vous le plus souvent dans votre travail actuel ?',
  },
];

const ANSWERS = [
  'Merci. J’enregistre votre réponse et j’ajuste l’estimation : cela confirme un niveau intermédiaire en pratique, avec un besoin de consolidation sur le diagnostic.',
  'Noté. Ces informations complètent les données observées sur le poste. Elles restent marquées comme « déclarées » dans votre profil.',
  'Très bien. Votre objectif sera pris en compte par l’Agent Learning Planner pour prioriser les parcours.',
];

@Component({
  selector: 'wa-interview',
  imports: [DatePipe, FormsModule, MatButtonModule, PageHeader],
  templateUrl: './interview.html',
  styleUrl: './interview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Interview {
  readonly questions = QUESTIONS;
  readonly step = signal(0);
  readonly draft = signal('');
  readonly finished = signal(false);

  private readonly initial: InterviewMessage[] = [
    {
      id: 'm1',
      author: 'AI',
      text: 'Bonjour Soufiane. J’ai analysé votre CV : développeur backend, expérience sur Java, Spring Boot et Git. Je vais vous poser quelques questions pour préciser vos compétences réelles et vos objectifs.',
      at: '2026-11-04T10:00:00',
    },
    {
      id: 'm2',
      author: 'AI',
      text: QUESTIONS[0].text,
      at: '2026-11-04T10:00:20',
    },
  ];

  readonly messages = signal<InterviewMessage[]>(this.initial);

  readonly currentQuestion = computed(() =>
    this.step() < QUESTIONS.length ? QUESTIONS[this.step()] : null,
  );

  readonly progress = computed(() => Math.round((this.step() / QUESTIONS.length) * 100));

  /** Numéro de l'étape affichée : la première question est l'étape 1. */
  readonly stepIndex = computed(() => Math.min(this.step() + 1, QUESTIONS.length));

  send(): void {
    const text = this.draft().trim();
    if (!text || this.finished()) {
      return;
    }

    this.messages.update((list) => [
      ...list,
      { id: `u-${Date.now()}`, author: 'USER', text, at: new Date().toISOString() },
    ]);
    this.draft.set('');

    const answer = ANSWERS[this.step() % ANSWERS.length];
    const nextStep = this.step() + 1;
    const nextQuestion = nextStep < QUESTIONS.length ? QUESTIONS[nextStep].text : null;

    window.setTimeout(() => {
      this.messages.update((list) => [
        ...list,
        {
          id: `a-${Date.now()}`,
          author: 'AI',
          text: answer,
          at: new Date().toISOString(),
        },
      ]);

      if (nextQuestion) {
        this.messages.update((list) => [
          ...list,
          {
            id: `q-${Date.now()}`,
            author: 'AI',
            text: nextQuestion,
            at: new Date().toISOString(),
          },
        ]);
      } else {
        this.finished.set(true);
        this.messages.update((list) => [
          ...list,
          {
            id: `end-${Date.now()}`,
            author: 'AI',
            text: 'Merci, l’entretien est terminé. Votre profil a été mis à jour : les compétences déclarées portent désormais une source « Déclaré », distincte des observations du poste.',
            at: new Date().toISOString(),
          },
        ]);
      }
    }, 450);

    this.step.set(nextStep);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
