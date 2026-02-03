import { Capabilities } from '@/components/bantai/Capabilities';
import { Clarity } from '@/components/bantai/Clarity';
import { CodeSection } from '@/components/bantai/CodeSection';
import { Contribution } from '@/components/bantai/Contribution';
import { Design } from '@/components/bantai/Design';
import { Footer } from '@/components/bantai/Footer';
import { Hero } from '@/components/bantai/Hero';
import { Process } from '@/components/bantai/Process';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black">
      {/* <Header /> */}
      <main className="grow">
        <Hero />
        <Capabilities />
        <Process />
        <Design />
        <CodeSection />
        <Clarity />
        <Contribution />
      </main>
      <Footer />
    </div>
  );
}
