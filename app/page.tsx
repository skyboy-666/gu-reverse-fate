"use client";

import { useEffect, useMemo, useState } from "react";

type IntelId = "scorch" | "ledger" | "tunnel" | "witness" | "formula";
type GuId = "moon" | "jade" | "wine" | "listen" | "hide" | "cold" | "mist";

type GameState = {
  day: number;
  ap: number;
  stones: number;
  essence: number;
  owned: GuId[];
  equipped: GuId[];
  intel: IntelId[];
  visited: string[];
  materials: { fire: number; jade: number; orchid: number };
  journal: string[];
  refined: GuId | null;
  ending: string | null;
};

const initialState: GameState = {
  day: 1,
  ap: 6,
  stones: 9,
  essence: 10,
  owned: ["moon", "jade", "wine"],
  equipped: ["moon", "jade"],
  intel: [],
  visited: [],
  materials: { fire: 0, jade: 0, orchid: 0 },
  journal: ["月兰田一夜枯黄。五日后家族议事，在此之前，你必须找出能左右局势的证据。"],
  refined: null,
  ending: null,
};

const guBook: Record<GuId, { name: string; school: string; cost: number; glyph: string; desc: string }> = {
  moon: { name: "月刃蛊", school: "攻伐", cost: 2, glyph: "弦", desc: "斩开阻路藤蔓，也会留下明显痕迹。" },
  jade: { name: "玉肤蛊", school: "防御", cost: 2, glyph: "甲", desc: "抵御瘴气与反噬，适合正面探查。" },
  wine: { name: "醇元蛊", school: "修行", cost: 1, glyph: "酿", desc: "精炼真元，休整时额外恢复二点。" },
  listen: { name: "地听蛊", school: "侦察", cost: 1, glyph: "听", desc: "辨明地下异响，开启被掩埋的路线。" },
  hide: { name: "隐鳞蛊", school: "潜行", cost: 2, glyph: "隐", desc: "避开耳目，窃取无法公开取得的证据。" },
  cold: { name: "寒息蛊", school: "水道", cost: 3, glyph: "霜", desc: "压制火粉蔓延，是稳妥而公开的解法。" },
  mist: { name: "迷烟蛊", school: "变化", cost: 2, glyph: "雾", desc: "炼制异变所得，适合制造情报差。" },
};

const intelBook: Record<IntelId, { name: string; source: string; trust: string; effect: string }> = {
  scorch: { name: "叶脉灼痕", source: "亲眼所见", trust: "证实", effect: "证明枯萎并非虫害，炼蛊可判断火性。" },
  ledger: { name: "商队囤货账册", source: "暗中取得", trust: "证实", effect: "解锁揭发与施压路线，炼制异蛊时可顺势布局。" },
  tunnel: { name: "田下空响", source: "地听推演", trust: "可信", effect: "开启地下遗藏结局，并降低探索风险。" },
  witness: { name: "更夫证词", source: "人物证言", trust: "可信", effect: "将火粉与商队夜行者联系起来。" },
  formula: { name: "残缺寒方", source: "旧札残页", trust: "可疑", effect: "显示寒息蛊三段炼法，但第二段缺失。" },
};

const endings: Record<string, { title: string; mark: string; text: string }> = {
  expose: { title: "借刀清局", mark: "智", text: "账册与灼痕同时呈上，商队无法抵赖。你借家族之手清除了操纵月兰价格的人，却把真正的地下异动藏进了自己的袖中。" },
  clan: { title: "封田止损", mark: "稳", text: "家族接受了你的证据，月兰田被暂时封锁。损失得以控制，但有人趁混乱带走了地下真正珍贵的东西。" },
  legacy: { title: "暗渡遗藏", mark: "秘", text: "你没有惊动任何势力，借地听蛊循声而下。地脉深处并非火源，而是一处被人为唤醒的残破传承。" },
  bargain: { title: "两面为契", mark: "谋", text: "寒雾覆盖枯田，你用解法换家族信任，又用沉默换商队元石。没有永远的盟友，只有仍然有效的筹码。" },
};

function addUnique<T>(list: T[], value: T) {
  return list.includes(value) ? list : [...list, value];
}

export default function Home() {
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"map" | "gu" | "intel">("map");
  const [notice, setNotice] = useState<string | null>(null);
  const [refine, setRefine] = useState<{ phase: number; choices: string[] } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gu-reverse-fate-save-v2");
    if (saved) {
      try { setGame(JSON.parse(saved)); } catch { /* ignore damaged local saves */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("gu-reverse-fate-save-v2", JSON.stringify(game));
  }, [game, hydrated]);

  const clueScore = game.intel.length;
  const objective = game.refined
    ? "证据与手段已经齐备。前往议事堂，决定谁来承担代价。"
    : clueScore >= 3
      ? "情报已经串成线索。备齐赤蛊粉与寒玉屑，尝试炼出破局之蛊。"
      : "调查月兰田周边，取得至少三条互相印证的情报。";

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const act = (cost: number, fn: (draft: GameState) => GameState) => {
    if (game.ending) return;
    if (game.ap < cost) { toast("行动力不足。回到居所休整，局势也会向前推进。"); return; }
    setGame(current => fn({ ...current, ap: current.ap - cost }));
  };

  const log = (g: GameState, entry: string) => ({ ...g, journal: [entry, ...g.journal].slice(0, 8) });

  const visit = (id: string) => {
    if (game.visited.includes(id)) { toast("此处本旬已搜查过，换一条线索吧。"); return; }
    switch (id) {
      case "field":
        act(1, g => log({ ...g, visited: [...g.visited, id], intel: addUnique(g.intel, "scorch"), materials: { ...g.materials, fire: g.materials.fire + 1 } }, "你剥开枯叶，叶脉里凝着赤色粉末。火性由内而生——这不是普通虫害。获得【叶脉灼痕】与赤蛊粉。"));
        break;
      case "grove":
        act(1, g => log({ ...g, visited: [...g.visited, id], owned: addUnique(g.owned, "listen"), materials: { ...g.materials, orchid: g.materials.orchid + 1 } }, "竹林腐叶下，一只幼蛊正随地脉震动开合。你以月兰引诱，收服【地听蛊】。"));
        break;
      case "watch":
        act(1, g => log({ ...g, visited: [...g.visited, id], intel: addUnique(g.intel, "witness") }, "更夫起初闭口不言。见你亮出灼痕，他才承认：昨夜有披商队短氅的人从田边离开。获得【更夫证词】。"));
        break;
      case "cave": {
        const canHear = game.equipped.includes("listen");
        act(2, g => canHear
          ? log({ ...g, visited: [...g.visited, id], intel: addUnique(g.intel, "tunnel"), materials: { ...g.materials, jade: g.materials.jade + 1 } }, "地听蛊分辨出岩后空腔。你避过塌陷，取到寒玉屑，并确认暗道直通月兰田。获得【田下空响】。")
          : log({ ...g, visited: [...g.visited, id], essence: Math.max(0, g.essence - 2), materials: { ...g.materials, jade: g.materials.jade + 1 } }, "你强行凿开石隙，虽取得寒玉屑，却因塌石损耗真元。若携带侦察蛊，也许能听见更深处的秘密。"));
        break;
      }
      case "shrine":
        act(1, g => log({ ...g, visited: [...g.visited, id], owned: addUnique(g.owned, "hide"), intel: addUnique(g.intel, "formula") }, "荒祠供桌夹层藏着一张残方，鳞粉中还蜷着沉眠的【隐鳞蛊】。残方记载了压制火性的炼法。"));
        break;
      case "caravan": {
        if (game.equipped.includes("hide")) {
          act(2, g => log({ ...g, visited: [...g.visited, id], intel: addUnique(g.intel, "ledger"), stones: g.stones + 2 }, "隐鳞遮去身形，你潜入账房抄走囤货记录，还顺走两枚元石。获得【商队囤货账册】。"));
        } else if (game.stones >= 3) {
          act(2, g => log({ ...g, stones: g.stones - 3, visited: [...g.visited, id], intel: addUnique(g.intel, "ledger") }, "你以三枚元石买通账房学徒。账册显示，商队在枯萎前便大量囤入月兰。获得【商队囤货账册】。"));
        } else toast("商队守卫森严。携带隐鳞蛊，或准备三枚元石买通账房学徒。");
        break;
      }
    }
  };

  const rest = () => {
    if (game.day >= 5) { toast("五日之期已至，议事堂正在等你的答案。"); return; }
    setGame(g => log({ ...g, day: g.day + 1, ap: 6, essence: g.equipped.includes("wine") ? 12 : 10, visited: [] }, `第${g.day + 1}日。田价继续上涨，所有地点可以重新调查。`));
  };

  const toggleGu = (id: GuId) => {
    if (game.equipped.includes(id)) {
      setGame(g => ({ ...g, equipped: g.equipped.filter(x => x !== id) }));
    } else if (game.equipped.length >= 3) toast("本次最多编组三只蛊。先卸下一只再调整。");
    else setGame(g => ({ ...g, equipped: [...g.equipped, id] }));
  };

  const beginRefine = () => {
    if (!game.intel.includes("formula")) { toast("你还不知道如何处理火性。荒祠里或许留有旧方。"); return; }
    if (game.materials.fire < 1 || game.materials.jade < 1) { toast("炼制需要赤蛊粉与寒玉屑。分别可在月兰田、石隙取得。"); return; }
    setRefine({ phase: 1, choices: [] });
  };

  const refineChoice = (choice: string) => {
    if (!refine) return;
    if (choice === "stop") {
      setGame(g => log(g, "你在失控前主动停炼，保住了主材。失败原因明确：准备尚未足够，而你选择了止损。"));
      setRefine(null);
      return;
    }
    const choices = [...refine.choices, choice];
    if (refine.phase < 3) { setRefine({ phase: refine.phase + 1, choices }); return; }

    const hasProof = game.intel.includes("scorch");
    const hasLedger = game.intel.includes("ledger");
    let result: GuId | null = null;
    let message = "火水相冲，蛊胚碎裂。失败原因：你在终局强封，却没有用已知灼痕校准火性。";
    if (choices[0] === "purify" && choices[1] === "suppress" && choice === "seal" && hasProof) {
      result = "cold";
      message = "火性被逐层剥离，寒息凝而不散。【寒息蛊】炼成。每一步都来自已掌握的灼痕与残方。";
    } else if (choices.includes("adapt") && choices.includes("guide") && hasLedger) {
      result = "mist";
      message = "你没有强求原方，反以账册所示的月兰比例引导异变。【迷烟蛊】炼成——失败的原方，成了新的手段。";
    }
    setGame(g => log({ ...g, materials: { ...g.materials, fire: g.materials.fire - 1, jade: g.materials.jade - 1 }, refined: result, owned: result ? addUnique(g.owned, result) : g.owned }, message));
    setRefine(null);
    toast(result ? `炼制成功：${guBook[result].name}` : "炼制失败，但原因已经记录");
  };

  const availableEndings = useMemo(() => ({
    expose: game.intel.includes("ledger") && game.intel.includes("scorch"),
    clan: game.intel.includes("scorch") && clueScore >= 2,
    legacy: game.intel.includes("tunnel") && game.equipped.includes("listen"),
    bargain: clueScore >= 4 && Boolean(game.refined),
  }), [game, clueScore]);

  const chooseEnding = (id: string) => {
    if (!availableEndings[id as keyof typeof availableEndings]) return;
    setGame(g => ({ ...g, ending: id }));
  };

  const reset = () => {
    if (!window.confirm("确定抹去当前进度，从第一日重新开始？")) return;
    localStorage.removeItem("gu-reverse-fate-save-v2");
    setGame(initialState);
    setTab("map");
  };

  if (!hydrated) return <main className="loading"><span className="seal">蛊</span><p>命数推演中…</p></main>;

  if (game.ending) {
    const ending = endings[game.ending];
    return (
      <main className="ending-screen">
        <div className="ending-moon" />
        <section className="ending-card">
          <p className="eyebrow">月兰田疑云 · 终局</p>
          <div className="ending-mark">{ending.mark}</div>
          <h1>{ending.title}</h1>
          <p className="ending-copy">{ending.text}</p>
          <div className="ending-stats">
            <span>用时 <b>{game.day} 日</b></span><span>情报 <b>{clueScore}/5</b></span><span>炼蛊 <b>{game.refined ? guBook[game.refined].name : "未成"}</b></span>
          </div>
          <button className="primary wide" onClick={reset}>再逆一次命</button>
          <p className="fan-note">非官方同人玩法原型 · 未使用小说正文或官方美术</p>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      {notice && <div className="toast" role="status">{notice}</div>}
      <header className="topbar">
        <div className="brand"><span className="brand-seal">蛊</span><div><p>GU · REVERSE FATE</p><h1>蛊界：逆命</h1></div></div>
        <div className="top-actions"><button className="quiet" onClick={reset} aria-label="重新开始">重置</button></div>
      </header>

      <section className="status-ribbon" aria-label="当前资源">
        <div><small>时限</small><strong>第 {game.day} / 5 日</strong></div>
        <div><small>行动</small><strong>{game.ap} / 6</strong></div>
        <div><small>真元</small><strong>{game.essence}</strong></div>
        <div><small>元石</small><strong>{game.stones}</strong></div>
        <div className="evidence"><small>证据链</small><strong>{clueScore} / 5</strong><i style={{ width: `${clueScore * 20}%` }} /></div>
      </section>

      <section className="objective"><span>当前目标</span><p>{objective}</p><div className="deadline">议事 · {5 - game.day} 日后</div></section>

      <nav className="mobile-tabs" aria-label="游戏视图">
        <button className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>局势</button>
        <button className={tab === "gu" ? "active" : ""} onClick={() => setTab("gu")}>蛊匣 · {game.equipped.length}/3</button>
        <button className={tab === "intel" ? "active" : ""} onClick={() => setTab("intel")}>情报 · {clueScore}</button>
      </nav>

      <div className="board">
        <section className={`map-panel panel ${tab !== "map" ? "mobile-hidden" : ""}`}>
          <div className="panel-heading"><div><span>青茅山南麓</span><h2>月兰田疑云</h2></div><p>点击地点展开行动</p></div>
          <div className="map-grid">
            <MapNode id="field" name="枯萎月兰田" tag="案发地" cost={1} symbol="兰" visited={game.visited.includes("field")} onVisit={visit} />
            <MapNode id="grove" name="青竹林" tag="蛊息" cost={1} symbol="竹" visited={game.visited.includes("grove")} onVisit={visit} />
            <MapNode id="watch" name="西坡更楼" tag="人证" cost={1} symbol="更" visited={game.visited.includes("watch")} onVisit={visit} />
            <MapNode id="cave" name="断崖石隙" tag={game.equipped.includes("listen") ? "可听地脉" : "塌陷风险"} cost={2} symbol="岩" visited={game.visited.includes("cave")} onVisit={visit} special={game.equipped.includes("listen")} />
            <MapNode id="shrine" name="无名荒祠" tag="残方" cost={1} symbol="祠" visited={game.visited.includes("shrine")} onVisit={visit} />
            <MapNode id="caravan" name="山下商队" tag={game.equipped.includes("hide") ? "可潜入" : "守卫森严"} cost={2} symbol="商" visited={game.visited.includes("caravan")} onVisit={visit} special={game.equipped.includes("hide")} />
          </div>
          <div className="map-footer"><button className="rest-button" onClick={rest}><span>居所休整</span><small>行动回满 · 推进一日</small></button><button className="refine-button" onClick={beginRefine}><span>开炉炼蛊</span><small>{game.materials.fire} 赤粉 · {game.materials.jade} 寒玉</small></button></div>
        </section>

        <aside className={`gu-panel panel ${tab !== "gu" ? "mobile-hidden" : ""}`}>
          <div className="panel-heading compact"><div><span>携带上限 · 三只</span><h2>百蛊匣</h2></div><p>搭配改变解法</p></div>
          <div className="gu-list">
            {game.owned.map(id => {
              const gu = guBook[id]; const active = game.equipped.includes(id);
              return <button key={id} className={`gu-card ${active ? "equipped" : ""}`} onClick={() => toggleGu(id)} aria-pressed={active}>
                <span className="gu-glyph">{gu.glyph}</span><span className="gu-info"><b>{gu.name}</b><small>{gu.school} · 耗元 {gu.cost}</small><em>{gu.desc}</em></span><span className="equip-mark">{active ? "已编组" : "编入"}</span>
              </button>;
            })}
          </div>
          <div className="materials"><span>炼材</span><b>赤蛊粉 ×{game.materials.fire}</b><b>寒玉屑 ×{game.materials.jade}</b><b>月兰 ×{game.materials.orchid}</b></div>
        </aside>

        <aside className={`intel-panel panel ${tab !== "intel" ? "mobile-hidden" : ""}`}>
          <div className="panel-heading compact"><div><span>来源 · 可信度 · 作用</span><h2>情报簿</h2></div><p>{clueScore}/5 已掌握</p></div>
          <div className="intel-list">
            {game.intel.length === 0 && <div className="empty-state"><span>?</span><p>真正值钱的不是消息，<br/>而是消息带来的新选择。</p></div>}
            {game.intel.map(id => { const item = intelBook[id]; return <article className="intel-card" key={id}><div><b>{item.name}</b><span>{item.trust}</span></div><small>来源 · {item.source}</small><p>{item.effect}</p></article>; })}
          </div>
          <div className="journal"><h3>近事录</h3>{game.journal.slice(0, 3).map((entry, i) => <p key={`${entry}-${i}`} className={i === 0 ? "latest" : ""}>{entry}</p>)}</div>
        </aside>
      </div>

      <section className="conclusion panel">
        <div className="conclusion-title"><div><span>所有证据都只是筹码</span><h2>你准备如何收局？</h2></div><p>条件满足后，可随时结束本局</p></div>
        <div className="ending-options">
          <EndingButton enabled={availableEndings.expose} title="揭发商队" desc="需：灼痕＋账册" mark="智" onClick={() => chooseEnding("expose")} />
          <EndingButton enabled={availableEndings.clan} title="请家族封田" desc="需：灼痕＋另一情报" mark="稳" onClick={() => chooseEnding("clan")} />
          <EndingButton enabled={availableEndings.legacy} title="独探地下" desc="需：空响＋编组地听蛊" mark="秘" onClick={() => chooseEnding("legacy")} />
          <EndingButton enabled={availableEndings.bargain} title="两面交易" desc="需：四情报＋成蛊" mark="谋" onClick={() => chooseEnding("bargain")} />
        </div>
      </section>

      <footer><span>非官方同人玩法原型 · 本地自动存档</span><span>一切选择，皆有代价</span></footer>

      {refine && <RefineModal phase={refine.phase} choices={refine.choices} intel={game.intel} onChoice={refineChoice} onClose={() => setRefine(null)} />}
    </main>
  );
}

function MapNode({ id, name, tag, cost, symbol, visited, special, onVisit }: { id: string; name: string; tag: string; cost: number; symbol: string; visited: boolean; special?: boolean; onVisit: (id: string) => void }) {
  return <button className={`map-node ${visited ? "visited" : ""} ${special ? "special" : ""}`} onClick={() => onVisit(id)}><span className="node-symbol">{symbol}</span><span className="node-copy"><b>{name}</b><small>{visited ? "本旬已查" : tag}</small></span><span className="node-cost">-{cost}</span></button>;
}

function EndingButton({ enabled, title, desc, mark, onClick }: { enabled: boolean; title: string; desc: string; mark: string; onClick: () => void }) {
  return <button disabled={!enabled} className="ending-option" onClick={onClick}><span>{mark}</span><div><b>{title}</b><small>{enabled ? "条件已满足" : desc}</small></div><i>{enabled ? "可选" : "未解锁"}</i></button>;
}

function RefineModal({ phase, choices, intel, onChoice, onClose }: { phase: number; choices: string[]; intel: IntelId[]; onChoice: (choice: string) => void; onClose: () => void }) {
  const content = [
    { title: "第一炼 · 材性相冲", body: "赤蛊粉忽明忽暗，寒玉表面生出裂纹。灼痕情报显示火性藏于粉心。", options: [["purify", "逐层净化", "遵循灼痕，将火性剥离"], ["adapt", "保留异性", "接受偏离原方的可能"], ["stop", "主动停炼", "回收主材，不承担反噬"]] },
    { title: "第二炼 · 蛊胚异变", body: choices[0] === "purify" ? "杂质已经析出，蛊胚却仍不稳定。残方在此处恰好缺了一行。" : "火粉化为淡雾。原方已经失效，但异变似乎可以引导。", options: [["suppress", "寒玉压制", "求稳，强制回到原方"], ["guide", "顺势引导", "利用已有情报炼成变种"], ["stop", "主动停炼", "保住核心材料"]] },
    { title: "第三炼 · 一念封蛊", body: `此刻再无退路。你掌握 ${intel.length} 条情报，每一条都可能成为成败的因。`, options: [["seal", "封蛊成形", "以已知条件完成原方"], ["guide", "以局养蛊", "让商队布局成为变种养料"], ["stop", "回收蛊胚", "承认准备不足"]] },
  ][phase - 1];
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="三阶段炼蛊"><section className="refine-modal"><button className="modal-close" onClick={onClose} aria-label="关闭">×</button><div className="cauldron"><span>{phase}</span><i /></div><p className="eyebrow">炼蛊并非掷骰 · 因由清晰可见</p><h2>{content.title}</h2><p className="refine-body">{content.body}</p><div className="factors"><span className={intel.includes("scorch") ? "good" : "bad"}>灼痕校准 {intel.includes("scorch") ? "✓" : "×"}</span><span className={intel.includes("ledger") ? "good" : "muted"}>商队比例 {intel.includes("ledger") ? "✓" : "?"}</span><span className="good">寒玉主材 ✓</span></div><div className="refine-options">{content.options.map(([id, name, desc]) => <button key={id} onClick={() => onChoice(id)}><b>{name}</b><small>{desc}</small></button>)}</div><div className="phase-track"><i className={phase >= 1 ? "active" : ""}/><i className={phase >= 2 ? "active" : ""}/><i className={phase >= 3 ? "active" : ""}/></div></section></div>;
}
