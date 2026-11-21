import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MultimediaProgram, StepVerification, TrainingFormat } from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { GapService } from '../../core/data/gap.service';
import { TrainingService } from '../../core/data/training.service';
import { AiTutoredWorkspace } from './ai-tutored-workspace';
import { CollaborativeWorkspace } from './collaborative-workspace';
import { InteractiveWorkspace } from './interactive-workspace';
import { MultimediaWorkspace } from './multimedia-workspace';
import { PracticalWorkspace } from './practical-workspace';
import { ProjectWorkspace } from './project-workspace';
import { SimulationWorkspace } from './simulation-workspace';
import { WorkspaceBase } from './workspace-base';

type WorkspaceComponent =
  | MultimediaWorkspace
  | InteractiveWorkspace
  | PracticalWorkspace
  | ProjectWorkspace
  | SimulationWorkspace
  | AiTutoredWorkspace
  | CollaborativeWorkspace;

interface NoteCase {
  format: TrainingFormat;
  component: Type<WorkspaceComponent>;
  enter: (workspace: WorkspaceComponent, unitId: string, note: string) => void;
}

const NOTE_CASES: NoteCase[] = [
  {
    format: 'MULTIMEDIA',
    component: MultimediaWorkspace,
    enter: (workspace, _unitId, note) => workspace.setNotes(note),
  },
  {
    format: 'INTERACTIVE',
    component: InteractiveWorkspace,
    enter: (workspace, _unitId, note) => workspace.setNotes(note),
  },
  {
    format: 'PRACTICAL',
    component: PracticalWorkspace,
    enter: (workspace, unitId, note) =>
      (workspace as PracticalWorkspace).setRestitution(unitId, note),
  },
  {
    format: 'PROJECT',
    component: ProjectWorkspace,
    enter: (workspace, unitId, note) =>
      (workspace as ProjectWorkspace).setProof(unitId, note),
  },
  {
    format: 'SIMULATION',
    component: SimulationWorkspace,
    enter: (workspace, unitId, note) =>
      (workspace as SimulationWorkspace).setDebrief(unitId, 0, note),
  },
  {
    format: 'AI_TUTORED',
    component: AiTutoredWorkspace,
    enter: (workspace, _unitId, note) => workspace.setNotes(note),
  },
  {
    format: 'COLLABORATIVE',
    component: CollaborativeWorkspace,
    enter: (workspace, unitId, note) =>
      (workspace as CollaborativeWorkspace).setContribution(unitId, note),
  },
];

@Component({
  selector: 'wa-test-training-workspace',
  template: '<p>{{ activeUnit()?.id }}</p>',
})
class TestTrainingWorkspace extends WorkspaceBase {
  complete(unitId: string, verification: StepVerification): boolean {
    return this.completeValidated(unitId, 30, verification);
  }
}

describe('Espaces de formation — relecture et progression', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function startedRequest(format: TrainingFormat): {
    request: ReturnType<TrainingService['generateForGap']>;
    program: NonNullable<ReturnType<TrainingService['programFor']>>;
  } {
    const training = TestBed.inject(TrainingService);
    const gap = TestBed.inject(GapService).gaps()[0]!;
    const request = training.generateForGap({ gap, format });
    training.approve(request.id, 'Parcours approuvé pour le test.');
    training.start(request.id);
    return {
      request,
      program: training.programFor(request.id)!,
    };
  }

  for (const noteCase of NOTE_CASES) {
    it(`restaure visiblement les notes du format ${noteCase.format} après réouverture`, () => {
      const { format, component, enter } = noteCase;
      const training = TestBed.inject(TrainingService);
      const { request, program } = startedRequest(format);
      const progress = training.progressFor(request.id)!;
      const unitId = progress.units[0].unitId;
      const note = `Note conservée — ${format}`;

      const first = TestBed.createComponent(component);
      first.componentRef.setInput('request', request);
      first.componentRef.setInput('program', program);
      first.componentRef.setInput('progress', progress);
      first.componentRef.setInput('editable', true);
      first.detectChanges();
      enter(first.componentInstance, unitId, note);
      first.destroy();

      const second = TestBed.createComponent(component);
      second.componentRef.setInput('request', request);
      second.componentRef.setInput('program', program);
      second.componentRef.setInput('progress', training.progressFor(request.id)!);
      second.componentRef.setInput('editable', true);
      second.detectChanges();

      const textareas = Array.from(
        (second.nativeElement as HTMLElement).querySelectorAll('textarea'),
      ) as HTMLTextAreaElement[];
      expect(textareas.some((textarea) => textarea.value.includes(note))).toBe(true);
      second.destroy();
    });
  }

  it('sélectionne automatiquement la prochaine unité disponible après validation', () => {
    const data = TestBed.inject(DataService);
    const { request, program } = startedRequest('MULTIMEDIA');
    const progress = data.progressFor(request.id)!;
    const current = progress.units[0];
    const next = progress.units[1];

    const fixture = TestBed.createComponent(TestTrainingWorkspace);
    fixture.componentRef.setInput('request', request);
    fixture.componentRef.setInput('program', program);
    fixture.componentRef.setInput('progress', progress);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();

    const verification = data.verifyTrainingStep({
      requestId: request.id,
      unitId: current.unitId,
      unitTitle: (program as MultimediaProgram).episodes[0].title,
      format: 'MULTIMEDIA',
      notions: [],
      employeeId: request.employeeId,
      evidence: {
        unitId: current.unitId,
        format: 'MULTIMEDIA',
        kind: 'TEXTE',
        steps: [
          { label: 'Vidéo consultée', done: true },
          { label: 'Restitution orale effectuée', done: true },
        ],
        criteria: [
          {
            label: 'Critère de réussite',
            done: true,
            detail: 'Résultat observé et consigné dans le support pédagogique.',
          },
        ],
        narrative:
          'Travail réalisé, résultat observé, décisions tracées et procédure de reprise documentée.',
        durationMinutes: 30,
        expectedMinutes: 30,
      },
    });
    expect(verification.verdict).toBe('VALIDE');

    expect(fixture.componentInstance.complete(current.unitId, verification)).toBe(true);
    expect(fixture.componentInstance.selectedUnitId()).toBe(next.unitId);
    expect(fixture.componentInstance.activeUnit()?.id).toBe(next.unitId);
    expect(data.progressFor(request.id)!.units[1].status).toBe('AVAILABLE');
    fixture.destroy();
  });
});
