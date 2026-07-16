"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ContactPage() {
  const { translations: t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error(t.common.fillRequired);
      return;
    }
    toast.success(t.contactPage.formSuccess);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const faqs = [
    { q: t.contactPage.faq1Q, a: t.contactPage.faq1A },
    { q: t.contactPage.faq2Q, a: t.contactPage.faq2A },
    { q: t.contactPage.faq3Q, a: t.contactPage.faq3A },
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
            {t.contactPage.title}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t.contactPage.subtitle}
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          <Card className="glass-card border-cyan-500/10">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {t.contactPage.email}
              </h3>
              <p className="text-slate-400 text-sm">19910761882@163.com</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-violet-500/10">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {t.contactPage.phone}
              </h3>
              <p className="text-slate-400 text-sm">+86 19910761882</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-emerald-500/10">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {t.contactPage.address}
              </h3>
              <p className="text-slate-400 text-sm">
                {t.contactPage.addressValue}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Form + FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10">
          {/* Form */}
          <Card className="glass-card border-cyan-500/10">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">
                    {t.contactPage.getInTouch}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {t.contactPage.getInTouchText}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      {t.contactPage.formName}
                    </Label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t.contactPage.formName}
                      className="bg-slate-900/50 border-cyan-500/20 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      {t.contactPage.formEmail}
                    </Label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t.contactPage.formEmail}
                      className="bg-slate-900/50 border-cyan-500/20 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t.contactPage.formSubject}
                  </Label>
                  <Input
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder={t.contactPage.formSubject}
                    className="bg-slate-900/50 border-cyan-500/20 text-slate-200 placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t.contactPage.formMessage}
                  </Label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t.contactPage.formMessage}
                    rows={5}
                    className="bg-slate-900/50 border-cyan-500/20 text-slate-200 placeholder:text-slate-500 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {t.contactPage.formSubmit}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">
              {t.contactPage.faq}
            </h2>
            <div className="w-12 h-1 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" />

            <div className="space-y-3 pt-4">
              {faqs.map((faq, index) => (
                <Card
                  key={index}
                  className="glass-card border-cyan-500/10 cursor-pointer"
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-200 pr-4">
                        {faq.q}
                      </h3>
                      {openFaq === index ? (
                        <ChevronUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      )}
                    </div>
                    {openFaq === index && (
                      <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                        {faq.a}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
