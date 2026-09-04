import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { JetWorkflow } from './pages/Jet/JetWorkflow';
import { SparkJetWorkflow } from './pages/SparkJet/SparkJetWorkflow';
import { OmniaJetWorkflow } from './pages/OmniaJet/OmniaJetWorkflow';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthGuard } from './components/layout/AuthGuard';
import { AiAgentTrigger } from './components/ai/AiAgentTrigger';
import { AiAssistantModal } from './components/ai/AiAssistantModal';
import { useApplicationContextSync } from './hooks/useApplicationContextSync';

/* ── Scroll-Reveal Observer ───────────────────────────────────── */
function ScrollRevealObserver() {
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
      );
      elements.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }, 80);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

/* ── Page-level transition (for app pages, not auth) ─────────── */
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const }
  },
  exit: {
    opacity: 0, y: -6,
    transition: { duration: 0.25, ease: 'easeIn' as const }
  },
} as const;

/* ── App Layout with animated page transitions ────────────────── */
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isWorkflowPage = location.pathname.includes('/jet') || location.pathname.includes('/spark-jet') || location.pathname.includes('/omnia-jet');
  const [isAiOpen, setIsAiOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpenAi = () => {
      setIsAiOpen(true);
    };
    window.addEventListener('jet:open-ai', handleOpenAi);
    return () => window.removeEventListener('jet:open-ai', handleOpenAi);
  }, []);

  // Synchronize global application and page context
  useApplicationContextSync();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <motion.div
          key="page"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      </main>
      {!isWorkflowPage && <Footer />}

      {/* Global Holographic AI Assistant Agent */}
      <AiAgentTrigger
        isOpen={isAiOpen}
        onToggle={() => setIsAiOpen((prev) => !prev)}
      />
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />
    </div>
  );
};

/* ── Animated Routes ──────────────────────────────────────────── */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth — full-screen, no navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/jet"
          element={
            <AuthGuard>
              <AppLayout>
                <JetWorkflow />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/spark-jet"
          element={
            <AuthGuard>
              <AppLayout>
                <SparkJetWorkflow />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/omnia-jet"
          element={
            <AuthGuard>
              <AppLayout>
                <OmniaJetWorkflow />
              </AppLayout>
            </AuthGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollRevealObserver />
      <AnimatedRoutes />
    </BrowserRouter>
  );
};

export default App;
