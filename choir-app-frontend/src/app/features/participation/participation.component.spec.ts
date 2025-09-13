import { ParticipationComponent } from './participation.component';
import { UserInChoir } from '@core/models/user';
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
});
