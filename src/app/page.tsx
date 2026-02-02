import { Suspense } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import HeroSection from '@/components/landing/HeroSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StepsSection from '@/components/landing/StepsSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';
import StructuredData from '@/components/landing/StructuredData';
import LandingRedirect from '@/components/landing/LandingRedirect';
import AppDemoSection from '@/components/landing/AppDemoSection';
import LiveStatsSection from '@/components/landing/LiveStatsSection';
import FAQSection from '@/components/landing/FAQSection';

interface LandingStats {
  totalEntries: number;
  totalUsers: number;
  totalLikes: number;
}

async function getStats(): Promise<LandingStats> {
  try {
    const [entries, users, likes] = await Promise.all([
      supabaseAdmin.from('entries').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('likes').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalEntries: entries.count ?? 0,
      totalUsers: users.count ?? 0,
      totalLikes: likes.count ?? 0,
    };
  } catch {
    return { totalEntries: 0, totalUsers: 0, totalLikes: 0 };
  }
}

export default async function Home() {
  const stats = await getStats();

  return (
    <main className="min-h-screen">
      <StructuredData />
      <LandingRedirect />
      <HeroSection />
      <BenefitsSection />
      <FeaturesSection />
      <StepsSection />
      <Suspense fallback={<div className="py-20" />}>
        <AppDemoSection />
      </Suspense>
      <Suspense fallback={<div className="py-20" />}>
        <LiveStatsSection initialStats={stats} />
      </Suspense>
      <Suspense fallback={<div className="py-20" />}>
        <FAQSection />
      </Suspense>
      <CTASection />
      <LandingFooter />
    </main>
  );
}
