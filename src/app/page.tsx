"use client";

import React, { useEffect, useState } from "react";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { TeamClaudePortal } from "@/components/welcome/TeamClaudePortal";

export default function HomePage() {
  const [showPortal, setShowPortal] = useState<boolean | null>(null);

  useEffect(() => {
    // Check URL parameters for explicit override
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setShowPortal(true);
      return;
    }
    if (params.get("skip") === "1") {
      setShowPortal(false);
      return;
    }

    // Check if user has already entered in this browser session
    const seen = sessionStorage.getItem("wa_welcome_seen");
    if (seen === "1") {
      setShowPortal(false);
    } else {
      setShowPortal(true);
    }
  }, []);

  const handlePortalEnter = () => {
    sessionStorage.setItem("wa_welcome_seen", "1");
    setShowPortal(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  // Pre-hydration or initial mount fallback: render overview in background
  if (showPortal === null) {
    return <OverviewPage />;
  }

  return (
    <>
      {showPortal && (
        <TeamClaudePortal
          onEnter={handlePortalEnter}
          onSkip={handlePortalEnter}
        />
      )}
      <OverviewPage onReplayWelcome={() => setShowPortal(true)} />
    </>
  );
}
