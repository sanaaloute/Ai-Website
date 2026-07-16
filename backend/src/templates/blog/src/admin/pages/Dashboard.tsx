import { useEffect, useState } from 'react';
import { FileText, MessageCircle, Tags, Users } from 'lucide-react';
import {
  listAllPosts, listAllCategories, listAllComments,
  listAllUsers, type Comments,
} from '@/lib/pocketbase';
import { AdminCard, PageHeader, Skeleton } from '@/admin/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    posts: 0,
    categories: 0,
    comments: 0,
    recentRequests: [] as Comments[],
    users: 0,
    loading: true
  });

  useEffect(() => {
    async function load() {
      try {
        const posts = await listAllPosts(1, 1);
        const categories = await listAllCategories();
        const comments = await listAllComments(1, 5);
        const users = await listAllUsers(1, 1);

        setStats({
          posts: posts.totalItems,
          categories: categories.length,
          comments: comments.totalItems,
          recentRequests: comments.items,
          users: users.totalItems,
          loading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load dashboard data.';
        addToast({ variant: 'error', title: 'Failed to load dashboard', message });
        setStats((s) => ({ ...s, loading: false }));
      }
    }
    load();
  }, [addToast]);

  const statCards = [
    { label: 'Posts', value: stats.posts, icon: FileText },
    { label: 'Comments', value: stats.comments, icon: MessageCircle },
    { label: 'Categories', value: stats.categories, icon: Tags },
    { label: 'Users', value: stats.users, icon: Users }
  ];

  if (stats.loading) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <h2 className="text-lg font-semibold text-gray-900">Recent Comments</h2>
          {stats.recentRequests.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No comments yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
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
          )}
        </AdminCard>
      </div>
    </div>
  );
}
