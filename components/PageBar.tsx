"use client";

import Link from "next/link";
import { Back } from "./Icons";

export default function PageBar({ title, back, backLabel }: { title: string; back: string; backLabel: string }) {
  return (
    <header className="pagebar">
      <Link href={back} className="back" aria-label={backLabel}>
        <Back />
      </Link>
      <h1 className="display">{title}</h1>
    </header>
  );
}
