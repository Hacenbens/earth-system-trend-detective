'use client';

import { useState } from 'react';
import { useApp } from '@/app/layout/AppProvider';
import { Navbar } from '@/app/layout/Navbar';
import { Footer } from '@/app/layout/Footer';
import { HeroSection } from '@/app/pages/landing/HeroSection';
import { ProblemSection } from '@/app/pages/landing/ProblemSection';
import { WorkflowSection } from '@/app/pages/landing/WorkflowSection';
import { SahelCaseStudy } from '@/app/pages/landing/SahelCaseStudy';
import { DiscoverCarousel } from '@/app/pages/landing/DiscoverCarousel';
import { DataFoundation } from '@/app/pages/landing/DataFoundation';
import { FinalCta } from '@/app/pages/landing/FinalCta';
import { InvestigationModal } from '@/app/pages/landing/InvestigationModal';

export function LandingPage() {
  const { session, sessionLabel, query, setQuery, navigateTo } = useApp();
  const [modal, setModal] = useState({ type: 'closed' });

  const openInvestigation = (customQuery = query, initialLayer) => {
    setModal({ type: 'investigation', query: customQuery, initialLayer });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#131D38] text-[#f4f1ea]">
      <Navbar
        sessionLabel={sessionLabel}
        onOpenInvestigation={() => navigateTo('/investigations')}
        onOpenSignIn={() => (session ? navigateTo('/dashboard') : navigateTo('/auth'))}
      />

      <main className="flex-1">
        <HeroSection
          query={query}
          onChangeQuery={setQuery}
          onLaunchInvestigation={(nextQuery) => {
            setQuery(nextQuery);
            navigateTo('/investigations/sahel-rainfall-2001-2025/data');
          }}
        />

        <ProblemSection />

        <WorkflowSection onExploreLayer={(layerId) => openInvestigation(query, layerId)} />

        <SahelCaseStudy
          onExploreInvestigation={() => navigateTo('/investigations/sahel-rainfall-2001-2025/data')}
          onReadMethod={() => navigateTo('/methodology')}
        />

        <DiscoverCarousel onSelectCard={(card) => setModal({ type: 'discovery', card })} />

        <DataFoundation onOpenProvenance={() => navigateTo('/datasets')} />

        <FinalCta onStartInvestigation={() => navigateTo('/investigations/new')} />
      </main>

      <Footer
        onOpenMethodology={() => navigateTo('/methodology')}
        onOpenProvenance={() => navigateTo('/datasets')}
        onOpenContact={() => navigateTo('/references')}
      />

      <InvestigationModal
        modal={modal}
        onClose={() => setModal({ type: 'closed' })}
        onSwitchToInvestigation={() => {
          setModal({ type: 'closed' });
          navigateTo('/investigations/sahel-rainfall-2001-2025/data');
        }}
      />
    </div>
  );
}
