'use client';

import Link from 'next/link';

export default function CTABandFooter() {
  return (
    <>
      <div className="relative z-10 mx-6 mt-[80px] mb-[80px] overflow-hidden rounded-[24px] border border-[rgba(29,158,117,0.3)] bg-gradient-to-b from-[#0c2018] via-[#0a1a10] to-[#061410] px-7 py-12 text-center md:mx-10 md:mb-[100px] md:px-[60px] md:py-[80px]">
        <div className="pointer-events-none absolute left-1/2 top-[-60%] h-[400px] w-[600px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(29,158,117,0.12) 0%, transparent 70%)' }} />

        <div className="reveal relative z-10">
          <h2 className="mb-4 font-jakarta text-3xl font-black leading-tight tracking-tight md:text-4xl">
            Stop chasing<br /><em className="font-playfair italic text-venzio-green">presence data.</em>
          </h2>
          <p className="mb-10 text-base text-venzio-text-muted md:text-lg">
            From one frustrated engineer's allowance hack to a platform that makes presence tracking invisible.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/login" className="rounded-lg bg-venzio-green px-9 py-4 text-base font-bold text-venzio-bg-dark shadow-[0_0_40px_rgba(29,158,117,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#24c48d]">
              Get Started - It's Free
            </Link>
            <button className="rounded-lg border border-venzio-border px-7 py-4 text-base font-medium text-venzio-text transition-all hover:border-venzio-green hover:text-venzio-green">
              Talk to us
            </button>
          </div>
        </div>
      </div>

      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-5 border-t border-venzio-border px-6 py-10 md:px-[60px]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Venzio" className="h-[66px] w-auto" />
        </div>
        <div className="text-xs text-venzio-text-muted">Copyright 2026 Venzio. Presence Intelligence Platform.</div>
        <div className="flex gap-6">
          <a href="#" className="text-xs text-venzio-text-muted transition-colors hover:text-venzio-green">Privacy</a>
          <a href="#" className="text-xs text-venzio-text-muted transition-colors hover:text-venzio-green">Terms</a>
          <a href="#" className="text-xs text-venzio-text-muted transition-colors hover:text-venzio-green">Contact</a>
        </div>
      </footer>
    </>
  );
}
