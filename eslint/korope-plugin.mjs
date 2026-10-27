// Korope design and copy guardrails (CLAUDE.md), enforced in lint.
// Tailwind already has no default palette, so these catch the escape hatches:
// arbitrary values, inline styles, pill buttons, em dashes and emoji in copy.

const EM_DASH = /—/;
const EMOJI = /\p{Extended_Pictographic}/u;
// Arbitrary Tailwind values holding a literal colour or length, e.g. bg-[#fff], p-[12px], shadow-[0_1px_...]
// var(--token) and calc(var(--token) ...) are allowed.
const RAW_ARBITRARY = /\[(?!var\(|calc\(var\()[^\]]*(#[0-9a-fA-F]{3,8}|\d(px|rem|em|ms|s)\b|rgba?\(|hsla?\(|oklch\()[^\]]*\]/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RAW_LENGTH = /^-?\d+(\.\d+)?(px|rem|em)$/;

function classStrings(node) {
  // Collect string pieces from className="...", className={`...`}, className={cn("...", ...)}
  const out = [];
  const visit = (n) => {
    if (!n) return;
    if (n.type === "Literal" && typeof n.value === "string") out.push({ node: n, value: n.value });
    else if (n.type === "TemplateLiteral") n.quasis.forEach((q) => out.push({ node: q, value: q.value.cooked ?? "" }));
    else if (n.type === "JSXExpressionContainer") visit(n.expression);
    else if (n.type === "CallExpression") n.arguments.forEach(visit);
    else if (n.type === "ConditionalExpression") { visit(n.consequent); visit(n.alternate); }
    else if (n.type === "LogicalExpression") { visit(n.left); visit(n.right); }
    else if (n.type === "ArrayExpression") n.elements.forEach(visit);
    else if (n.type === "ObjectExpression") n.properties.forEach((p) => p.type === "Property" && visit(p.value));
  };
  visit(node);
  return out;
}

const isClassAttr = (attr) => attr.type === "JSXAttribute" && ["className", "class"].includes(attr.name?.name);
const elementName = (opening) => opening.name?.type === "JSXIdentifier" ? opening.name.name : opening.name?.property?.name;

const noRawStyleValues = {
  meta: { type: "problem", messages: {
    arbitrary: "Use a Korope token utility or var(--token), not a raw value: {{value}}",
    style: "Inline style uses a raw colour or length ({{value}}). Use a token: var(--...).",
  } },
  create(context) {
    return {
      JSXAttribute(attr) {
        if (isClassAttr(attr)) {
          for (const { node, value } of classStrings(attr.value)) {
            for (const cls of value.split(/\s+/)) {
              const m = cls.match(RAW_ARBITRARY);
              if (m) context.report({ node, messageId: "arbitrary", data: { value: m[0] } });
            }
          }
        }
        if (attr.name?.name === "style" && attr.value?.type === "JSXExpressionContainer" && attr.value.expression.type === "ObjectExpression") {
          for (const p of attr.value.expression.properties) {
            if (p.type !== "Property") continue;
            const v = p.value;
            if (v.type === "Literal" && typeof v.value === "string" && (HEX.test(v.value) || RAW_LENGTH.test(v.value.trim()) || /rgba?\(/.test(v.value))) {
              context.report({ node: v, messageId: "style", data: { value: v.value } });
            }
          }
        }
      },
    };
  },
};

const noPillButtons = {
  meta: { type: "problem", messages: { pill: "Radius/Pill is for chips and badges only. Buttons use rounded-m." } },
  create(context) {
    return {
      JSXOpeningElement(el) {
        const name = elementName(el);
        if (!["button", "Button", "a", "Link"].includes(name)) return;
        for (const attr of el.attributes) {
          if (!isClassAttr(attr)) continue;
          for (const { value } of classStrings(attr.value)) {
            if (/(^|\s)rounded-pill(\s|$)/.test(value)) context.report({ node: el, messageId: "pill" });
          }
        }
      },
    };
  },
};

const COPY_ATTRS = new Set(["aria-label", "placeholder", "title", "alt", "label", "description", "helper", "error"]);

const noBadCopy = {
  meta: { type: "problem", messages: {
    emDash: "No em dashes in UI copy. Use a full stop, comma or middle dot.",
    emoji: "No emoji in UI. Use a Lucide icon with a text label.",
  } },
  create(context) {
    const check = (node, text) => {
      if (EM_DASH.test(text)) context.report({ node, messageId: "emDash" });
      if (EMOJI.test(text)) context.report({ node, messageId: "emoji" });
    };
    return {
      JSXText(node) { check(node, node.value); },
      JSXAttribute(attr) {
        if (!COPY_ATTRS.has(attr.name?.name)) return;
        if (attr.value?.type === "Literal" && typeof attr.value.value === "string") check(attr.value, attr.value.value);
      },
      "JSXExpressionContainer > Literal"(node) { if (typeof node.value === "string") check(node, node.value); },
      "JSXExpressionContainer > TemplateLiteral"(node) { node.quasis.forEach((q) => check(q, q.value.cooked ?? "")); },
    };
  },
};

/** Strings in the copy module (src/lib/copy.ts) are UI copy too. */
const noBadCopyStrings = {
  meta: { type: "problem", messages: noBadCopy.meta.messages },
  create(context) {
    const check = (node, text) => {
      if (EM_DASH.test(text)) context.report({ node, messageId: "emDash" });
      if (EMOJI.test(text)) context.report({ node, messageId: "emoji" });
    };
    return {
      Literal(node) { if (typeof node.value === "string") check(node, node.value); },
      TemplateElement(node) { check(node, node.value.cooked ?? ""); },
    };
  },
};

const plugin = {
  meta: { name: "korope" },
  rules: {
    "no-raw-style-values": noRawStyleValues,
    "no-pill-buttons": noPillButtons,
    "no-bad-copy": noBadCopy,
    "no-bad-copy-strings": noBadCopyStrings,
  },
};

export default plugin;
