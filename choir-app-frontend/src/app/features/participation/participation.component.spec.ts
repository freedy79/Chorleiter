import { ParticipationComponent } from './participation.component';
import { UserInChoir } from '@core/models/user';
import { Event } from '@core/models/event';
import { BehaviorSubject } from 'rxjs';

describe('ParticipationComponent', () => {
  it('sortByVoice should handle null names', () => {
    const component = new ParticipationComponent({} as any, { currentUser$: new BehaviorSubject<any>(null) } as any);
    const members: UserInChoir[] = [
      { id: 1, name: null as any, email: '', voice: 'SOPRAN' },
      { id: 2, name: 'Alpha', email: '', voice: 'SOPRAN' }
    ];
    expect(() => component['sortByVoice'](members)).not.toThrow();
    const sorted = component['sortByVoice'](members);
    expect(sorted.length).toBe(2);
  });

  it('statusCount counts all statuses', () => {
    const component = new ParticipationComponent({} as any, { currentUser$: new BehaviorSubject<any>(null) } as any);
    component.members = [
      { id: 1, name: 'A', email: '', voice: 'SOPRAN' },
      { id: 2, name: 'B', email: '', voice: 'ALT' },
      { id: 3, name: 'C', email: '', voice: 'TENOR' },
      { id: 4, name: 'D', email: '', voice: 'BASS' }
    ];
    (component as any).availabilityMap = {
      1: { '2024-01-01': 'AVAILABLE' },
      2: { '2024-01-01': 'MAYBE' },
      3: { '2024-01-01': 'UNAVAILABLE' },
      4: {}
    };
    const key = '2024-01-01';
    expect(component.statusCount(key, 'AVAILABLE')).toBe(1);
    expect(component.statusCount(key, 'MAYBE')).toBe(1);
    expect(component.statusCount(key, 'UNAVAILABLE')).toBe(1);
    expect(component.statusCount(key, 'UNKNOWN')).toBe(1);
  });

  it('monthStatusCount aggregates events', () => {
    const component = new ParticipationComponent({} as any, { currentUser$: new BehaviorSubject<any>(null) } as any);
    component.members = [
      { id: 1, name: 'A', email: '', voice: 'SOPRAN' },
      { id: 2, name: 'B', email: '', voice: 'ALT' }
    ];
    (component as any).availabilityMap = {
      1: { '2024-01-01': 'AVAILABLE', '2024-01-02': 'UNAVAILABLE' },
      2: { '2024-01-01': 'MAYBE', '2024-01-02': 'AVAILABLE' }
    };
    const col = {
      key: '2024-01',
      label: 'Jan 2024',
      events: [
        { date: '2024-01-01' } as Event,
        { date: '2024-01-02' } as Event
      ]
    };
    expect(component.monthStatusCount(col, 'AVAILABLE')).toBe(2);
    expect(component.monthStatusCount(col, 'MAYBE')).toBe(1);
    expect(component.monthStatusCount(col, 'UNAVAILABLE')).toBe(1);
  });

  it('monthStatusCount counts unique dates only once', () => {
    const component = new ParticipationComponent({} as any, { currentUser$: new BehaviorSubject<any>(null) } as any);
    component.members = [
      { id: 1, name: 'A', email: '', voice: 'SOPRAN' },
      { id: 2, name: 'B', email: '', voice: 'ALT' }
    ];
    (component as any).availabilityMap = {
      1: { '2024-01-01': 'AVAILABLE' },
      2: { '2024-01-01': 'MAYBE' }
    };
    const col = {
      key: '2024-01',
      label: 'Jan 2024',
      events: [
        { date: '2024-01-01' } as Event,
        { date: '2024-01-01' } as Event
      ]
    };
    expect(component.monthStatusCount(col, 'AVAILABLE')).toBe(1);
    expect(component.monthStatusCount(col, 'MAYBE')).toBe(1);
  });
});
