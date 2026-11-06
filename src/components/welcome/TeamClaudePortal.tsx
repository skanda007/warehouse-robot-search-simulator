"use client";

/**
 * Team Claude007 Welcome Experience
 * Powered by Glyph Portal © 2026 Christian Katzmann (MIT).
 * Scoped, scroll-driven glyph camera with seamless hand-off to Warehouse Autonomy.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import GlyphPortal from "@/components/ui/glyph-portal";
import { ArrowRight, Bot, Cpu, Network, Sparkles, X } from "lucide-react";

interface TeamClaudePortalProps {
  onEnter: () => void;
  onSkip?: () => void;
}

export function TeamClaudePortal({ onEnter, onSkip }: TeamClaudePortalProps) {
  const [face, setFace] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  // Load font with graceful fallback to system / Anton display font
  useEffect(() => {
    let settled = false;
    const finish = (value: string) => {
      if (!settled) {
        settled = true;
        setFace(value);
      }
    };

    // Attempt to load the specialized geometric font from 21st.dev mirror with timeout
    const font = new FontFace(
      "Glyph Portal Jakarta",
      'url("https://cdn.21st.dev/assets/mirror/15/153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79.woff2")',
      { weight: "400 700 900" }
    );

    const timeout = window.setTimeout(() => {
      finish('var(--font-display), "Arial Black", Impact, sans-serif');
    }, 1200);

    font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        finish('"Glyph Portal Jakarta", var(--font-display), "Arial Black", sans-serif');
      })
      .catch(() => {
        finish('var(--font-display), "Arial Black", Impact, sans-serif');
      });

    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, []);

  // One-shot completion handler
  const completeTransition = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setIsTransitioning(true);

    // Smooth fade hand-off to the main Warehouse Autonomy application
    window.setTimeout(() => {
      onEnter();
    }, 550);
  }, [onEnter]);

  // Intercept click on data-gp-enter to guarantee smooth scroll to the green screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("[data-gp-enter]");
      if (target) {
        e.preventDefault();
        // Smoothly scroll down the container to trigger the camera travel and stop at green screen
        const contentEl = container.querySelector("[data-gp-content]");
        if (contentEl) {
          contentEl.scrollIntoView({ behavior: "smooth" });
        } else {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, []);

  // Progress callback: purely telemetry. The green screen is a deliberate stopping point,
  // so we NEVER auto-transition to Overview on progress!
  const handleProgress = useCallback((_progress: number) => {
    // Deliberate stop: user must explicitly click "Launch Warehouse Workbench"
  }, []);

  return (
    <div
      ref={containerRef}
      data-claude-portal-root
      className={`fixed inset-0 z-[100] w-full h-[100svh] overflow-y-auto bg-[#fbfbfa] text-[#142b22] transition-opacity duration-500 ease-out ${
        isTransitioning ? "opacity-0 pointer-events-none scale-[1.02]" : "opacity-100"
      }`}
      style={{
        scrollBehavior: "smooth",
        fontFamily: face ?? '"Arial Black", sans-serif',
      }}
      tabIndex={0}
      role="region"
      aria-label="Team Claude007. Scroll to enter Warehouse Autonomy."
    >
      <style>{`
        /* Scoped styles strictly isolated within [data-claude-portal-root] */
        [data-claude-portal-root] {
          --gp-paper: #fbfbfa;
          --gp-ink: #10261d;
          --gp-field: #142b22;
          --gp-foreground: #fbfbfa;
        }

        [data-claude-portal-root] [data-gp-caption] {
          inset: calc(var(--gp-word-bottom, 50%) + 76px) 24px auto;
          justify-content: center;
        }

        [data-claude-portal-root] [data-gp-hint] {
          display: none;
        }

        [data-claude-portal-root] [data-gp-enter] {
          min-height: 48px;
          padding: 0 24px;
          gap: 20px;
          background: #142b22;
          border: 1px solid #10261d;
          border-radius: 9999px;
          color: #fbfbfa;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          box-shadow: 0 4px 14px rgba(20, 43, 34, 0.22);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        [data-claude-portal-root] [data-gp-enter]:hover {
          background: #1b3a2f;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(20, 43, 34, 0.3);
        }

        [data-claude-portal-root] [data-gp-enter]:focus-visible {
          outline: 2px solid #c8ff2e;
          outline-offset: 4px;
        }

        [data-claude-portal-root] [data-gp-touch-picker] {
          top: auto;
          bottom: 20px;
          left: 50%;
        }

        [data-claude-portal-root] [data-gp-select] {
          border-color: rgba(20, 43, 34, 0.15);
          border-radius: 8px;
          font-size: 12px;
          color: #626964;
          background: rgba(255, 255, 255, 0.8);
        }

        [data-portal-header] {
          position: absolute;
          inset: clamp(20px, 4vw, 40px) clamp(20px, 5vw, 60px) auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          z-index: 20;
          pointer-events: auto;
        }

        [data-portal-brand] {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        [data-portal-logo] {
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #10261d;
        }

        [data-portal-category] {
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #626964;
          padding-left: 12px;
          border-left: 1px solid rgba(20, 43, 34, 0.2);
        }

        [data-portal-eyebrow] {
          position: absolute;
          inset: auto 24px calc(100% - var(--gp-word-top, 35%) + 28px);
          margin: 0;
          text-align: center;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #626964;
        }

        [data-portal-support] {
          position: absolute;
          inset: calc(var(--gp-word-bottom, 50%) + 28px) 24px auto;
          margin: 0;
          text-align: center;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 15px;
          font-weight: 400;
          line-height: 1.5;
          color: #4a544e;
        }

        [data-portal-scroll] {
          position: absolute;
          inset: auto 24px 6%;
          text-align: center;
          font-family: var(--font-sans), system-ui, sans-serif;
          color: #7c817b;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        [data-claude-portal-root] [data-gp-content] {
          padding: 6rem clamp(1.5rem, 5vw, 5rem) 7rem;
          font-family: var(--font-sans), system-ui, sans-serif;
          color: #fbfbfa;
        }

        [data-portal-copy] {
          display: flex;
          width: min(100%, 76rem);
          margin: auto;
          flex-direction: column;
          align-items: flex-start;
          gap: clamp(2rem, 5vh, 3.5rem);
        }

        [data-portal-copy] h2 {
          max-width: 50rem;
          margin: 0;
          color: #fbfbfa;
          font-family: var(--font-display), "Arial Black", sans-serif;
          font-size: clamp(2rem, 1.4rem + 2.5vw, 3.25rem);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        [data-portal-features] {
          display: grid;
          width: 100%;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          [data-portal-features] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2.5rem;
          }
        }

        .portal-feature-item {
          border-top: 1px solid rgba(251, 251, 250, 0.25);
          padding-top: 1.25rem;
        }

        .portal-feature-item h3 {
          margin: 0;
          color: #fbfbfa;
          font-size: 1.125rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .portal-feature-item p {
          margin: 0.75rem 0 0;
          color: rgba(251, 251, 250, 0.85);
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .portal-no {
          display: inline-block;
          color: #c8ff2e;
          font-family: ui-monospace, monospace;
          font-size: 0.8125rem;
          font-weight: 700;
        }
      `}</style>

      {/* Top Header with Skip Action */}
      <div data-portal-header>
        <div data-portal-brand>
          <span data-portal-logo>Team Claude007</span>
          <span data-portal-category className="hidden sm:inline-block">
            Autonomous Warehouse Robotics
          </span>
        </div>

        <button
          onClick={onSkip ?? completeTransition}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#142b22] hover:text-[#10261d] bg-white/70 hover:bg-white backdrop-blur rounded-full border border-[#142b22]/15 shadow-sm transition-all cursor-pointer"
          aria-label="Skip intro and enter Warehouse Autonomy overview"
        >
          <span>Skip to Overview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {face ? (
        <GlyphPortal
          word="TEAM CLAUDE007"
          fontFamily={face}
          fontWeight={900}
          scrollLength={2.4}
          interactive={true}
          annotations={false}
          enterLabel="Enter the Warehouse"
          onProgress={handleProgress}
          style={{
            fontFamily: face,
            "--gp-paper": "#fbfbfa",
            "--gp-ink": "#10261d",
            "--gp-field": "#142b22",
            "--gp-foreground": "#fbfbfa",
          }}
          front={
            <>
              <p data-portal-eyebrow>A different perspective on AI search.</p>
              <p data-portal-support>
                Intelligent shelf retrieval using BFS, DFS &amp; Uniform-Cost Search.
              </p>
              <span data-portal-scroll>Scroll to step inside ↓</span>
            </>
          }
        >
          <div data-portal-copy>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-xs font-mono text-[#c8ff2e] tracking-wider uppercase mb-3">
                <Sparkles className="w-3 h-3 text-[#c8ff2e]" />
                Welcome to Warehouse Autonomy
              </div>
              <h2>Find the fastest path to the shelf.</h2>
            </div>

            <div data-portal-features>
              <div className="portal-feature-item">
                <h3>
                  <span className="portal-no">01</span>
                  <span>Optimal Graph Search</span>
                </h3>
                <p>
                  Evaluate thousands of warehouse grid states with Breadth-First, Depth-First, and
                  Uniform-Cost Search in real-time.
                </p>
              </div>

              <div className="portal-feature-item">
                <h3>
                  <span className="portal-no">02</span>
                  <span>Authoritative Engine</span>
                </h3>
                <p>
                  Deterministic search events generated by our pure Python search engine, streaming
                  frontier queues and cycle prevention directly to the UI.
                </p>
              </div>

              <div className="portal-feature-item">
                <h3>
                  <span className="portal-no">03</span>
                  <span>Explainable AI</span>
                </h3>
                <p>
                  Step-by-step natural language justification for every frontier expansion, cost
                  accumulation, and routing decision.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={completeTransition}
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#c8ff2e] text-[#0a0b0c] font-display text-sm tracking-wider uppercase font-black hover:bg-[#d4ff4e] shadow-lg shadow-[#c8ff2e]/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#c8ff2e] focus-visible:outline-offset-4 cursor-pointer"
              >
                <span>Launch Warehouse Workbench</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </GlyphPortal>
      ) : (
        <div
          role="status"
          style={{
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "#555",
            fontSize: 14,
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#142b22] border-t-transparent animate-spin" />
            <span className="font-mono text-xs text-[#142b22]/70 uppercase tracking-widest">
              Initializing Team Claude007 Portal…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
