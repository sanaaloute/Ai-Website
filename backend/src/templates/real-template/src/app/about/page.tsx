"use client";

import { useLanguage } from "@/lib/i18n/language-provider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Eye,
  Shield,
  UserCircle,
  Zap,
  Globe,
  Heart,
  Users,
} from "lucide-react";

export default function AboutPage() {
  const { translations: t } = useLanguage();

  const values = [
    {
      icon: Shield,
      title: t.aboutPage.value1Title,
      description: t.aboutPage.value1Desc,
      bgClass: "bg-cyan-500/10",
      textClass: "text-cyan-400",
    },
    {
      icon: UserCircle,
      title: t.aboutPage.value2Title,
      description: t.aboutPage.value2Desc,
      bgClass: "bg-violet-500/10",
      textClass: "text-violet-400",
    },
    {
      icon: Zap,
      title: t.aboutPage.value3Title,
      description: t.aboutPage.value3Desc,
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-400",
    },
    {
      icon: Globe,
      title: t.aboutPage.value4Title,
      description: t.aboutPage.value4Desc,
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-400",
    },
  ];

  const team = [
    { name: "Alex Chen", role: "CEO & Founder", initials: "AC" },
    { name: "Sarah Miller", role: "Head of Design", initials: "SM" },
    { name: "James Park", role: "Lead Engineer", initials: "JP" },
    { name: "Maria Garcia", role: "AI Research Lead", initials: "MG" },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4">
        <div className="absolute inset-0 cyber-gradient opacity-50" />
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            {t.aboutPage.title}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t.aboutPage.subtitle}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
          <Card className="glass-card border-cyan-500/10">
            <CardContent className="p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                {t.aboutPage.mission}
              </h2>
              <p className="text-slate-400 leading-relaxed">
                {t.aboutPage.missionText}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-violet-500/10">
            <CardContent className="p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                {t.aboutPage.vision}
              </h2>
              <p className="text-slate-400 leading-relaxed">
                {t.aboutPage.visionText}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              {t.aboutPage.values}
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-violet-500 mx-auto rounded-full" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card
                key={value.title}
                className="glass-card border-cyan-500/10 hover:border-cyan-500/30 transition-colors group"
              >
                <CardContent className="p-6 space-y-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${value.bgClass} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <value.icon className={`w-6 h-6 ${value.textClass}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {value.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
