"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PublicLanding() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStart = () => {
    if (window.innerWidth < 1024) {
      setShowWarning(true);
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          --accent: #3b82f6;
          --accent-glow: rgba(59, 130, 246, 0.35);
          --bg: #0a0a0a;
          --surface: #141414;
          --surface-2: #1c1c1c;
          --border: #262626;
          --text: #f0f0f0;
          --text-muted: #888;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: inherit;
          overflow-x: hidden;
          overflow-y: auto;
        }

        /* ───── Ambient background ───── */
        .landing-bg-glow {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .landing-bg-glow::before {
          content: '';
          position: absolute;
          top: -30%;
          left: 50%;
          translate: -50% 0;
          width: 900px;
          height: 900px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
          opacity: 0.4;
          animation: bgPulse 8s ease-in-out infinite;
        }
        .landing-bg-glow::after {
          content: '';
          position: absolute;
          bottom: -20%;
          right: -10%;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
          opacity: 0.3;
          animation: bgPulse 10s ease-in-out 2s infinite;
        }
        @keyframes bgPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.5; }
        }

        /* ───── Grid overlay ───── */
        .landing-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        }

        /* ───── Navbar ───── */
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          backdrop-filter: blur(24px) saturate(1.2);
          background: rgba(10,10,10,0.7);
          border-bottom: 1px solid var(--border);
        }
        .landing-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text);
        }
        .landing-logo img {
          height: 36px;
          width: 36px;
        }
        .landing-logo span {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-ghost:hover {
          background: var(--surface);
          color: var(--text);
          border-color: #444;
        }
        .btn-primary {
          background: var(--accent);
          border: none;
          color: white;
          padding: 8px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          font-family: inherit;
          box-shadow: 0 0 20px var(--accent-glow);
        }
        .btn-primary:hover {
          background: #2563eb;
          box-shadow: 0 0 32px var(--accent-glow);
          transform: translateY(-1px);
        }

        /* ───── Hero ───── */
        .landing-hero {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 100px 24px 60px;
          max-width: 860px;
          margin: 0 auto;
        }

        .hero-title {
          font-size: clamp(42px, 6vw, 72px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -2px;
          margin: 0 0 24px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.7s 0.1s forwards;
        }
        .hero-title-gradient {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-subtitle {
          font-size: 18px;
          line-height: 1.7;
          color: var(--text-muted);
          max-width: 560px;
          margin: 0 0 40px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.7s 0.2s forwards;
        }
        .hero-cta {
          display: flex;
          align-items: center;
          gap: 16px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.7s 0.35s forwards;
        }
        .btn-hero {
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: none;
          color: white;
          padding: 14px 36px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
          box-shadow: 0 4px 30px rgba(99, 102, 241, 0.35);
        }
        .btn-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(99, 102, 241, 0.5);
        }
        .btn-hero-ghost {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s;
          font-family: inherit;
        }
        .btn-hero-ghost:hover {
          background: var(--surface);
          border-color: #444;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        /* ───── Preview mockup ───── */
        .landing-preview {
          position: relative;
          z-index: 1;
          max-width: 960px;
          margin: 0 auto 80px;
          padding: 0 24px;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.8s 0.65s forwards;
        }
        .preview-window {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03),
            0 24px 80px rgba(0,0,0,0.5),
            0 0 60px var(--accent-glow);
        }
        .preview-titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
        }
        .preview-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .preview-dot-red { background: #ef4444; }
        .preview-dot-yellow { background: #eab308; }
        .preview-dot-green { background: #22c55e; }
        .preview-body {
          display: grid;
          grid-template-columns: 200px 1fr 220px;
          height: 400px;
        }
        .preview-sidebar {
          border-right: 1px solid var(--border);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .preview-sidebar-item {
          height: 10px;
          background: var(--border);
          border-radius: 4px;
          width: 80%;
        }
        .preview-sidebar-item:nth-child(2) { width: 60%; }
        .preview-sidebar-item:nth-child(3) { width: 90%; }
        .preview-sidebar-item:nth-child(4) { width: 50%; }
        .preview-sidebar-item.active {
          background: var(--accent);
          opacity: 0.6;
        }
        .preview-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px;
        }
        .preview-canvas {
          width: 260px;
          height: 180px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1e1b4b 0%, #172554 50%, #0c1222 100%);
          border: 1px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .preview-canvas::after {
          content: '▶';
          font-size: 32px;
          color: rgba(255,255,255,0.3);
        }
        .preview-timeline {
          width: 100%;
          height: 48px;
          background: var(--surface-2);
          border-radius: 8px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 4px;
        }
        .preview-tl-block {
          height: 24px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .preview-tl-block:nth-child(1) { width: 80px; background: #2a5d8a; }
        .preview-tl-block:nth-child(2) { width: 120px; background: #5d8a2a; }
        .preview-tl-block:nth-child(3) { width: 60px; background: #8a2a5d; }
        .preview-tl-block:nth-child(4) { width: 100px; background: #2a5d8a; opacity: 0.6; }
        .preview-props {
          border-left: 1px solid var(--border);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .preview-prop-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .preview-prop-bar {
          height: 8px;
          background: var(--border);
          border-radius: 4px;
        }
        .preview-prop-bar-fill {
          height: 8px;
          background: var(--accent);
          border-radius: 4px;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .preview-body {
            grid-template-columns: 1fr;
            height: auto;
          }
          .preview-sidebar, .preview-props {
            display: none;
          }
          .preview-main {
            min-height: 260px;
          }
          .landing-nav {
            padding: 12px 20px;
          }
          .landing-hero {
            padding: 60px 20px 40px;
          }
        }

        /* ───── Features ───── */
        .landing-features {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }
        .features-label {
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--accent);
          margin-bottom: 12px;
        }
        .features-title {
          text-align: center;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          letter-spacing: -1px;
          margin: 0 0 60px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
        .feature-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px 28px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-glow), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover {
          border-color: #333;
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }
        .feature-card:hover::before {
          opacity: 1;
        }
        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 20px;
        }
        .feature-icon-blue {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
        }
        .feature-icon-purple {
          background: rgba(139, 92, 246, 0.12);
          color: #a78bfa;
        }
        .feature-icon-green {
          background: rgba(34, 197, 94, 0.12);
          color: #4ade80;
        }
        .feature-icon-pink {
          background: rgba(244, 114, 182, 0.12);
          color: #f472b6;
        }
        .feature-icon-amber {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
        }
        .feature-icon-cyan {
          background: rgba(6, 182, 212, 0.12);
          color: #22d3ee;
        }
        .feature-card h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .feature-card p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-muted);
          margin: 0;
        }

        /* ───── How it works ───── */
        .landing-steps {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 24px 100px;
        }
        .steps-label {
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #a78bfa;
          margin-bottom: 12px;
        }
        .steps-title {
          text-align: center;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          letter-spacing: -1px;
          margin: 0 0 60px;
        }
        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .step-row {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 28px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          transition: all 0.3s;
        }
        .step-row:hover {
          border-color: #333;
          background: var(--surface-2);
        }
        .step-number {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
        }
        .step-content h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 6px;
        }
        .step-content p {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.6;
        }
        @media (max-width: 640px) {
          .step-row {
            flex-direction: column;
            text-align: center;
          }
        }

        /* ───── CTA ───── */
        .landing-cta {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 80px 24px 120px;
        }
        .cta-box {
          max-width: 680px;
          margin: 0 auto;
          padding: 56px 40px;
          border-radius: 24px;
          background: var(--surface);
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }
        .cta-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
        }
        .cta-box h2 {
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 700;
          margin: 0 0 14px;
          letter-spacing: -0.5px;
        }
        .cta-box p {
          color: var(--text-muted);
          font-size: 16px;
          margin: 0 0 32px;
          line-height: 1.6;
        }

        /* ───── Footer ───── */
        .landing-footer {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 24px;
          border-top: 1px solid var(--border);
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ───── Entrance transitions ───── */
        .fade-in {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s, transform 0.6s;
        }
        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ───── Modal ───── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .modal-content {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
          max-width: 420px;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
        }
        .modal-content h3 {
          margin: 0 0 16px;
          font-size: 20px;
        }
        .modal-content p {
          margin: 0 0 24px;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.6;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
      `}</style>

      {/* Background effects */}
      <div className="landing-bg-glow" />
      <div className="landing-grid" />

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/angle-glow-icon_light.png" alt="Angle" />
          <span>Angle</span>
        </div>
        <div className="landing-nav-actions">
          <button className="btn-ghost" onClick={() => router.push("/login")}>
            Log in
          </button>
          <button className="btn-primary" onClick={handleStart}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <h1 className="hero-title">
          Visualize ideas.{" "}
          <span className="hero-title-gradient">Teach with clarity.</span>
        </h1>
        <p className="hero-subtitle">
          Angle is an AI-powered studio for creating educational animations
          and explainer videos — think 3Blue1Brown-style visuals, generated
          from your prompts in minutes.
        </p>
        <div className="hero-cta">
          <button className="btn-hero" onClick={handleStart}>
            Start Creating
          </button>
          <button
            className="btn-hero-ghost"
            onClick={() => {
              const el = document.getElementById("features");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            See How It Works
          </button>
        </div>
      </section>

      {/* Editor preview mockup */}
      <div className="landing-preview">
        <div className="preview-window">
          <div className="preview-titlebar">
            <span className="preview-dot preview-dot-red" />
            <span className="preview-dot preview-dot-yellow" />
            <span className="preview-dot preview-dot-green" />
          </div>
          <div className="preview-body">
            {/* Sidebar */}
            <div className="preview-sidebar">
              <div className="preview-sidebar-item active" />
              <div className="preview-sidebar-item" />
              <div className="preview-sidebar-item" />
              <div className="preview-sidebar-item" />
              <div
                className="preview-sidebar-item"
                style={{ marginTop: 16 }}
              />
              <div className="preview-sidebar-item" />
            </div>

            {/* Main canvas area */}
            <div className="preview-main">
              <div className="preview-canvas" />
              <div className="preview-timeline">
                <div className="preview-tl-block" />
                <div className="preview-tl-block" />
                <div className="preview-tl-block" />
                <div className="preview-tl-block" />
              </div>
            </div>

            {/* Properties panel */}
            <div className="preview-props">
              <div>
                <div className="preview-prop-label">Duration</div>
                <div className="preview-prop-bar" style={{ width: "70%" }} />
              </div>
              <div>
                <div className="preview-prop-label">Prompt</div>
                <div className="preview-prop-bar" />
                <div
                  className="preview-prop-bar"
                  style={{ width: "60%", marginTop: 6 }}
                />
              </div>
              <div>
                <div className="preview-prop-label">Voice</div>
                <div
                  className="preview-prop-bar-fill"
                  style={{ width: "45%" }}
                />
              </div>
              <div>
                <div className="preview-prop-label">Style</div>
                <div className="preview-prop-bar" style={{ width: "80%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="landing-features" id="features">
        <div className="features-label">Features</div>
        <h2 className="features-title">Everything you need to create</h2>
        <div className="features-grid">
          <div className={`feature-card ${mounted ? "fade-in visible" : "fade-in"}`}>
            <div className="feature-icon feature-icon-blue">🪄</div>
            <h3>AI Code Generation</h3>
            <p>
              Describe your scene and let AI instantly generate the Manim code 
              for your animations, ready to be rendered into video.
            </p>
          </div>
          <div className={`feature-card ${mounted ? "fade-in visible" : "fade-in"}`} style={{ transitionDelay: "0.1s" }}>
            <div className="feature-icon feature-icon-purple">🎬</div>
            <h3>Visual Timeline Editor</h3>
            <p>
              Arrange multiple layers of audio, trim content, and synchronize 
              with your single master video track on a professional timeline.
            </p>
          </div>
          <div className={`feature-card ${mounted ? "fade-in visible" : "fade-in"}`} style={{ transitionDelay: "0.2s" }}>
            <div className="feature-icon feature-icon-green">🎤</div>
            <h3>Narration & Audio</h3>
            <p>
              Upload your own music or record your voiceover. Layer audio 
              over your animations seamlessly.
            </p>
          </div>
          <div className={`feature-card ${mounted ? "fade-in visible" : "fade-in"}`} style={{ transitionDelay: "0.3s" }}>
            <div className="feature-icon feature-icon-pink">🎨</div>
            <h3>Animated Visuals</h3>
            <p>
              Generate clean, math-style animations, diagrams, and
              transitions that bring abstracts concepts to life.
            </p>
          </div>
          <div className={`feature-card ${mounted ? "fade-in visible" : "fade-in"}`} style={{ transitionDelay: "0.4s" }}>
            <div className="feature-icon feature-icon-amber">⚡</div>
            <h3>Instant Export</h3>
            <p>
              Export your finished lesson in HD. Download and share
              anywhere — ready for YouTube, class, or a slide deck.
            </p>
          </div>
          <div className={`feature-card ${mounted ? "fade-in visible" : "fade-in"}`} style={{ transitionDelay: "0.5s" }}>
            <div className="feature-icon feature-icon-cyan">☁️</div>
            <h3>Cloud Projects</h3>
            <p>
              Your work saves automatically. Pick up where you left off from any
              device, anytime.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-steps">
        <div className="steps-label">How It Works</div>
        <h2 className="steps-title">From concept to lesson in three steps</h2>
        <div className="steps-list">
          <div className="step-row">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Prompt your scene</h3>
              <p>
                Describe the exact animation you want. Angle&apos;s AI instantly
                generates the Manim code ready to be rendered.
              </p>
            </div>
          </div>
          <div className="step-row">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Edit on the timeline</h3>
              <p>
                Fine-tune your project in the visual editor. Adjust timing, add
                multiple layers of audio, and synchronize with your video.
              </p>
            </div>
          </div>
          <div className="step-row">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Export and share</h3>
              <p>
                Hit export to render your video in HD. Download the file or grab
                a shareable link instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <div className="cta-box">
          <h2>Ready to build your first lesson?</h2>
          <p>
            Join educators and creators using Angle to turn complex ideas into
            clear, animated explainers — in minutes, not hours.
          </p>
          <button className="btn-hero" onClick={handleStart}>
            Get Started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        © {new Date().getFullYear()} Angle. AI-powered animation studio.
      </footer>

      {/* Warning Modal for Mobile */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Desktop Recommended</h3>
            <p>
              For the best experience while editing and rendering animations, 
              we strongly recommend using a desktop or larger screen.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-primary" 
                onClick={() => setShowWarning(false)}
              >
                Go Back
              </button>
              <button 
                className="btn-ghost" 
                onClick={() => router.push("/login")}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
