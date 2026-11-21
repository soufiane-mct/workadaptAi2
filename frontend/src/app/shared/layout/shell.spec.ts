import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';
import { Shell } from './shell';

/**
 * Non-régression du tiroir de navigation mobile.
 *
 * Le tiroir doit rester utilisable au clavier : son état est annoncé, il
 * devient inerte lorsqu'il est fermé, Échap le ferme et Tab ne sort pas de
 * son périmètre tant qu'il est ouvert.
 */
describe('Navigation mobile — tiroir accessible', () => {
  let fixture: ComponentFixture<Shell>;
  let component: Shell;

  const fakeData = {
    pendingRequests: vi.fn().mockReturnValue([]),
    actionableGaps: vi.fn().mockReturnValue([]),
    unreadNotifications: vi.fn().mockReturnValue(0),
    collectionService: {
      startAutoCollection: vi.fn(),
      stopAutoCollection: vi.fn(),
    },
    markAllNotificationsRead: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: true, breakpoints: {} }),
          },
        },
        { provide: DataService, useValue: fakeData },
      ],
    });
    TestBed.inject(AuthService).login('EMPLOYEE');
    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  function toggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[aria-controls="primary-navigation"]',
    ) as HTMLButtonElement;
  }

  function drawer(): HTMLElement {
    return fixture.nativeElement.querySelector('#primary-navigation') as HTMLElement;
  }

  function advanceFocus(): void {
    vi.advanceTimersByTime(0);
    fixture.detectChanges();
  }

  function focusableElements(): HTMLElement[] {
    return Array.from(
      drawer().querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  it('annonce son état et devient inerte quand il est fermé', () => {
    const button = toggle();
    const side = drawer();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(side.getAttribute('aria-hidden')).toBe('true');
    expect(side.hasAttribute('inert')).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(side.getAttribute('aria-hidden')).toBeNull();
    expect(side.hasAttribute('inert')).toBe(false);
  });

  it('place le focus dans le tiroir et le piège au clavier', () => {
    component.openMenu();
    fixture.detectChanges();
    advanceFocus();

    const elements = focusableElements();
    expect(elements.length).toBeGreaterThan(1);
    expect(document.activeElement).toBe(elements[0]);

    elements[elements.length - 1].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(elements[0]);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(elements[elements.length - 1]);
  });

  it('ferme le tiroir avec Échap et rend le focus au bouton', () => {
    const button = toggle();
    component.openMenu();
    fixture.detectChanges();
    advanceFocus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    advanceFocus();

    expect(component.menuOpen()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });
});
