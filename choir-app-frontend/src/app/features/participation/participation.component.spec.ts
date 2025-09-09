import { ParticipationComponent } from './participation.component';
import { UserInChoir } from '@core/models/user';

describe('ParticipationComponent', () => {
  it('sortByVoice should handle null names', () => {
    const component = new ParticipationComponent({} as any);
    const members: UserInChoir[] = [
      { id: 1, name: null as any, email: '', voice: 'SOPRAN' },
      { id: 2, name: 'Alpha', email: '', voice: 'SOPRAN' }
    ];
    expect(() => component['sortByVoice'](members)).not.toThrow();
    const sorted = component['sortByVoice'](members);
    expect(sorted.length).toBe(2);
  });
});
