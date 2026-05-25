import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import logoImg from '../../assets/logo.png';
import { 
  Bot, 
  CreditCard, 
  Zap, 
  Ticket, 
  BarChart3, 
  Rocket, 
  Code, 
  ArrowRight, 
  Github, 
  Terminal, 
  ShieldCheck, 
  Server, 
  Check, 
  Sparkles 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStart = () => {
    navigate('/app/dashboard');
  };

  const features = [
    {
      icon: <Bot size={24} className="text-violet-400" />,
      title: t('landing.features.items.botsTitle'),
      description: t('landing.features.items.botsDesc'),
      tag: t('landing.features.channels')
    },
    {
      icon: <CreditCard size={24} className="text-emerald-400" />,
      title: t('landing.features.items.gatewaysTitle'),
      description: t('landing.features.items.gatewaysDesc'),
      tag: t('landing.features.payments')
    },
    {
      icon: <Zap size={24} className="text-amber-400" />,
      title: t('landing.features.items.deliveryTitle'),
      description: t('landing.features.items.deliveryDesc'),
      tag: t('landing.features.automation')
    },
    {
      icon: <Ticket size={24} className="text-rose-400" />,
      title: t('landing.features.items.couponsTitle'),
      description: t('landing.features.items.couponsDesc'),
      tag: t('landing.features.marketing')
    },
    {
      icon: <BarChart3 size={24} className="text-cyan-400" />,
      title: t('landing.features.items.dashboardTitle'),
      description: t('landing.features.items.dashboardDesc'),
      tag: t('landing.features.analytics')
    },
    {
      icon: <Rocket size={24} className="text-indigo-400" />,
      title: t('landing.features.items.productionTitle'),
      description: t('landing.features.items.productionDesc'),
      tag: t('landing.features.infra')
    },
  ];

  const technologies = [
    { category: 'Frontend', items: ['React 18', 'TypeScript', 'Vite 6', 'CSS Variables'] },
    { category: 'Backend', items: ['NestJS', 'Go', 'Clean Architecture', 'REST APIs'] },
    { category: 'Database & Cache', items: ['PostgreSQL 15', 'Redis 7', 'SQL optimization'] },
    { category: 'DevOps & Infra', items: ['Docker Compose', 'Nginx Proxy', 'Multi-stage builds'] },
  ];

  return (
    <div className="lp-container">
      {/* Estilos dinâmicos injetados para animações premium, hovers avançados e responsividade */}
      <style>{`
        .lp-container {
          min-height: 100vh;
          width: 100%;
          flex: 1;
          background-color: #030712;
          color: #f8fafc;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* Ambient Glow effects */
        .lp-glow-1 {
          position: absolute;
          top: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          height: 600px;
          background: radial-gradient(circle, rgba(109, 40, 217, 0.08) 0%, rgba(16, 185, 129, 0.02) 50%, rgba(3, 7, 18, 0) 100%);
          pointer-events: none;
          z-index: 0;
        }

        .lp-glow-2 {
          position: absolute;
          top: 40%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(3, 7, 18, 0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        .lp-glow-3 {
          position: absolute;
          bottom: 10%;
          left: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, rgba(3, 7, 18, 0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Glass header styling */
        .lp-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          z-index: 100;
          transition: background-color 0.3s ease;
        }

        .lp-header.scrolled {
          background-color: rgba(3, 7, 18, 0.8);
          border-bottom-color: rgba(255, 255, 255, 0.06);
        }

        .lp-header-content {
          max-width: 1200px;
          height: 100%;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .lp-logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lp-logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.06em;
          background: linear-gradient(135deg, #a78bfa, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lp-logo-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          background-color: rgba(167, 139, 250, 0.1);
          color: #a78bfa;
          border: 1px solid rgba(167, 139, 250, 0.2);
          letter-spacing: 0.05em;
        }

        /* Buttons custom classes */
        .lp-btn-nav {
          background: rgba(255, 255, 255, 0.03);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-btn-nav:hover {
          background: #f8fafc;
          color: #030712;
          transform: translateY(-1px);
        }

        .lp-btn-primary {
          background: linear-gradient(135deg, #6d28d9, #4f46e5);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 16px 32px;
          font-size: 15px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 25px -5px rgba(109, 40, 217, 0.35);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(109, 40, 217, 0.5);
          filter: brightness(1.1);
        }

        .lp-btn-secondary {
          background: rgba(255, 255, 255, 0.02);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px 32px;
          font-size: 15px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        /* Hero Section */
        .lp-hero {
          max-width: 1200px;
          margin: 160px auto 80px;
          padding: 0 24px;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .lp-hero-tagline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 99px;
          background-color: rgba(16, 185, 129, 0.06);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.15);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 24px;
          animation: float 4s ease-in-out infinite;
        }

        .lp-hero-title {
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }

        .lp-hero-desc {
          font-size: clamp(1rem, 2vw, 1.2rem);
          color: #94a3b8;
          line-height: 1.6;
          max-width: 720px;
          margin: 0 auto 40px;
        }

        .lp-hero-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* Preview Display Frame */
        .lp-preview-section {
          max-width: 1100px;
          margin: 0 auto 120px;
          padding: 0 24px;
          position: relative;
          z-index: 2;
        }

        .lp-preview-card {
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(16, 185, 129, 0.05), rgba(167, 139, 250, 0.02));
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          transition: transform 0.5s ease;
        }

        .lp-preview-card:hover {
          transform: scale(1.005);
        }

        .lp-preview-inner {
          background-color: #050b18;
          border-radius: 19px;
          overflow: hidden;
        }

        .lp-browser-bar {
          height: 48px;
          background-color: #090f1d;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          padding: 0 20px;
          justify-content: space-between;
        }

        .lp-browser-dots {
          display: flex;
          gap: 8px;
        }

        .lp-browser-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .lp-browser-address {
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 4px 20px;
          font-size: 11px;
          color: rgba(148, 163, 184, 0.4);
          width: 320px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lp-browser-content {
          aspect-ratio: 16/9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, #0b1528 0%, #050b18 100%);
          position: relative;
          cursor: pointer;
        }

        .lp-browser-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(3, 7, 18, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s ease;
        }

        .lp-browser-content:hover .lp-browser-overlay {
          background-color: rgba(3, 7, 18, 0.2);
        }

        .lp-browser-center-box {
          text-align: center;
          padding: 40px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 440px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          transform: translateY(0);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-browser-content:hover .lp-browser-center-box {
          transform: translateY(-4px);
          border-color: rgba(167, 139, 250, 0.25);
        }

        .lp-glow-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: rgba(109, 40, 217, 0.1);
          border: 1px solid rgba(109, 40, 217, 0.25);
          color: #a78bfa;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 0 20px rgba(109, 40, 217, 0.25);
          transition: all 0.3s ease;
        }

        .lp-browser-content:hover .lp-glow-icon {
          transform: scale(1.05) rotate(5deg);
          box-shadow: 0 0 30px rgba(109, 40, 217, 0.4);
        }

        /* Features Bento Section */
        .lp-features-section {
          max-width: 1200px;
          margin: 0 auto 120px;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        .lp-section-header {
          text-align: center;
          margin-bottom: 64px;
        }

        .lp-section-title {
          font-size: clamp(1.75rem, 3.5vw, 2.75rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #ffffff 40%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lp-section-desc {
          color: #94a3b8;
          max-width: 540px;
          margin: 0 auto;
          font-size: 15px;
          line-height: 1.6;
        }

        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 24px;
        }

        .lp-feature-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(800px circle at var(--x, 0) var(--y, 0), rgba(255, 255, 255, 0.03), transparent 40%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .lp-feature-card:hover::before {
          opacity: 1;
        }

        .lp-feature-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
        }

        .lp-feature-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }

        .lp-feature-card:hover .lp-feature-icon-wrapper {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .lp-feature-card-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #f8fafc;
        }

        .lp-feature-card-desc {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.6;
        }

        .lp-feature-card-badge {
          position: absolute;
          top: 32px;
          right: 32px;
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Architecture Visual Section */
        .lp-arch-section {
          max-width: 1200px;
          margin: 0 auto 120px;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        .lp-arch-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .lp-arch-left {
          padding-right: 20px;
        }

        .lp-arch-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #10b981;
          margin-bottom: 16px;
          display: block;
        }

        .lp-arch-title {
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .lp-arch-desc {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .lp-arch-bullets {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .lp-arch-bullet {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .lp-arch-bullet-icon {
          color: #10b981;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .lp-arch-bullet-text {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .lp-arch-right {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }

        .lp-arch-visual {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .lp-arch-node {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          transition: all 0.3s ease;
        }

        .lp-arch-node:hover {
          border-color: rgba(109, 40, 217, 0.3);
          transform: translateX(4px);
        }

        .lp-arch-node-active {
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.08);
        }

        .lp-arch-node-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f8fafc;
        }

        .lp-arch-node-active .lp-arch-node-icon {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .lp-arch-node-title {
          font-size: 13px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 2px;
        }

        .lp-arch-node-subtitle {
          font-size: 11px;
          color: #64748b;
        }

        .lp-arch-line {
          width: 2px;
          height: 20px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          margin-left: 36px;
        }

        .lp-arch-line-active {
          background: linear-gradient(to bottom, #10b981, rgba(16, 185, 129, 0.2));
        }

        /* Tech Grid Section */
        .lp-tech-section {
          max-width: 1200px;
          margin: 0 auto 120px;
          padding: 60px;
          background: radial-gradient(100% 100% at 50% 0%, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0) 100%), #040815;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 24px;
          position: relative;
          z-index: 1;
        }

        .lp-tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 40px;
          margin-top: 48px;
        }

        .lp-tech-col-title {
          font-size: 12px;
          font-weight: 700;
          color: #a78bfa;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .lp-tech-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lp-tech-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #94a3b8;
        }

        .lp-tech-check {
          color: #10b981;
          flex-shrink: 0;
        }

        /* Footer Section */
        .lp-footer {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 24px 48px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          position: relative;
          z-index: 1;
        }

        .lp-footer-cta {
          max-width: 800px;
          margin: 0 auto 80px;
          text-align: center;
        }

        .lp-footer-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .lp-footer-desc {
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.6;
          max-width: 520px;
          margin: 0 auto 36px;
        }

        .lp-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
          font-size: 13px;
          color: #64748b;
          padding-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
        }

        .lp-footer-links {
          display: flex;
          gap: 24px;
        }

        .lp-footer-link {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .lp-footer-link:hover {
          color: #f8fafc;
        }

        /* Keyframes */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .lp-arch-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .lp-arch-left {
            padding-right: 0;
            text-align: center;
          }
          .lp-arch-bullets {
            align-items: center;
          }
          .lp-arch-bullet {
            max-width: 480px;
          }
        }

        @media (max-width: 768px) {
          .lp-header-content {
            padding: 0 16px;
          }
          .lp-hero {
            margin-top: 120px;
            padding: 0 16px;
          }
          .lp-preview-section {
            padding: 0 16px;
            margin-bottom: 80px;
          }
          .lp-browser-bar {
            padding: 0 12px;
          }
          .lp-browser-address {
            width: 180px;
          }
          .lp-browser-center-box {
            padding: 24px 16px;
            margin: 16px;
          }
          .lp-features-section {
            padding: 0 16px;
            margin-bottom: 80px;
          }
          .lp-section-header {
            margin-bottom: 40px;
          }
          .lp-features-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .lp-feature-card {
            padding: 24px;
          }
          .lp-arch-section {
            padding: 0 16px;
            margin-bottom: 80px;
          }
          .lp-arch-right {
            padding: 20px;
          }
          .lp-tech-section {
            padding: 32px 20px;
            margin: 0 16px 80px;
          }
          .lp-tech-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .lp-footer {
            padding: 60px 16px 32px;
          }
          .lp-footer-bottom {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>

      {/* Background radial overlays */}
      <div className="lp-glow-1" />
      <div className="lp-glow-2" />
      <div className="lp-glow-3" />

      {/* Navigation Header */}
      <header className={`lp-header ${scrollY > 20 ? 'scrolled' : ''}`}>
        <div className="lp-header-content">
          <div className="lp-logo-container">
            <img src={logoImg} alt="Vematize Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            <span className="lp-logo-badge">{t('landing.badge')}</span>
          </div>
          <button onClick={handleStart} className="lp-btn-nav">
            {t('landing.btnNav')}
          </button>
        </div>
      </header>

      {/* Hero Section (Attention) */}
      <section className="lp-hero">
        <div className="lp-hero-tagline">
          <Sparkles size={14} />
          <span>{t('landing.hero.tagline')}</span>
        </div>
        <h1 className="lp-hero-title">
          {t('landing.hero.title')}
        </h1>
        <p className="lp-hero-desc">
          {t('landing.hero.desc')}
        </p>
        <div className="lp-hero-actions">
          <button onClick={handleStart} className="lp-btn-primary">
            {t('landing.hero.btnPrimary')}
            <ArrowRight size={16} />
          </button>
          <a 
            href="https://github.com/huneyoliv/vematize" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="lp-btn-secondary"
          >
            <Github size={16} />
            {t('landing.hero.btnSecondary')}
          </a>
        </div>
      </section>

      {/* Interactive Mockup Preview (Desire) */}
      <section className="lp-preview-section">
        <div className="lp-preview-card">
          <div className="lp-preview-inner">
            <div className="lp-browser-bar">
              <div className="lp-browser-dots">
                <div className="lp-browser-dot" style={{ backgroundColor: '#ef4444' }} />
                <div className="lp-browser-dot" style={{ backgroundColor: '#eab308' }} />
                <div className="lp-browser-dot" style={{ backgroundColor: '#22c55e' }} />
              </div>
              <div className="lp-browser-address">
                {t('landing.preview.address')}
              </div>
              <div style={{ width: 42 }} /> {/* Spacing helper */}
            </div>
            <div className="lp-browser-content" onClick={handleStart}>
              <div className="lp-browser-overlay">
                <div className="lp-browser-center-box">
                  <div className="lp-glow-icon">
                    <Zap size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#f8fafc' }}>
                    {t('landing.preview.title')}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
                    {t('landing.preview.desc')}
                  </p>
                  <button className="lp-btn-primary" style={{ padding: '12px 24px', fontSize: '14px', margin: '0 auto' }}>
                    {t('landing.preview.btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features (Interest) */}
      <section className="lp-features-section">
        <div className="lp-section-header">
          <h2 className="lp-section-title">{t('landing.features.title')}</h2>
          <p className="lp-section-desc">
            {t('landing.features.desc')}
          </p>
        </div>
        <div className="lp-features-grid">
          {features.map((feat, index) => (
            <div
              key={index}
              className="lp-feature-card"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.setProperty('--x', `${x}px`);
                e.currentTarget.style.setProperty('--y', `${y}px`);
              }}
            >
              <span className="lp-feature-card-badge">{feat.tag}</span>
              <div className="lp-feature-icon-wrapper">
                {feat.icon}
              </div>
              <h3 className="lp-feature-card-title">{feat.title}</h3>
              <p className="lp-feature-card-desc">{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Architecture Section (Desire/Credibility) */}
      <section className="lp-arch-section">
        <div className="lp-arch-grid">
          <div className="lp-arch-left">
            <span className="lp-arch-tag">{t('landing.arch.tag')}</span>
            <h2 className="lp-arch-title">
              {t('landing.arch.title')}
            </h2>
            <p className="lp-arch-desc">
              {t('landing.arch.desc')}
            </p>
            <div className="lp-arch-bullets">
              <div className="lp-arch-bullet">
                <ShieldCheck className="lp-arch-bullet-icon" size={20} />
                <span className="lp-arch-bullet-text">
                  {t('landing.arch.bullet1')}
                </span>
              </div>
              <div className="lp-arch-bullet">
                <Code className="lp-arch-bullet-icon" size={20} />
                <span className="lp-arch-bullet-text">
                  {t('landing.arch.bullet2')}
                </span>
              </div>
              <div className="lp-arch-bullet">
                <Server className="lp-arch-bullet-icon" size={20} />
                <span className="lp-arch-bullet-text">
                  {t('landing.arch.bullet3')}
                </span>
              </div>
            </div>
          </div>
          <div className="lp-arch-right">
            <div className="lp-arch-visual">
              <div className="lp-arch-node lp-arch-node-active">
                <div className="lp-arch-node-icon">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="lp-arch-node-title">{t('landing.arch.nodes.webhookTitle')}</div>
                  <div className="lp-arch-node-subtitle">{t('landing.arch.nodes.webhookDesc')}</div>
                </div>
              </div>
              <div className="lp-arch-line lp-arch-line-active" />
              <div className="lp-arch-node lp-arch-node-active">
                <div className="lp-arch-node-icon">
                  <Terminal size={18} />
                </div>
                <div>
                  <div className="lp-arch-node-title">{t('landing.arch.nodes.engineTitle')}</div>
                  <div className="lp-arch-node-subtitle">{t('landing.arch.nodes.engineDesc')}</div>
                </div>
              </div>
              <div className="lp-arch-line lp-arch-line-active" />
              <div className="lp-arch-node lp-arch-node-active">
                <div className="lp-arch-node-icon">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="lp-arch-node-title">{t('landing.arch.nodes.deliveryTitle')}</div>
                  <div className="lp-arch-node-subtitle">{t('landing.arch.nodes.deliveryDesc')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Details (Desire) */}
      <section className="lp-tech-section">
        <div style={{ textAlign: 'center' }}>
          <h2 className="lp-section-title" style={{ fontSize: '24px', marginBottom: '8px' }}>
            {t('landing.tech.title')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            {t('landing.tech.desc')}
          </p>
        </div>
        <div className="lp-tech-grid">
          {technologies.map((tech, i) => (
            <div key={i}>
              <h4 className="lp-tech-col-title">{tech.category}</h4>
              <ul className="lp-tech-list">
                {tech.items.map((item, idx) => (
                  <li key={idx} className="lp-tech-item">
                    <Check className="lp-tech-check" size={14} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer & Action CTA (Action) */}
      <footer className="lp-footer">
        <div className="lp-footer-cta">
          <h2 className="lp-footer-title">{t('landing.footer.title')}</h2>
          <p className="lp-footer-desc">
            {t('landing.footer.desc')}
          </p>
          <button onClick={handleStart} className="lp-btn-primary" style={{ margin: '0 auto' }}>
            {t('landing.footer.btn')}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="lp-footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} Vematize. {t('landing.footer.mit')}
          </div>
          <div className="lp-footer-links">
            <a 
              href="https://github.com/huneyoliv/vematize" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="lp-footer-link"
            >
              {t('landing.footer.github')}
            </a>
            <span style={{ color: 'rgba(255,255,255,0.06)' }}>|</span>
            <span style={{ color: '#64748b' }}>{t('landing.footer.openSource')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
