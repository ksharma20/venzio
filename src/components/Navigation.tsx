'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between border-b border-venzio-border bg-[rgba(6,16,13,0.72)] px-6 py-4 backdrop-blur-[16px] md:px-[60px] md:py-5">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Venzio" className="h-[68px] w-auto md:h-[77px]" />
      </div>

      <ul className="hidden list-none items-center gap-9 md:flex">
        <li><Link href="#how" className="text-sm font-medium text-venzio-text-muted transition-colors hover:text-venzio-green">How it works</Link></li>
        <li><Link href="#features" className="text-sm font-medium text-venzio-text-muted transition-colors hover:text-venzio-green">Features</Link></li>
        <li><Link href="#industries" className="text-sm font-medium text-venzio-text-muted transition-colors hover:text-venzio-green">Industries</Link></li>
        <li><Link href="#compare" className="text-sm font-medium text-venzio-text-muted transition-colors hover:text-venzio-green">Compare</Link></li>
        <li><Link href="#faq" className="text-sm font-medium text-venzio-text-muted transition-colors hover:text-venzio-green">FAQ</Link></li>
      </ul>

      <Link
        href="/login"
        className="rounded-lg bg-venzio-green px-5 py-2 text-sm font-bold text-venzio-bg-dark transition-all hover:bg-[#24c48d] hover:shadow-lg active:scale-95 md:px-6 md:py-2.5"
      >
        Get Started
      </Link>
    </nav>
  );
}
