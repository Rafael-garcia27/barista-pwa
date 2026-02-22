import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Coffee, Database } from "lucide-react";
import BrewScreen from "./screens/BrewScreen";
import LogbookScreen from "./screens/LogbookScreen";
import BeansScreen from "./screens/BeansScreen";
import { seedIfEmpty } from "./db";

type TabId = "brew" | "logbook" | "beans";

export default function App() {
  const [tab, setTab] = useState<TabId>("brew");

  useEffect(() => {
    seedIfEmpty();
  }, []);

  const title = useMemo(() => {
    if (tab === "brew") return "Brühen";
    if (tab === "logbook") return "Logbuch";
    return "Bohnen";
  }, [tab]);

  return (
    <div className="min-h-full bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="px-4 py-3">
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-xs text-neutral-600">Barista PWA. lokal gespeichert</div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4">
          {tab === "brew" && <BrewScreen />}
          {tab === "logbook" && <LogbookScreen />}
          {tab === "beans" && <BeansScreen />}
        </main>

        <nav className="sticky bottom-0 border-t bg-white">
          <div className="grid grid-cols-3">
            <TabButton
              active={tab === "brew"}
              onClick={() => setTab("brew")}
              label="Brühen"
              icon={<Coffee className="h-5 w-5" />}
            />
            <TabButton
              active={tab === "logbook"}
              onClick={() => setTab("logbook")}
              label="Logbuch"
              icon={<BookOpen className="h-5 w-5" />}
            />
            <TabButton
              active={tab === "beans"}
              onClick={() => setTab("beans")}
              label="Bohnen"
              icon={<Database className="h-5 w-5" />}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      className={[
        "flex flex-col items-center gap-1 px-2 py-3 text-xs",
        props.active ? "text-neutral-900" : "text-neutral-500",
      ].join(" ")}
      aria-current={props.active ? "page" : undefined}
    >
      {props.icon}
      <span className={props.active ? "font-semibold" : ""}>{props.label}</span>
    </button>
  );
}
