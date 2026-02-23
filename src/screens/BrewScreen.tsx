import { useEffect, useMemo, useState } from "react";
import type { Bean, BrewLog, TasteTag } from "../types";
import { addBrew, listBeans, uuid } from "../db";
import { makeSuggestion } from "../suggest";
import { Coffee, Filter, Snowflake, CupSoda, Gauge } from "lucide-react";

type BrewMethod =
  | "Siebträger"
  | "Aeropress"
  | "Pour Over"
  | "French Press"
  | "Cold Brew Aeropress";

const METHODS: { id: BrewMethod; label: string }[] = [
  { id: "Aeropress", label: "Aeropress" },
  { id: "Siebträger", label: "Siebträger" },
  { id: "Pour Over", label: "Pour Over" },
  { id: "French Press", label: "French Press" },
  { id: "Cold Brew Aeropress", label: "Cold Brew Aeropress" },
];

const DEFAULTS: Record<
  BrewMethod,
  {
    coffeeGrams: number;
    timeSeconds: number;
    hint: string;
  }
> = {
  Siebträger: {
    coffeeGrams: 17,
    timeSeconds: 25,
    hint: "Espresso Startpunkt: 17g in, 25s out. Danach: feinjustieren über Mahlgrad.",
  },
  Aeropress: {
    coffeeGrams: 18,
    timeSeconds: 120,
    hint: "Aeropress Startpunkt: 18g, 2:00. Danach: feiner oder länger für mehr Extraktion.",
  },
  "Pour Over": {
    coffeeGrams: 20,
    timeSeconds: 150,
    hint: "Pour Over Startpunkt: 20g, 2:30. Ziel: gleichmäßiger Flow und stabile Zeit.",
  },
  "French Press": {
    coffeeGrams: 30,
    timeSeconds: 240,
    hint: "French Press Startpunkt: 30g, 4:00. Eher grob mahlen. sanft pressen.",
  },
  "Cold Brew Aeropress": {
    coffeeGrams: 20,
    timeSeconds: 600,
    hint: "Cold Brew Startpunkt: 20g, 1:00 Rühren, 1:00 Ziehzeit. Danach pressen, Eis optional.",
  },
};

const TAGS: { id: TasteTag; label: string }[] = [
  { id: "sour", label: "sauer" },
  { id: "bitter", label: "bitter" },
  { id: "watery", label: "wässrig" },
  { id: "harsh", label: "harsch" },
  { id: "flat", label: "flach" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${seconds}s`;
  return `${m}:${String(s).padStart(2, "0")} min`;
}
function MethodIcon(props: { method: BrewMethod; active: boolean }) {
  const cls = "h-5 w-5";
  switch (props.method) {
    case "Siebträger":
      return <Coffee className={cls} />;
    case "Aeropress":
      return <Gauge className={cls} />;
    case "Pour Over":
      return <Filter className={cls} />;
    case "French Press":
      return <CupSoda className={cls} />;
    case "Cold Brew Aeropress":
      return <Snowflake className={cls} />;
  }
}
export default function BrewScreen() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [beanId, setBeanId] = useState<string>("");

  const [method, setMethod] = useState<BrewMethod>("Siebträger");
  const [coffeeGrams, setCoffeeGrams] = useState<number>(DEFAULTS["Siebträger"].coffeeGrams);
  const [timeSeconds, setTimeSeconds] = useState<number>(DEFAULTS["Siebträger"].timeSeconds);

  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [tags, setTags] = useState<TasteTag[]>([]);
  const [savedMessage, setSavedMessage] = useState<string>("");
  const [feedback, setFeedback] = useState<{ diagnosis: string; next: string; tips: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      const list = await listBeans();
      setBeans(list);
      if (list.length > 0) setBeanId((prev) => prev || list[0].id);
    })();
  }, []);

  const selectedBean = useMemo(() => beans.find((b) => b.id === beanId) ?? null, [beans, beanId]);

  const methodHint = DEFAULTS[method].hint;

  function applyMethodDefaults(next: BrewMethod) {
    const d = DEFAULTS[next];
    setCoffeeGrams(d.coffeeGrams);
    setTimeSeconds(d.timeSeconds);
  }

  function onChangeMethod(next: BrewMethod) {
    setMethod(next);
    applyMethodDefaults(next);
  }

  function toggleTag(t: TasteTag) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSave() {
    if (!beanId) {
      setSavedMessage("Bitte zuerst eine Bohne anlegen.");
      setTimeout(() => setSavedMessage(""), 1500);
      return;
    }

    const brew: BrewLog = {
      id: uuid(),
      beanId,
      methodId: "aeropress",
      coffeeGrams,
      timeSeconds,
      rating,
      tasteTags: tags,
      createdAt: Date.now(),
    };

    await addBrew(brew);

    const s = makeSuggestion(brew);
    setFeedback({ diagnosis: s.diagnosis, next: s.nextChange, tips: s.extraTips });

    setSavedMessage("Gespeichert.");
    setTimeout(() => setSavedMessage(""), 1200);
    setTags([]);
    setRating(3);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 text-sm font-semibold">Quick Log</div>

        <div className="text-xs text-neutral-600">Bohne</div>
        <select
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          value={beanId}
          onChange={(e) => setBeanId(e.target.value)}
        >
          {beans.length === 0 && <option value="">Keine Bohnen vorhanden</option>}
          {beans.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}{b.roaster ? ` . ${b.roaster}` : ""}
            </option>
          ))}
        </select>

        <div className="mt-3 text-xs text-neutral-600">Brühverfahren</div>
        <select
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          value={method}
          onChange={(e) => onChangeMethod(e.target.value as BrewMethod)}
        >
          {METHODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select><div className="mt-3 text-xs text-neutral-600">Brühverfahren</div>

<div className="mt-2 flex gap-2 overflow-x-auto pb-1">
  {METHODS.map((m) => {
    const active = method === m.id;
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => onChangeMethod(m.id)}
        className={[
          "flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-xs",
          active
            ? "bg-neutral-900 text-white border-neutral-900"
            : "bg-white text-neutral-700 border-neutral-200",
        ].join(" ")}
        aria-pressed={active}
      >
        <MethodIcon method={m.id} active={active} />
        <span className={active ? "font-semibold" : ""}>{m.label}</span>
      </button>
    );
  })}
</div>

        <div className="mt-2 text-xs text-neutral-600">
          Empfehlung. {DEFAULTS[method].coffeeGrams}g . {formatTime(DEFAULTS[method].timeSeconds)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">{methodHint}</div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumberField label="Kaffee (g)" value={coffeeGrams} onChange={setCoffeeGrams} min={1} />
          <NumberField label="Dauer (s)" value={timeSeconds} onChange={setTimeSeconds} min={1} />
        </div>

        <div className="mt-3">
          <div className="text-xs text-neutral-600">Rating</div>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n as 1 | 2 | 3 | 4 | 5)}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-xl border text-sm",
                  rating === n ? "bg-neutral-900 text-white" : "bg-white",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-neutral-600">Taste Tags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={[
                  "rounded-full border px-3 py-1 text-xs",
                  tags.includes(t.id) ? "bg-neutral-900 text-white" : "bg-white",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onSave}
          className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Speichern
        </button>

        <div className="mt-2 text-xs text-neutral-600">
          {selectedBean ? `Gewählt. ${method}` : "Lege zuerst eine Bohne an"}
        </div>

        {savedMessage && <div className="mt-2 text-xs text-emerald-700">{savedMessage}</div>}
      </Card>

      {feedback && (
        <Card>
          <div className="text-sm font-semibold">Feedback</div>
          <div className="mt-2 text-sm">{feedback.diagnosis}</div>
          <div className="mt-2 text-sm text-neutral-700">{feedback.next}</div>
          {feedback.tips.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">
              {feedback.tips.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function Card(props: { children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm">{props.children}</div>;
}

function NumberField(props: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div>
      <div className="text-xs text-neutral-600">{props.label}</div>
      <input
        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
        type="number"
        value={props.value}
        min={props.min ?? 0}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}
