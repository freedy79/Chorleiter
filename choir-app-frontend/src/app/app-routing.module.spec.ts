import { routes } from './app-routing.module';

describe('app routes integrity', () => {
  it('contains collections/view/:id only once', () => {
    const rootRoute = routes.find(route => route.path === '');
    const children = rootRoute?.children ?? [];
    const matches = children.filter(route => route.path === 'collections/view/:id');

    expect(matches.length).toBe(1);
  });
});
