'use client';
import { useLandingPage } from '@/hooks/useLandingPage';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { TickerBar } from '@/components/landing/StatsSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PhotoBreak, TrustSection, FinalCTA, Footer } from '@/components/landing/FooterSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ShowcaseSection } from '@/components/landing/ShowcaseSection';
import { TransportSection } from '@/components/landing/TransportSection';
import { PaymentSection } from '@/components/landing/PaymentSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { Chatbot } from '@/components/landing/Chatbot';

export default function LandingPage() {
  const { menu, setMenu, scrolled, sent, form, setForm, heroRef, submit } = useLandingPage();

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      <style>{`
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .ticker-t{display:flex;width:max-content;animation:ticker 32s linear infinite}
        .ticker-t:hover{animation-play-state:paused}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .float{animation:float 4s ease-in-out infinite;will-change:transform}
        .float2{animation:float2 5s .9s ease-in-out infinite;will-change:transform}
        @keyframes gradient-x{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        .animate-gradient-x{background-size:200% 200%;animation:gradient-x 8s ease infinite}
        @keyframes float-slow{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.08)}}
        .animate-float-slow{animation:float-slow 5s ease-in-out infinite}
        @keyframes float-slower{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(14px) scale(0.94)}}
        .animate-float-slower{animation:float-slower 6s ease-in-out infinite}
        @keyframes bounce-soft{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .animate-bounce-soft{animation:bounce-soft 1.6s ease-in-out infinite}
      `}</style>

      <Navbar scrolled={scrolled} menu={menu} setMenu={setMenu} />
      <HeroSection heroRef={heroRef} />
      <TickerBar />
      <ShowcaseSection />
      <FeaturesSection />
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
