import { LoginForm } from "./form";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-800 bg-slate-950/60 p-6">
      <h1 className="mb-6 text-xl font-semibold">Admin sign in</h1>
      <LoginForm />
    </div>
  );
}
