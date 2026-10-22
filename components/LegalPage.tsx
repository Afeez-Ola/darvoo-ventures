"use client";

import { ReactNode } from "react";
import PageBar from "./PageBar";
import SiteFooter from "./SiteFooter";
import { useI18n } from "@/lib/i18n";

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="shell" style={{ paddingBottom: 40 }}>
      <PageBar title={title} back="/" backLabel={t.backToMenu} />
      <article className="legal" lang="de">{children}</article>
      <SiteFooter />
    </div>
  );
}

/** Marks a fact the business still has to supply. */
export const Todo = ({ children }: { children: ReactNode }) => <span className="todo">{children}</span>;
