"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileGate(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile && pathname === "/") {
    return (
      <div className="min-h-screen bg-black text-red-500 font-mono flex items-center justify-center px-6">
        <div className="text-center space-y-2">
          <div>ERROR: I/O Hardware Mismatch</div>
          <div>Route: / (typing terminal)</div>
          <div>Requirement: physical keyboard input.</div>
          <div>Action: open on Desktop or connect a keyboard.</div>
        </div>
      </div>
    );
  }

  return <>{props.children}</>;
}

