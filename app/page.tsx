'use client';
import { useLandingPage } from '@/hooks/useLandingPage';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { TickerBar, StatsSection } from '@/components/landing/StatsSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PhotoBreak, TrustSection, FinalCTA, Footer } from '@/components/landing/FooterSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { TransportSection } from '@/components/landing/TransportSection';
import { PaymentSection } from '@/components/landing/PaymentSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { Chatbot } from '@/components/landing/Chatbot';

export default function LandingPage() {
  const { menu, setMenu, scrolled, sent, form, setForm, heroRef, heroY, submit } = useLandingPage();

  return (
    <div className="bg-[#e8f0fe] text-gray-900 overflow-x-hidden">
      <style>{`
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .ticker-t{display:flex;width:max-content;animation:ticker 32s linear infinite}
        .ticker-t:hover{animation-play-state:paused}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .float{animation:float 4s ease-in-out infinite;will-change:transform}
        .float2{animation:float2 5s .9s ease-in-out infinite;will-change:transform}
      `}</style>

      <Navbar scrolled={scrolled} menu={menu} setMenu={setMenu} />
      <HeroSection heroRef={heroRef} heroY={heroY} />
      <TickerBar />
      <StatsSection />
      <FeaturesSection />
      <PhotoBreak />
      <HowItWorksSection />
      <TransportSection />
      <PaymentSection />
      <TrustSection />
      <FAQSection />
      <ContactSection sent={sent} form={form} setForm={setForm} submit={submit} />
      <FinalCTA />
      <Footer />
      <Chatbot />
    </div>
  );
}
