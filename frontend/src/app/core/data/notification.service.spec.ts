import { TestBed } from '@angular/core/testing';
import { AppNotification } from '../models';
import { NotificationService } from './notification.service';

/**
 * Non-régression : une notification adressée à un employé ne doit jamais
 * apparaître chez un autre collaborateur. Les rôles d'encadrement et les
 * RH, eux, suivent la boucle complète.
 */
describe('NotificationService — périmètre employé', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  function notify(employeeId: string): AppNotification {
    return service.notify({
      type: 'TRAINING_COMPLETED',
      title: `Formation terminée ${employeeId}`,
      message: 'Parcours clôturé.',
      audience: ['EMPLOYEE', 'MANAGER'],
      employeeId,
    });
  }

  it("n'expose à un employé que ses propres notifications", () => {
    notify('emp-0002');

    const forOther = service
      .forRole('EMPLOYEE', 'emp-0001')
      .filter((item) => item.title === 'Formation terminée emp-0002');
    const forOwner = service
      .forRole('EMPLOYEE', 'emp-0002')
      .filter((item) => item.title === 'Formation terminée emp-0002');

    expect(forOther).toHaveLength(0);
    expect(forOwner).toHaveLength(1);
  });

  it('laisse le superviseur suivre la boucle de tous les employés', () => {
    notify('emp-0002');

    const forManager = service
      .forRole('MANAGER', 'emp-0001')
      .filter((item) => item.title === 'Formation terminée emp-0002');

    expect(forManager).toHaveLength(1);
  });

  it("ne marque comme lu que les notifications visibles par l'employé", () => {
    notify('emp-0002');
    service.markAllRead('EMPLOYEE', 'emp-0001');

    const other = service
      .forRole('EMPLOYEE', 'emp-0002')
      .find((item) => item.title === 'Formation terminée emp-0002');
    const mine = service
      .forRole('EMPLOYEE', 'emp-0001')
      .find((item) => item.employeeId === 'emp-0001');

    expect(other?.read).toBe(false);
    expect(mine?.read).toBe(true);
  });
});
