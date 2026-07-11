import Home from '@/pages/Home';
import Notes from '@/pages/Notes';

export const pageComponents = {
  Home,
  Notes,
} as const;

export type PageKey = keyof typeof pageComponents;

export interface RouteConfig {
  path: string;
  page: PageKey;
  label: string;
  showInNav: boolean;
}

export const routes: RouteConfig[] = [
  { path: '/', page: 'Home', label: 'Home', showInNav: true },
  { path: '/notes', page: 'Notes', label: 'Notes', showInNav: true },
];

export const mainNav = routes
  .filter((r) => r.showInNav)
  .map((r) => ({ label: r.label, href: r.path }));
