import { useEffect, useMemo, useState } from "react";
import type { Bean, BrewLog, TasteTag } from "../types";
import { addBrew, listBeans, uuid } from "../db";
import { makeSuggestion } from "../suggest";

const TAGS: { id: TasteTag; label: string }[] = [
  { id: "sour", label: "sauer" },
  { id: "bitter", label: "bitter" },
  { id: "watery", label: "wässrig" },
  { id: "harsh", label: "harsch" },
  { id: "flat", label: "flach" },
];

export default function BrewScreen() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [beanId, setBeanId] = useState<string>("");
  const [coffeeGrams, setCoffeeGrams] = useState<number>(18);
  const [timeSeconds, setTimeSeconds] = useState<number>(120);
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
          {selectedBean ? "Methode. Aeropress" : "Lege zuerst eine Bohne an"}
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
