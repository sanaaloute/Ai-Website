import Link from "next/link";
import { AuthForm } from "../_components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Create account</h1>
      <AuthForm mode="register" />
      <p className="mt-4 text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
