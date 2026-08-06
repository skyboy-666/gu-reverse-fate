"use client";

import { useEffect, useMemo, useState } from "react";

type BuildingId = "field" | "nursery" | "refinery" | "shop" | "watch";
type StaffId = "qingshu" | "yanbo" | "mutao" | "zhixia";
type SkillId = "plant" | "refine" | "trade" | "scout";
type ItemId = "orchid" | "feed" | "fire" | "jade" | "gu";
type TradePolicy = "hold" | "balanced" | "liquidate";
type RefinePlan = "moon" | "research" | "idle";

type Inventory = Record<ItemId, number> & { cold: number; mist: number };
type BuildingState = { level: number; condition: number };
type StaffState = { loyalty: number; mood: number };
type Order = { id: string; name: string; item: ItemId; qty: number; reward: number; due: number; bonus?: "clan" | "caravan" | "rogue" };
type LedgerEntry = { turn: number; income: number; expense: number; balance: number; lines: string[] };

type GameState = {
  turn: number;
  stones: number;
  debt: number;
  reputation: number;
  intelligence: number;
  factions: { clan: number; caravan: number; rogue: number };
  inventory: Inventory;
  buildings: Record<BuildingId, BuildingState>;
  staff: Record<StaffId, StaffState>;
  assignments: Record<BuildingId, StaffId | null>;
  tradePolicy: TradePolicy;
  refinePlan: RefinePlan;
  activeOrder: Order | null;
  guHealth: number;
  flags: string[];
  pendingEvent: string | null;
  ledger: LedgerEntry[];
  ending: string | null;
};

const BUILDINGS: Record<BuildingId, { name: string; mark: string; skill: SkillId; desc: string; result: string }> = {
  field: { name: "月兰田", mark: "田", skill: "plant", desc: "种植月兰，是整条产业链的根基。", result: "产出月兰" },
  nursery: { name: "育蛊室", mark: "育", skill: "refine", desc: "将月兰加工为蛊虫养料。", result: "月兰 → 养料" },
  refinery: { name: "炼蛊堂", mark: "炼", skill: "refine", desc: "炼制商品蛊，或研究残缺蛊方。", result: "材料 → 成蛊" },
  shop: { name: "山门商铺", mark: "商", skill: "trade", desc: "提高售价，并自动执行经营策略。", result: "出售库存" },
  watch: { name: "耳目亭", mark: "谍", skill: "scout", desc: "预测行情，发现危机与人物隐情。", result: "获得情报" },
};

const STAFF: Record<StaffId, { name: string; role: string; wage: number; trait: string; skills: Record<SkillId, number> }> = {
  qingshu: { name: "林青书", role: "老农", wage: 8, trait: "耐劳：月兰田损耗降低", skills: { plant: 82, refine: 28, trade: 24, scout: 42 } },
  yanbo: { name: "严伯", role: "炼师", wage: 10, trait: "稳手：炼制失败损失减少", skills: { plant: 32, refine: 86, trade: 20, scout: 28 } },
  mutao: { name: "木桃", role: "账房", wage: 9, trait: "善贾：商铺售价提高", skills: { plant: 45, refine: 30, trade: 81, scout: 38 } },
  zhixia: { name: "知夏", role: "线人", wage: 10, trait: "耳聪：更早看见价格趋势", skills: { plant: 22, refine: 46, trade: 36, scout: 88 } },
};

const ITEM_NAMES: Record<ItemId, string> = { orchid: "月兰", feed: "蛊粮", fire: "赤粉", jade: "寒玉", gu: "商品蛊" };
const SKILL_NAMES: Record<SkillId, string> = { plant: "种植", refine: "炼道", trade: "经商", scout: "侦察" };

const ORDERS: Order[] = [
  { id: "herbal", name: "药庐常备单", item: "orchid", qty: 12, reward: 62, due: 2, bonus: "clan" },
  { id: "feed", name: "猎户养蛊单", item: "feed", qty: 10, reward: 78, due: 2, bonus: "rogue" },
  { id: "caravan-gu", name: "商队成蛊单", item: "gu", qty: 2, reward: 118, due: 3, bonus: "caravan" },
  { id: "festival", name: "家族祭典单", item: "orchid", qty: 18, reward: 96, due: 2, bonus: "clan" },
];

const PRICE_CURVE = {
  orchid: [4, 5, 6, 7, 6, 9, 8, 6, 10, 7, 6, 8],
  feed: [7, 7, 8, 9, 10, 11, 9, 8, 12, 10, 9, 11],
  fire: [12, 13, 14, 15, 18, 20, 17, 16, 21, 19, 18, 20],
  jade: [18, 18, 20, 22, 24, 26, 25, 23, 28, 27, 25, 30],
  gu: [44, 46, 48, 52, 56, 64, 60, 58, 72, 68, 66, 78],
};

const EVENTS: Record<number, string> = { 2: "pest", 3: "preorder", 5: "red-dust", 7: "audit", 9: "underground", 11: "final-order" };

const ENDINGS: Record<string, { mark: string; title: string; text: string }> = {
  grandmaster: { mark: "盛", title: "蛊坊巨擘", text: "十二旬账目清白，债务尽偿，月兰香沿商路传遍南疆。你不再依附任何一方，而是让各方带着筹码来见你。" },
  monopoly: { mark: "商", title: "月兰之主", text: "你借商队之势吞下周边货源，价格涨落尽在一纸账簿。家族不喜你的做法，却再也无法忽视你的元石。" },
  legacy: { mark: "秘", title: "地脉遗藏", text: "账面利润并非全部。你用寒息蛊打开田下石门，产业成为遮掩，真正的传承在地火深处苏醒。" },
  steady: { mark: "守", title: "小业长青", text: "你没有一夜暴富，却保住了人、田与蛊。债务仍需时日偿还，但这座蛊坊已经能够自行生长。" },
  bankrupt: { mark: "败", title: "账断蛊饥", text: "工资、蛊粮和利息一同压垮现金流。蛊坊被迫抵债，但你记下了所有错误——下一次经营，不会再从无知开始。" },
};

const initialState: GameState = {
  turn: 1,
  stones: 120,
  debt: 240,
  reputation: 12,
  intelligence: 0,
  factions: { clan: 30, caravan: 24, rogue: 18 },
  inventory: { orchid: 20, feed: 12, fire: 3, jade: 1, gu: 0, cold: 0, mist: 0 },
  buildings: {
    field: { level: 1, condition: 92 }, nursery: { level: 1, condition: 88 }, refinery: { level: 1, condition: 86 },
    shop: { level: 1, condition: 90 }, watch: { level: 1, condition: 84 },
  },
  staff: {
    qingshu: { loyalty: 72, mood: 76 }, yanbo: { loyalty: 61, mood: 68 },
    mutao: { loyalty: 58, mood: 82 }, zhixia: { loyalty: 66, mood: 74 },
  },
  assignments: { field: "qingshu", nursery: null, refinery: "yanbo", shop: "mutao", watch: "zhixia" },
  tradePolicy: "balanced",
  refinePlan: "moon",
  activeOrder: null,
  guHealth: 100,
  flags: [],
  pendingEvent: null,
  ledger: [{ turn: 0, income: 0, expense: 0, balance: 120, lines: ["接手月兰蛊坊：本金120元石，旧债240元石，距年终评定还有十二旬。"] }],
  ending: null,
};

function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function pricesFor(turn: number, flags: string[]) {
  const index = clamp(turn - 1, 0, 11);
  const hoard = flags.includes("merchant-hoard") ? 1.2 : 1;
  return {
    orchid: Math.round(PRICE_CURVE.orchid[index] * hoard), feed: PRICE_CURVE.feed[index], fire: PRICE_CURVE.fire[index],
    jade: PRICE_CURVE.jade[index], gu: Math.round(PRICE_CURVE.gu[index] * (flags.includes("gu-demand") ? 1.18 : 1)),
  };
}

function assignedSkill(game: GameState, building: BuildingId) {
  const staffId = game.assignments[building];
  return staffId ? STAFF[staffId].skills[BUILDINGS[building].skill] : 0;
}

function fixedCost(game: GameState) {
  const wages = (Object.keys(game.staff) as StaffId[]).reduce((sum, id) => sum + STAFF[id].wage, 0);
  const maintenance = (Object.values(game.buildings) as BuildingState[]).reduce((sum, building) => sum + building.level * 2, 0);
  return { wages, maintenance, total: wages + maintenance };
}

function availableOrder(turn: number): Order {
  const base = ORDERS[(turn - 1) % ORDERS.length];
  return { ...base, id: `${base.id}-${turn}`, due: turn + base.due };
}

export default function Home() {
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"estate" | "people" | "market" | "ledger">("estate");
  const [notice, setNotice] = useState<string | null>(null);
  const [refining, setRefining] = useState<{ phase: number; choices: string[] } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("gu-workshop-management-v1");
      if (saved) { try { setGame(JSON.parse(saved)); } catch { /* keep a clean save */ } }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("gu-workshop-management-v1", JSON.stringify(game));
  }, [game, hydrated]);

  const prices = useMemo(() => pricesFor(game.turn, game.flags), [game.turn, game.flags]);
  const costs = useMemo(() => fixedCost(game), [game]);
  const inventoryValue = useMemo(() => Math.round(game.inventory.orchid * prices.orchid + game.inventory.feed * prices.feed + game.inventory.fire * prices.fire + game.inventory.jade * prices.jade + game.inventory.gu * prices.gu), [game.inventory, prices]);
  const currentOrder = availableOrder(game.turn);
  const nextEvent = EVENTS[game.turn + 1];
  const shopSkill = assignedSkill(game, "shop");
  const sellBonus = 1 + shopSkill / 250;
  const predictedSales = game.tradePolicy === "hold" ? 0 : Math.round(Math.max(0, game.inventory.orchid - (game.tradePolicy === "balanced" ? 20 : 8)) * prices.orchid * sellBonus);
  const forecast = predictedSales - costs.total;

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const update = (fn: (draft: GameState) => void) => setGame(current => {
    const draft = structuredClone(current);
    fn(draft);
    return draft;
  });

  const assign = (building: BuildingId, staffId: StaffId | null) => update(draft => {
    if (staffId) {
      (Object.keys(draft.assignments) as BuildingId[]).forEach(id => { if (draft.assignments[id] === staffId) draft.assignments[id] = null; });
    }
    draft.assignments[building] = staffId;
  });

  const upgrade = (id: BuildingId) => {
    const building = game.buildings[id];
    if (building.level >= 3) { toast("此建筑已经升至三级。首版不继续扩张层级。"); return; }
    const cost = building.level * 38;
    if (game.stones < cost) { toast(`升级需要 ${cost} 元石。`); return; }
    update(draft => { draft.stones -= cost; draft.buildings[id].level += 1; draft.reputation += 2; });
  };

  const repair = (id: BuildingId) => {
    const missing = 100 - game.buildings[id].condition;
    const cost = Math.max(3, Math.ceil(missing / 10) * 4);
    if (missing < 5) { toast("设施状态良好，无需维护。"); return; }
    if (game.stones < cost) { toast(`修缮需要 ${cost} 元石。`); return; }
    update(draft => { draft.stones -= cost; draft.buildings[id].condition = Math.min(100, draft.buildings[id].condition + 30); });
  };

  const marketTrade = (item: ItemId, qty: number, mode: "buy" | "sell") => {
    const unit = prices[item];
    if (mode === "buy") {
      const total = Math.ceil(unit * 1.2) * qty;
      if (game.stones < total) { toast(`买入需要 ${total} 元石。`); return; }
      update(draft => { draft.stones -= total; draft.inventory[item] += qty; });
    } else {
      if (game.inventory[item] < qty) { toast(`${ITEM_NAMES[item]}库存不足。`); return; }
      const total = Math.floor(unit * sellBonus) * qty;
      update(draft => { draft.inventory[item] -= qty; draft.stones += total; });
    }
  };

  const acceptOrder = (order = currentOrder) => {
    if (game.activeOrder) { toast("同时只能承接一份订单。先完成或等其结算。"); return; }
    update(draft => { draft.activeOrder = { ...order }; });
  };

  const fulfillOrder = () => {
    const order = game.activeOrder;
    if (!order) return;
    if (game.inventory[order.item] < order.qty) { toast(`还缺 ${order.qty - game.inventory[order.item]} 份${ITEM_NAMES[order.item]}。`); return; }
    update(draft => {
      draft.inventory[order.item] -= order.qty;
      draft.stones += order.reward;
      draft.reputation += 6;
      if (order.bonus === "clan") draft.factions.clan = clamp(draft.factions.clan + 8);
      if (order.bonus === "caravan") draft.factions.caravan = clamp(draft.factions.caravan + 8);
      draft.ledger.unshift({ turn: draft.turn, income: order.reward, expense: 0, balance: draft.stones, lines: [`提前交付【${order.name}】，获得 ${order.reward} 元石与6点声望。`] });
      draft.activeOrder = null;
    });
  };

  const payDebt = () => {
    const amount = Math.min(30, game.debt, game.stones);
    if (amount <= 0) { toast("当前没有可用于还债的元石。"); return; }
    update(draft => { draft.stones -= amount; draft.debt -= amount; draft.reputation += amount === 30 ? 2 : 0; });
  };

  const beginRefining = () => {
    if (game.inventory.orchid < 6 || game.inventory.fire < 1 || game.inventory.jade < 1 || game.stones < 5) {
      toast("开炉需要：月兰6、赤粉1、寒玉1、元石5。"); return;
    }
    setRefining({ phase: 1, choices: [] });
  };

  const refineChoice = (choice: string) => {
    if (!refining) return;
    if (choice === "stop") { setRefining(null); toast("主动停炉，材料未被消耗。"); return; }
    const choices = [...refining.choices, choice];
    if (refining.phase < 3) { setRefining({ phase: refining.phase + 1, choices }); return; }
    update(draft => {
      draft.inventory.orchid -= 6; draft.inventory.fire -= 1; draft.inventory.jade -= 1; draft.stones -= 5;
      const stable = choices[0] === "purify" && choices[1] === "suppress" && choice === "seal" && draft.intelligence >= 1;
      const variant = choices[0] === "adapt" && choices[1] === "guide" && choice === "gamble" && draft.intelligence >= 3;
      let line = "属性冲突导致蛊胚破碎：情报与火候路线不匹配。你获得1点炼道情报。";
      if (stable) { draft.inventory.cold += 1; draft.reputation += 7; line = "寒息凝而不散，【寒息蛊】炼成：月兰田将免受赤粉与火脉减产。"; }
      else if (variant) { draft.inventory.mist += 1; draft.factions.rogue = clamp(draft.factions.rogue + 10); line = "你顺势引导异变，炼成【迷烟蛊】：耳目亭情报产出提高。"; }
      else draft.intelligence = clamp(draft.intelligence + 1, 0, 5);
      draft.ledger.unshift({ turn: draft.turn, income: 0, expense: 5, balance: draft.stones, lines: [line] });
    });
    setRefining(null);
  };

  const resolveEvent = (choice: string) => update(draft => {
    const id = draft.pendingEvent;
    const lines: string[] = [];
    if (id === "pest") {
      if (choice === "treat") { draft.stones -= 12; draft.buildings.field.condition = clamp(draft.buildings.field.condition + 8); lines.push("花费12元石施药，虫害被控制。月兰田状态回升。") }
      if (choice === "observe") { draft.intelligence += 1; draft.buildings.field.condition -= 8; lines.push("你保留虫群观察，得到1点情报，但田况下降8点。") }
      if (choice === "ignore") { draft.flags.push("blight"); draft.stones += 8; lines.push("省下眼前成本，却让枯萎成为持续减产因素。") }
    }
    if (id === "preorder") {
      if (choice === "sign") { draft.stones += 30; draft.flags.push("merchant-hoard"); draft.activeOrder = { id: "preorder", name: "商队月兰预购", item: "orchid", qty: 18, reward: 0, due: 5, bonus: "caravan" }; lines.push("收下30元石定金。第五旬前须交付18份月兰。") }
      if (choice === "refuse") { draft.factions.clan += 5; draft.intelligence += 1; lines.push("拒绝预购并追查来路，家族好感与情报各有提升。") }
      if (choice === "raise") { draft.factions.caravan -= 5; draft.stones += 12; lines.push("你抬价出售少量现货，得到12元石，商队关系下降。") }
    }
    if (id === "red-dust") {
      if (choice === "quarantine") { draft.stones -= 10; draft.intelligence += 1; draft.buildings.field.condition += 10; lines.push("封田净化避免扩散，获得火性情报。") }
      if (choice === "reuse") { draft.inventory.feed += 8; draft.inventory.fire += 2; draft.flags.push("risky-feed"); lines.push("赤粉被炼成养料与材料，但未来喂蛊风险上升。") }
      if (choice === "sell") { draft.stones += 28; draft.reputation -= 8; draft.factions.caravan += 6; lines.push("隐瞒污染并出售，现金增加，声望受损。") }
    }
    if (id === "audit") {
      if (choice === "honest") { draft.stones -= 20; draft.reputation += 8; draft.factions.clan += 12; lines.push("补缴旧账并公开账簿，家族信任显著提高。") }
      if (choice === "bribe") { draft.stones -= 15; draft.factions.clan += 3; lines.push("账目暂时过关，但没有赢得真正信任。") }
      if (choice === "merchant") { draft.factions.caravan += 12; draft.factions.clan -= 8; draft.stones += 10; lines.push("借商队担保渡过检查，蛊坊立场向商队倾斜。") }
    }
    if (id === "underground") {
      if (choice === "excavate" && draft.intelligence >= 3) { draft.stones -= 15; draft.inventory.jade += 3; draft.flags.push("legacy"); lines.push("顺地脉挖出寒玉与石门，遗藏路线已经开启。") }
      if (choice === "seal") { draft.factions.clan += 8; draft.buildings.field.condition += 10; lines.push("封堵地隙换来稳定，家族认可你的谨慎。") }
      if (choice === "sell-info") { draft.stones += 35; draft.factions.caravan += 10; draft.reputation -= 5; lines.push("情报卖出35元石，但地下秘密已不再只属于你。") }
    }
    if (id === "final-order") {
      if (choice === "gu-order") { draft.activeOrder = { id: "final-gu", name: "年末百蛊宴", item: "gu", qty: 2, reward: 138, due: 12, bonus: "caravan" }; draft.flags.push("gu-demand"); lines.push("接下两只商品蛊的大单，年末蛊价同步上涨。") }
      if (choice === "clan-order") { draft.activeOrder = { id: "final-orchid", name: "家族祭田", item: "orchid", qty: 16, reward: 92, due: 12, bonus: "clan" }; lines.push("承接家族月兰订单，以稳妥换取声望。") }
      if (choice === "decline") { draft.reputation -= 3; lines.push("拒绝年末订单，保住库存但损失少量声望。") }
    }
    draft.pendingEvent = null;
    draft.ledger.unshift({ turn: draft.turn, income: 0, expense: 0, balance: draft.stones, lines });
  });

  const settleTurn = () => {
    if (game.pendingEvent) { toast("先处理当前经营事件。"); return; }
    update(draft => {
      const lines: string[] = [];
      let income = 0; let expense = 0;
      const turnPrices = pricesFor(draft.turn, draft.flags);
      const fixed = fixedCost(draft);
      draft.stones -= fixed.total; expense += fixed.total;
      lines.push(`支付薪俸 ${fixed.wages}、产业维护 ${fixed.maintenance}。`);

      const field = draft.buildings.field;
      const plantSkill = assignedSkill(draft, "field");
      let orchidGain = draft.assignments.field ? Math.round(6 * field.level * (0.65 + plantSkill / 100) * field.condition / 100) : 0;
      if (draft.flags.includes("blight") && draft.inventory.cold === 0) orchidGain = Math.floor(orchidGain * .55);
      if (draft.inventory.cold > 0) orchidGain += field.level * 2;
      draft.inventory.orchid += orchidGain;
      lines.push(`月兰田产出 ${orchidGain} 份月兰（资质${plantSkill}，田况${field.condition}%）。`);

      const nursery = draft.buildings.nursery;
      const nurserySkill = assignedSkill(draft, "nursery");
      const orchidUsed = draft.assignments.nursery ? Math.min(draft.inventory.orchid, nursery.level * 4) : 0;
      const feedGain = Math.round(orchidUsed * (1 + nurserySkill / 150));
      draft.inventory.orchid -= orchidUsed; draft.inventory.feed += feedGain;
      if (orchidUsed) lines.push(`育蛊室消耗 ${orchidUsed} 月兰，制成 ${feedGain} 蛊粮。`);

      const refineSkill = assignedSkill(draft, "refinery");
      if (draft.assignments.refinery && draft.refinePlan === "moon" && draft.inventory.orchid >= 6 && draft.inventory.fire >= 1) {
        draft.inventory.orchid -= 6; draft.inventory.fire -= 1; draft.inventory.gu += 1; draft.stones -= 2; expense += 2;
        lines.push(`炼蛊堂由炼道${refineSkill}的人员主持，消耗6月兰、1赤粉，炼成1只商品蛊。`);
      } else if (draft.assignments.refinery && draft.refinePlan === "research" && draft.stones >= 6) {
        draft.stones -= 6; expense += 6; draft.intelligence = clamp(draft.intelligence + 1, 0, 5); draft.reputation += 1;
        lines.push("炼蛊堂本旬研究残方：花费6元石，情报与声望提高。 ");
      } else if (draft.refinePlan !== "idle") lines.push("炼蛊堂因人员或材料不足停炉，未产生额外损失。 ");

      if (draft.assignments.watch) {
        const scout = assignedSkill(draft, "watch");
        const intelGain = draft.inventory.mist > 0 ? 2 : (scout >= 70 ? 1 : 0);
        draft.intelligence = clamp(draft.intelligence + intelGain, 0, 5);
        if (intelGain) lines.push(`耳目亭获得 ${intelGain} 点情报，可预见更远行情。`);
      }

      if (draft.activeOrder && draft.activeOrder.due <= draft.turn) {
        const order = draft.activeOrder;
        if (draft.inventory[order.item] >= order.qty) {
          draft.inventory[order.item] -= order.qty; draft.stones += order.reward; income += order.reward; draft.reputation += 6;
          if (order.bonus === "clan") draft.factions.clan = clamp(draft.factions.clan + 8);
          if (order.bonus === "caravan") draft.factions.caravan = clamp(draft.factions.caravan + 8);
          lines.push(`按期交付【${order.name}】，收入 ${order.reward} 元石。`);
        } else {
          draft.reputation -= 10; draft.factions.caravan = clamp(draft.factions.caravan - 8); lines.push(`【${order.name}】逾期：缺少${ITEM_NAMES[order.item]}，声望下降10。`);
        }
        draft.activeOrder = null;
      }

      const guCount = 2 + draft.inventory.cold + draft.inventory.mist;
      if (draft.inventory.feed >= guCount) { draft.inventory.feed -= guCount; draft.guHealth = clamp(draft.guHealth + 4); lines.push(`消耗 ${guCount} 蛊粮，所有自用蛊虫状态稳定。`); }
      else {
        const shortage = guCount - draft.inventory.feed; draft.inventory.feed = 0; draft.guHealth = clamp(draft.guHealth - shortage * 18);
        if (draft.flags.includes("risky-feed")) draft.guHealth = clamp(draft.guHealth - 8);
        lines.push(`蛊粮短缺 ${shortage}，蛊群活性下降至 ${draft.guHealth}%。`);
      }

      const tradeSkill = assignedSkill(draft, "shop");
      const bonus = 1 + tradeSkill / 250;
      const orchidReserve = draft.tradePolicy === "hold" ? draft.inventory.orchid : draft.tradePolicy === "balanced" ? 20 : 8;
      const feedReserve = draft.tradePolicy === "hold" ? draft.inventory.feed : draft.tradePolicy === "balanced" ? 8 : 2;
      const orchidSold = Math.max(0, draft.inventory.orchid - orchidReserve);
      const feedSold = Math.max(0, draft.inventory.feed - feedReserve);
      const guSold = draft.tradePolicy === "liquidate" ? draft.inventory.gu : 0;
      const sales = Math.floor((orchidSold * turnPrices.orchid + feedSold * turnPrices.feed + guSold * turnPrices.gu) * bonus);
      draft.inventory.orchid -= orchidSold; draft.inventory.feed -= feedSold; draft.inventory.gu -= guSold;
      draft.stones += sales; income += sales;
      if (sales) lines.push(`商铺按“${draft.tradePolicy === "balanced" ? "均衡周转" : "清仓换现"}”策略售货，收入 ${sales} 元石。`);
      else lines.push("本旬未自动出售库存。 ");

      (Object.keys(draft.buildings) as BuildingId[]).forEach(id => {
        const wear = id === "field" && draft.assignments.field === "qingshu" ? 1 : 2;
        draft.buildings[id].condition = clamp(draft.buildings[id].condition - wear);
      });
      (Object.keys(draft.staff) as StaffId[]).forEach(id => {
        const working = Object.values(draft.assignments).includes(id);
        draft.staff[id].mood = clamp(draft.staff[id].mood + (working ? -2 : 5));
        if (draft.stones < 0) draft.staff[id].loyalty = clamp(draft.staff[id].loyalty - 5);
      });
      if (draft.turn % 3 === 0 && draft.debt > 0) { draft.debt += 12; lines.push("旧债计入季度利息12元石。 "); }

      draft.ledger.unshift({ turn: draft.turn, income, expense, balance: draft.stones, lines });
      if (draft.stones < -60 || draft.guHealth <= 0) { draft.ending = "bankrupt"; return; }
      if (draft.turn >= 12) {
        if (draft.debt === 0 && draft.reputation >= 60) draft.ending = "grandmaster";
        else if (draft.flags.includes("legacy") && draft.inventory.cold > 0) draft.ending = "legacy";
        else if (draft.factions.caravan >= 60 && draft.stones >= 180) draft.ending = "monopoly";
        else if (draft.debt <= 180 && draft.stones >= 0) draft.ending = "steady";
        else draft.ending = "bankrupt";
        return;
      }
      draft.turn += 1;
      draft.pendingEvent = EVENTS[draft.turn] ?? null;
    });
  };

  const reset = () => {
    if (!window.confirm("确定抹去当前经营记录，从第一旬重新开业？")) return;
    localStorage.removeItem("gu-workshop-management-v1");
    setGame(initialState); setTab("estate"); setRefining(null);
  };

  if (!hydrated) return <main className="loading"><span>蛊</span><p>正在展开经营账册…</p></main>;

  if (game.ending) {
    const ending = ENDINGS[game.ending];
    return <main className="ending-screen"><section className="ending-card"><p className="eyebrow">十二旬经营评定</p><div className="ending-mark">{ending.mark}</div><h1>{ending.title}</h1><p>{ending.text}</p><div className="ending-stats"><span>结余<b>{game.stones} 元石</b></span><span>债务<b>{game.debt}</b></span><span>声望<b>{game.reputation}</b></span><span>库存估值<b>{inventoryValue}</b></span></div><button className="primary-button" onClick={reset}>带着经验重新开业</button><small>非官方同人玩法原型 · 未使用小说正文或官方美术</small></section></main>;
  }

  return <main className="game-shell">
    {notice && <div className="toast" role="status">{notice}</div>}
    <header className="topbar">
      <div className="brand"><span className="brand-mark">蛊</span><div><p>MOON ORCHID WORKSHOP</p><h1>蛊界：逆命 <em>经营篇</em></h1></div></div>
      <div className="header-actions"><button onClick={payDebt}>偿还30债务</button><button onClick={reset}>重新开业</button></div>
    </header>

    <section className="season-line"><div className="season-progress"><i style={{width:`${game.turn / 12 * 100}%`}}/></div><span>第 {game.turn} 旬</span><b>年终评定还剩 {13 - game.turn} 旬</b></section>

    <section className="resource-ribbon" aria-label="经营资源">
      <Metric label="元石" value={game.stones} tone={game.stones < 30 ? "bad" : ""}/><Metric label="旧债" value={game.debt} tone="gold"/><Metric label="声望" value={game.reputation}/><Metric label="情报" value={`${game.intelligence}/5`}/><Metric label="库存估值" value={inventoryValue}/><Metric label="预计现金流" value={`${forecast >= 0 ? "+" : ""}${forecast}`} tone={forecast < 0 ? "bad" : "good"}/>
    </section>

    <section className="briefing"><div><span>本旬经营判断</span><p>{game.intelligence >= 2 ? `月兰现价 ${prices.orchid}，下旬预计 ${pricesFor(Math.min(12,game.turn+1),game.flags).orchid}。${nextEvent ? "耳目报告：下旬可能发生重大事件。" : "暂未发现重大危机。"}` : "行情来源不足，只能看到本旬价格。派人经营耳目亭可获得预测。"}</p></div><div className="briefing-side"><small>固定支出</small><b>-{costs.total}</b></div></section>

    <nav className="mobile-tabs" aria-label="经营分页">
      <button className={tab === "estate" ? "active" : ""} onClick={()=>setTab("estate")}>产业</button><button className={tab === "people" ? "active" : ""} onClick={()=>setTab("people")}>人员</button><button className={tab === "market" ? "active" : ""} onClick={()=>setTab("market")}>市场</button><button className={tab === "ledger" ? "active" : ""} onClick={()=>setTab("ledger")}>账簿</button>
    </nav>

    <div className="management-grid">
      <section className={`panel estate-panel ${tab !== "estate" ? "mobile-hidden" : ""}`}>
        <PanelTitle kicker="生产链" title="月兰蛊坊" aside="派遣一人只能管理一处"/>
        <div className="building-list">{(Object.keys(BUILDINGS) as BuildingId[]).map(id => <BuildingCard key={id} id={id} game={game} onAssign={assign} onUpgrade={upgrade} onRepair={repair}/>)}</div>
      </section>

      <section className={`panel people-panel ${tab !== "people" ? "mobile-hidden" : ""}`}>
        <PanelTitle kicker="人尽其才" title="本旬经营计划" aside="选择之后，过旬统一结算"/>
        <div className="plan-block"><h3>库存策略</h3><div className="segmented">{(["hold","balanced","liquidate"] as TradePolicy[]).map(id=><button key={id} className={game.tradePolicy===id?"active":""} onClick={()=>update(d=>{d.tradePolicy=id})}>{id==="hold"?"囤货待价":id==="balanced"?"均衡周转":"清仓换现"}</button>)}</div><p>{game.tradePolicy === "hold" ? "不自动出售，承担工资与价格波动。" : game.tradePolicy === "balanced" ? "保留20月兰与8蛊粮，其余由商铺出售。" : "仅保留8月兰与2蛊粮，并出售全部商品蛊。"}</p></div>
        <div className="plan-block"><h3>炼蛊堂计划</h3><div className="segmented">{(["moon","research","idle"] as RefinePlan[]).map(id=><button key={id} className={game.refinePlan===id?"active":""} onClick={()=>update(d=>{d.refinePlan=id})}>{id==="moon"?"炼商品蛊":id==="research"?"研究残方":"停炉保材"}</button>)}</div><p>{game.refinePlan === "moon" ? "需月兰6、赤粉1、元石2，炼成1只商品蛊。" : game.refinePlan === "research" ? "消耗6元石，获得情报和少量声望。" : "不消耗材料，释放人员可改派其他产业。"}</p></div>
        <button className="refine-special" onClick={beginRefining}><span>三阶段精炼</span><small>以决策炼制寒息蛊或迷烟蛊</small></button>
        <div className="gu-status"><h3>自用蛊群</h3><div><span>基础蛊 ×2</span><span>寒息蛊 ×{game.inventory.cold}</span><span>迷烟蛊 ×{game.inventory.mist}</span><b>活性 {game.guHealth}%</b></div></div>
        <div className="staff-list">{(Object.keys(STAFF) as StaffId[]).map(id=><StaffCard key={id} id={id} game={game}/>)}</div>
      </section>

      <section className={`panel market-panel ${tab !== "market" ? "mobile-hidden" : ""}`}>
        <PanelTitle kicker="价格随局势变化" title="南麓行情" aside={`商铺加价 ${Math.round((sellBonus-1)*100)}%`}/>
        <div className="market-table">{(["orchid","feed","fire","jade","gu"] as ItemId[]).map(item=><MarketRow key={item} item={item} price={prices[item]} next={pricesFor(Math.min(12,game.turn+1),game.flags)[item]} reveal={game.intelligence>=2} stock={game.inventory[item]} onTrade={marketTrade}/>)}</div>
        <div className="order-card"><span>本旬订单</span><h3>{game.activeOrder ? game.activeOrder.name : currentOrder.name}</h3>{game.activeOrder ? <><p>交付 {game.activeOrder.qty} 份{ITEM_NAMES[game.activeOrder.item]} · 第{game.activeOrder.due}旬到期</p><button onClick={fulfillOrder}>立即交付</button></> : <><p>{currentOrder.qty}份{ITEM_NAMES[currentOrder.item]} · 回报{currentOrder.reward}元石 · 第{currentOrder.due}旬到期</p><button onClick={()=>acceptOrder()}>承接订单</button></>}</div>
        <div className="factions"><h3>三方关系</h3><Faction name="古月家族" value={game.factions.clan}/><Faction name="山下商队" value={game.factions.caravan}/><Faction name="散修集市" value={game.factions.rogue}/></div>
      </section>
    </div>

    <section className={`panel ledger-panel ${tab !== "ledger" ? "mobile-hidden ledger-mobile" : ""}`}>
      <div className="ledger-head"><div><span>每笔变化都有因由</span><h2>经营旬报</h2></div><div className="inventory-strip"><b>库存</b><span>月兰 {game.inventory.orchid}</span><span>蛊粮 {game.inventory.feed}</span><span>赤粉 {game.inventory.fire}</span><span>寒玉 {game.inventory.jade}</span><span>商品蛊 {game.inventory.gu}</span></div></div>
      <div className="ledger-content"><div className="ledger-entries">{game.ledger.slice(0,4).map((entry,index)=><article key={`${entry.turn}-${index}`} className={index===0?"current":""}><header><b>{entry.turn===0?"开业":`第 ${entry.turn} 旬`}</b><span className={entry.income-entry.expense>=0?"positive":"negative"}>{entry.turn===0?"本金":`净额 ${entry.income-entry.expense>=0?"+":""}${entry.income-entry.expense}`}</span><em>结余 {entry.balance}</em></header>{entry.lines.map((line,i)=><p key={i}>{line}</p>)}</article>)}</div><div className="turn-control"><p>点击后将依序结算工资、产业、订单、喂蛊、交易与事件。</p><button className="advance-button" onClick={settleTurn}><span>结束第 {game.turn} 旬</span><small>预计固定支出 {costs.total} 元石</small></button></div></div>
    </section>
    <footer><span>本地自动存档 · 单人经营原型</span><span>经营不是收菜，而是在有限资源中选择代价</span></footer>

    {game.pendingEvent && <EventModal id={game.pendingEvent} game={game} onChoose={resolveEvent}/>}
    {refining && <RefineModal phase={refining.phase} intelligence={game.intelligence} choices={refining.choices} onChoose={refineChoice} onClose={()=>setRefining(null)}/>}
  </main>;
}

function Metric({label,value,tone=""}:{label:string;value:string|number;tone?:string}) { return <div className={`metric ${tone}`}><small>{label}</small><strong>{value}</strong></div> }
function PanelTitle({kicker,title,aside}:{kicker:string;title:string;aside:string}) { return <header className="panel-title"><div><span>{kicker}</span><h2>{title}</h2></div><small>{aside}</small></header> }

function BuildingCard({id,game,onAssign,onUpgrade,onRepair}:{id:BuildingId;game:GameState;onAssign:(id:BuildingId,s:StaffId|null)=>void;onUpgrade:(id:BuildingId)=>void;onRepair:(id:BuildingId)=>void}) {
  const def=BUILDINGS[id], building=game.buildings[id], staffId=game.assignments[id], skill=assignedSkill(game,id);
  return <article className={`building-card ${staffId?"staffed":""}`}><span className="building-mark">{def.mark}</span><div className="building-copy"><div><b>{def.name}</b><em>Lv.{building.level}</em><i>{building.condition}%</i></div><p>{def.desc}</p><small>{def.result} · {SKILL_NAMES[def.skill]}效率 {skill}</small></div><select aria-label={`${def.name}派遣人员`} value={staffId??""} onChange={e=>onAssign(id,(e.target.value||null) as StaffId|null)}><option value="">无人管理</option>{(Object.keys(STAFF) as StaffId[]).map(s=><option key={s} value={s}>{STAFF[s].name} · {STAFF[s].skills[def.skill]}</option>)}</select><div className="building-actions"><button onClick={()=>onUpgrade(id)}>升级</button><button onClick={()=>onRepair(id)}>修缮</button></div></article>
}

function StaffCard({id,game}:{id:StaffId;game:GameState}) {
  const def=STAFF[id], state=game.staff[id], work=(Object.keys(game.assignments) as BuildingId[]).find(b=>game.assignments[b]===id);
  return <article className="staff-card"><div className="staff-avatar">{def.name.slice(0,1)}</div><div><b>{def.name}</b><small>{def.role} · 薪俸 {def.wage}</small><p>{def.trait}</p></div><div className="staff-meta"><span>{work?BUILDINGS[work].name:"休整"}</span><small>忠 {state.loyalty} · 心 {state.mood}</small></div></article>
}

function MarketRow({item,price,next,reveal,stock,onTrade}:{item:ItemId;price:number;next:number;reveal:boolean;stock:number;onTrade:(i:ItemId,q:number,m:"buy"|"sell")=>void}) {
  const qty=item==="gu"?1:5; const trend=next>price?"↑":next<price?"↓":"→";
  return <div className="market-row"><div><b>{ITEM_NAMES[item]}</b><small>库存 {stock}</small></div><strong>{price}<small> /份</small></strong><span className={reveal?(trend==="↑"?"up":trend==="↓"?"down":""):"unknown"}>{reveal?`${trend} ${next}`:"趋势 ?"}</span><div><button onClick={()=>onTrade(item,qty,"buy")}>买{qty}</button><button onClick={()=>onTrade(item,qty,"sell")}>卖{qty}</button></div></div>
}

function Faction({name,value}:{name:string;value:number}) { return <div className="faction-row"><span>{name}</span><i><b style={{width:`${clamp(value)}%`}}/></i><em>{value}</em></div> }

const EVENT_CONTENT: Record<string,{kicker:string;title:string;body:string;choices:{id:string;name:string;desc:string;requires?:number}[]}> = {
  pest:{kicker:"第二旬 · 产业危机",title:"兰叶背后的虫卵",body:"虫害尚未全面爆发。立即处理最稳妥，保留观察则可能找到枯萎的真正原因。",choices:[{id:"treat",name:"花钱施药",desc:"-12元石，恢复田况"},{id:"observe",name:"留虫观察",desc:"+1情报，田况-8"},{id:"ignore",name:"压下消息",desc:"+8元石，留下减产隐患"}]},
  preorder:{kicker:"第三旬 · 商路",title:"商队提前收购月兰",body:"对方愿意先付定金，但这意味着你必须在价格进一步上涨前交出库存。",choices:[{id:"sign",name:"签下预购",desc:"+30定金，第5旬交18月兰"},{id:"refuse",name:"拒绝并追查",desc:"家族关系+5，情报+1"},{id:"raise",name:"抬价卖现货",desc:"+12元石，商队关系-5"}]},
  "red-dust":{kicker:"第五旬 · 月兰田疑云",title:"根系中发现赤色蛊粉",body:"污染可以被清除，也可以成为材料。每种处理方式都会改变蛊坊的立场。",choices:[{id:"quarantine",name:"封田净化",desc:"-10元石，田况与情报提升"},{id:"reuse",name:"炼成养料",desc:"+8蛊粮、+2赤粉，埋下风险"},{id:"sell",name:"隐瞒出售",desc:"+28元石，声望-8"}]},
  audit:{kicker:"第七旬 · 家族",title:"家老要查看蛊坊账簿",body:"账目中既有旧债，也有商队往来。你必须决定蛊坊以后依靠谁。",choices:[{id:"honest",name:"公开并补账",desc:"-20元石，家族与声望大增"},{id:"bribe",name:"打点执事",desc:"-15元石，小幅过关"},{id:"merchant",name:"请商队担保",desc:"+10元石，倒向商队"}]},
  underground:{kicker:"第九旬 · 地脉",title:"田下传来规律空响",body:"这不像自然形成的洞穴。情报足够时可以安全开挖，也可以选择稳定经营。",choices:[{id:"excavate",name:"循声开挖",desc:"需3情报；-15元石，开启遗藏",requires:3},{id:"seal",name:"封住地隙",desc:"家族关系与田况提高"},{id:"sell-info",name:"卖给商队",desc:"+35元石，秘密外泄"}]},
  "final-order":{kicker:"第十一旬 · 年末",title:"两份大单，只能选一份",body:"商队需要成蛊，家族需要月兰。你也可以拒绝双方，保留库存参加年终评定。",choices:[{id:"gu-order",name:"接百蛊宴",desc:"第12旬交2商品蛊，回报138"},{id:"clan-order",name:"接家族祭田",desc:"第12旬交16月兰，回报92"},{id:"decline",name:"全部拒绝",desc:"保住库存，声望-3"}]},
};

function EventModal({id,game,onChoose}:{id:string;game:GameState;onChoose:(id:string)=>void}) { const event=EVENT_CONTENT[id]; return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={event.title}><section className="event-modal"><p className="eyebrow">{event.kicker}</p><h2>{event.title}</h2><p className="event-body">{event.body}</p><div className="event-choices">{event.choices.map(choice=><button key={choice.id} disabled={Boolean(choice.requires&&game.intelligence<choice.requires)} onClick={()=>onChoose(choice.id)}><b>{choice.name}</b><small>{choice.desc}</small></button>)}</div></section></div> }

function RefineModal({phase,intelligence,choices,onChoose,onClose}:{phase:number;intelligence:number;choices:string[];onChoose:(id:string)=>void;onClose:()=>void}) {
  const stages=[
    {title:"第一炼 · 材性相冲",body:"赤粉在月兰汁中浮沉。先净化求稳，还是保留异性寻找变种？",options:[["purify","逐层净化","稳定寒性路线"],["adapt","保留异性","开启变种路线"],["stop","停炉止损","不消耗材料"]]},
    {title:"第二炼 · 蛊胚偏移",body:choices[0]==="purify"?"杂质已析出，蛊胚仍在震颤。":"蛊胚化雾，原方已经偏移。",options:[["suppress","寒玉压制","回到残方主线"],["guide","顺势引导","借情报控制异变"],["stop","停炉止损","不消耗材料"]]},
    {title:"第三炼 · 一念封蛊",body:`你掌握 ${intelligence}/5 点情报。结果由此前选择与准备共同决定。`,options:[["seal","封蛊成形","完成寒息路线"],["gamble","借势成蛊","完成迷烟路线"],["stop","回收蛊胚","不消耗材料"]]},
  ]; const stage=stages[phase-1];
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="三阶段精炼"><section className="refine-modal"><button className="modal-close" onClick={onClose}>×</button><div className="cauldron">{phase}</div><p className="eyebrow">炼蛊不是掷骰 · 原因必须可解释</p><h2>{stage.title}</h2><p>{stage.body}</p><div className="refine-factors"><span>材料完整 ✓</span><span className={intelligence>=1?"good":"bad"}>基础情报 {intelligence>=1?"✓":"×"}</span><span className={intelligence>=3?"good":"muted"}>变种情报 {intelligence>=3?"✓":"?"}</span></div><div className="refine-options">{stage.options.map(([id,name,desc])=><button key={id} onClick={()=>onChoose(id)}><b>{name}</b><small>{desc}</small></button>)}</div><div className="phase-track"><i className={phase>=1?"active":""}/><i className={phase>=2?"active":""}/><i className={phase>=3?"active":""}/></div></section></div>
}
