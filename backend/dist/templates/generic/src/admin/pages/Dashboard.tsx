import { useEffect, useState } from 'react';
import { Layout, Mail, Users } from 'lucide-react';
import {
  listAllPages, listAllContacts,
  listAllUsers, type Contacts,
} from '@/lib/pocketbase';
import { AdminCard, PageHeader, Skeleton, EmptyState } from '@/admin/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    pages: 0,
    contacts: 0,
    recentRequests: [] as Contacts[],
    users: 0,
    loading: true
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const pages = await listAllPages(1, 1);
        const contacts = await listAllContacts(1, 5);
        const users = await listAllUsers(1, 1);

        if (cancelled) return;
        setStats({
          pages: pages.totalItems,
          contacts: contacts.totalItems,
          recentRequests: contacts.items,
          users: users.totalItems,
          loading: false,
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load dashboard stats.';
        addToast({ variant: 'error', title: 'Failed to load dashboard', message });
        setStats((s) => ({ ...s, loading: false }));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const statCards = [
    { label: 'Pages', value: stats.pages, icon: Layout },
    { label: 'Contacts', value: stats.contacts, icon: Mail },
    { label: 'Users', value: stats.users, icon: Users }
  ];

  if (stats.loading) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <AdminCard key={i}>
              <Skeleton className="h-16" />
            </AdminCard>
          ))}
        </div>
        <AdminCard className="mt-6 lg:col-span-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-32" />
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <AdminCard key={card.label}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <card.icon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminCard className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent Contacts</h2>
          {stats.recentRequests.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No contacts yet" message="New contact submissions will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-4 w-full min-w-[24rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRequests.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 font-medium text-gray-900">#{r.id.slice(-6)}</td>
                      <td className="py-3 text-gray-600">{r.expand?.user?.email || r.user}</td>
                      <td className="py-3"><Badge>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
