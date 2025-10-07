import React, { useEffect, useMemo, useState } from "react";

// Tweet Crafter — single-file MVP
// Tailwind is available. No external API calls. Data is stored in localStorage.
// Exported as a single component for easy drop-in to a GitHub page or Next.js route.

const LS_KEY = "tweet_crafter_state_v1";

const frameworks = [
  { id: "freeform", label: "Freeform (polish only)" },
  { id: "aida", label: "AIDA (Attention → Interest → Desire → Action)" },
  { id: "pas", label: "PAS (Problem → Agitation → Solution)" },
  { id: "one_big_idea", label: "One Big Idea (hook → payoff)" },
  { id: "thread_tease", label: "Thread Tease (hook → 3 points → CTA)" },
  { id: "listicle", label: "List Hook (X things you’re missing)" },
];

const tones = [
  { id: "imperial", label: "Imperial" },
  { id: "quant", label: "Quant" },
  { id: "mentor", label: "Mentor" },
  { id: "provocative", label: "Provocative" },
  { id: "playful_threat", label: "Playful Threat" },
  { id: "minimal", label: "Minimal" },
];

const defaultState = {
  idea: "",
  framework: "one_big_idea",
  tone: "imperial",
  punchiness: 70, // 0-100 → shorter & punchier
  includeEmojis: false,
  includeHashtags: true,
  includeNumbers: true,
  useThread: false,
  threadCount: 4,
  variants: 3,
  savedPresets: [],
  customHashtags: "",
};

function clampTweet(text) {
  // X currently allows 280 characters. Respect that and append ellipsis if needed.
  const max = 280;
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026"; // ellipsis
}

function countChars(text) {
  return [...text].length; // handles emoji length better than text.length
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function suggestHashtags(text, custom) {
  const tags = new Set();
  const lc = text.toLowerCase();
  const dict = [
    { k: ["option", "greeks", "theta", "gamma"], t: ["#options", "#derivatives"] },
    { k: ["macro", "rates", "inflation", "bond"], t: ["#macro", "#markets"] },
    { k: ["oil", "energy", "uranium", "nuclear"], t: ["#energy", "#commodities"] },
    { k: ["ai", "model", "llm", "machine"], t: ["#AI", "#ML"] },
    { k: ["psychology", "bias", "heuristic"], t: ["#psychology", "#behavior"] },
    { k: ["wealth", "capital", "power"], t: ["#wealth", "#power"] },
  ];
  dict.forEach(({ k, t }) => {
    if (k.some((kw) => lc.includes(kw))) t.forEach((x) => tags.add(x));
  });
  custom
    .split(/[,\s]+/)
    .filter(Boolean)
    .forEach((t) => tags.add(t.startsWith("#") ? t : `#${t}`));
  return Array.from(tags).slice(0, 3); // max 3 tags
}

function sprinkleEmojis(text) {
  const bank = [
    "🔥",
    "⚡",
    "💎",
    "🧠",
    "📈",
    "🗝️",
    "🏹",
    "🦅",
    "🎯",
    "🧭",
  ];
  // simple heuristic: add 1-2 emojis at sentence ends if none exist
  if (/([\p{Emoji}\uFE0F])/u.test(text)) return text; // already has emoji
  const sentences = text.split(/(?<=[.!?])\s+/);
  const idx = Math.min(1, sentences.length - 1);
  sentences[sentences.length - 1] += ` ${pick(bank)}`;
  if (idx > 0) sentences[idx - 1] += ` ${pick(bank)}`;
  return sentences.join(" ");
}

function applyTone(text, tone) {
  const trims = {
    minimal: (s) => s.replace(/\s+/g, " ").replace(/[,;:]-/g, ", ").trim(),
    imperial: (s) => s.replace(/i\b/gi, "I").replace(/we\b/gi, "We"),
    mentor: (s) => `Breathe. ${s} Keep going.`,
    quant: (s) => s.replace(/(?<!\w)(very|really|super)\b/gi, ""),
    provocative: (s) => s + " Question your priors.",
    playful_threat: (s) => s + " Be nice or get priced out.",
  };
  const fn = trims[tone] || ((s) => s);
  return fn(text).replace(/\s{2,}/g, " ").trim();
}

function tighten(text, pct) {
  // crude compaction: shorten filler phrases based on punchiness
  const map = [
    [/\bthat\b/gi, ""],
    [/\bin order to\b/gi, "to"],
    [/\breally\b/gi, ""],
    [/\bvery\b/gi, ""],
    [/\bkind of\b/gi, ""],
    [/\bjust\b/gi, ""],
  ];
  let out = text;
  const passes = Math.round((pct / 100) * map.length) || 1;
  for (let i = 0; i < passes; i++) {
    const [re, rep] = map[i];
    out = out.replace(re, rep);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function frameworkCompose(framework, idea) {
  const core = idea.trim();
  switch (framework) {
    case "freeform":
      return core;
    case "aida": {
      const attn = core.split(/\n|\. /)[0] || core;
      return `${attn}\n\nYou want edge. Here’s interest → desire → action in one move: ${core}`;
    }
    case "pas": {
      return `Problem: ${core}.\nAgitation: Ignore it and you bleed opportunity.\nSolution: Here’s the move.`;
    }
    case "one_big_idea": {
      return `The one move: ${core}.\nMake it real today.`;
    }
    case "thread_tease": {
      return `Hook: ${core}.\n3 quick hits →\n1) Context\n2) Mechanics\n3) The angle\nRead on.`;
    }
    case "listicle": {
      const n = 3 + Math.floor(Math.random() * 3);
      return `${n} things you’re missing about ${core}:\n- First\n- Second\n- Third`;
    }
    default:
      return core;
  }
}

function toThread(text, parts = 4) {
  // naive splitter by sentence groups
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const chunkSize = Math.ceil(sentences.length / parts);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);
  }
  return chunks;
}

function withNumbers(chunks) {
  return chunks.map((c, i) => `${i + 1}/${chunks.length} ${c}`);
}

function craftVariant(state) {
  const { idea, framework, tone, punchiness, includeEmojis, includeHashtags, customHashtags } = state;
  let draft = frameworkCompose(framework, idea);
  draft = tighten(draft, punchiness);
  draft = applyTone(draft, tone);
  if (includeEmojis) draft = sprinkleEmojis(draft);
  if (includeHashtags) {
    const tags = suggestHashtags(idea, customHashtags);
    if (tags.length) draft = `${draft}\n${tags.join(" ")}`;
  }
  return clampTweet(draft);
}

export default function TweetCrafter() {
  const [state, setState] = useState(defaultState);
  const [output, setOutput] = useState([]); // array of string or array-of-threads
  const [copiedIndex, setCopiedIndex] = useState(-1);

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try { setState({ ...defaultState, ...JSON.parse(raw) }); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const charCounts = useMemo(() => output.map((o) => (Array.isArray(o) ? o.reduce((a, b) => a + countChars(b), 0) : countChars(o))), [output]);

  function generate() {
    const variants = [];
    for (let i = 0; i < state.variants; i++) {
      const v = craftVariant(state);
      if (state.useThread) {
        const parts = Math.max(2, Math.min(20, state.threadCount));
        const chunks = withNumbers(toThread(v, parts)).map(clampTweet);
        variants.push(chunks);
      } else {
        variants.push(v);
      }
    }
    setOutput(variants);
    setCopiedIndex(-1);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  function savePreset() {
    const { idea, savedPresets, ...preset } = state;
    const name = prompt("Preset name?")?.trim();
    if (!name) return;
    const next = [...state.savedPresets, { name, preset }];
    setState((s) => ({ ...s, savedPresets: next }));
  }

  function loadPreset(preset) {
    setState((s) => ({ ...s, ...preset }));
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold tracking-tight">Tweet Crafter</h1>
          <p className="mt-1 text-slate-400">Polish ideas into sharp tweets and threads. Local-first. No APIs.</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="text-sm text-slate-300">Idea / seed text</label>
              <textarea
                className="mt-1 w-full h-36 rounded-2xl bg-slate-900 border border-slate-800 p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Using options as insurance on concentrated equity risk; why gamma scalping beats 'diamond hands' in chop."
                value={state.idea}
                onChange={(e) => setState({ ...state, idea: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Framework</label>
              <select
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2"
                value={state.framework}
                onChange={(e) => setState({ ...state, framework: e.target.value })}
              >
                {frameworks.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300">Tone</label>
              <select
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2"
                value={state.tone}
                onChange={(e) => setState({ ...state, tone: e.target.value })}
              >
                {tones.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300">Punchiness</label>
              <input
                type="range"
                min={0}
                max={100}
                value={state.punchiness}
                onChange={(e) => setState({ ...state, punchiness: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-slate-400">Higher = tighter, fewer filler words.</div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Variants</label>
              <input
                type="number"
                min={1}
                max={8}
                value={state.variants}
                onChange={(e) => setState({ ...state, variants: parseInt(e.target.value || "1") })}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={state.includeEmojis} onChange={(e) => setState({ ...state, includeEmojis: e.target.checked })}/> Emojis</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={state.includeHashtags} onChange={(e) => setState({ ...state, includeHashtags: e.target.checked })}/> Hashtags</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={state.includeNumbers} onChange={(e) => setState({ ...state, includeNumbers: e.target.checked })}/> Number thread</label>
            </div>

            <div>
              <label className="text-sm text-slate-300">Custom hashtags (comma/space separated)</label>
              <input
                type="text"
                placeholder="#trading #risk"
                value={state.customHashtags}
                onChange={(e) => setState({ ...state, customHashtags: e.target.value })}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Thread parts</label>
              <input
                type="number"
                min={2}
                max={20}
                value={state.threadCount}
                onChange={(e) => setState({ ...state, threadCount: parseInt(e.target.value || "4") })}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={generate}
              className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow"
            >Generate</button>
            <button
              onClick={savePreset}
              className="px-5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >Save preset</button>
          </div>

          {/* Output */}
          <div className="mt-6 space-y-4">
            {output.length === 0 && (
              <div className="text-slate-400">Your variants will appear here. Build a thread by toggling "Number thread" and setting parts.</div>
            )}
            {output.map((variant, idx) => (
              <div key={idx} className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">{Array.isArray(variant) ? `Thread variant ${idx + 1}` : `Variant ${idx + 1}`}</div>
                  <div className="text-xs text-slate-400">{Array.isArray(variant) ? `${variant.length} tweets · total ${charCounts[idx]} chars` : `${countChars(variant)} / 280`}</div>
                </div>
                {Array.isArray(variant) ? (
                  <div className="mt-3 space-y-3">
                    {variant.map((t, i) => (
                      <div key={i} className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                        <div className="text-xs text-slate-500 mb-1">Tweet {i + 1}</div>
                        <div className="whitespace-pre-wrap">{t}</div>
                        <div className="text-right text-xs text-slate-500 mt-1">{countChars(t)} / 280</div>
                      </div>
                    ))}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => copyToClipboard(variant.join("\n\n"))} className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700">Copy thread</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="whitespace-pre-wrap">{variant}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-slate-500">{countChars(variant)} / 280</div>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(variant)} className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700">Copy</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Presets & Tips */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Presets</h2>
              <button
                onClick={() => setState((s) => ({ ...s, savedPresets: [] }))}
                className="text-xs text-slate-400 hover:text-slate-200"
                title="Clear all"
              >Clear</button>
            </div>
            <div className="mt-3 space-y-2">
              {state.savedPresets.length === 0 && (
                <div className="text-slate-500 text-sm">Save your favorite framework + tone + settings for quick reuse.</div>
              )}
              {state.savedPresets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(p.preset)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800"
                >{titleCase(p.name)}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <h2 className="text-lg font-semibold">Quick Tips</h2>
            <div className="mt-2 text-sm text-slate-400 space-y-2">
              <p><span className="text-slate-300">Hooks</span>: crisp payoff in 12–20 words. Name the edge, not the tool.</p>
              <p><span className="text-slate-300">Numbers</span>: swap adjectives for numbers (days, %'s, $). Credibility scales with specificity.</p>
              <p><span className="text-slate-300">Cadence</span>: 1 short line → 1 medium → 1 decisive CTA.</p>
              <p><span className="text-slate-300">CTA</span>: "Follow for deep dives", "Thread below", or a single stark question.</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <h2 className="text-lg font-semibold">Export</h2>
            <div className="mt-2 text-sm text-slate-400 space-y-2">
              <p>Use the Copy buttons, then paste into X. Threads copy as stacked tweets separated by blank lines.</p>
              <p>Flip to <span className="text-slate-300">Minimal</span> tone for ultra-tight voice when needed.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-6xl mx-auto text-center text-xs text-slate-500 mt-8">
        Built for velocity. Local-only. ✨
      </footer>
    </div>
  );
}
