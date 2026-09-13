// Bringing a piece of the page into line with fresh markup without throwing it away
// (PIOTR, 13.09: "why do I sometimes have to click twice?"; CLAUDE.md T9 3.8).
//
// The page was written again from the state every game minute, which is four times a real second
// at 4x. Every one of those writes replaced every element on it, so a button the player had his
// finger on was a different button by the time he let it go, and a browser raises a click only
// when the press and the release land on the same element. That is the double click.
//
// Nothing is replaced now that is still the same thing. A control keeps its node while its
// `data-do` and `data-id` are unchanged, whatever else about it changes; the texts that change
// every minute, the clock and the counts among them, are written into the text nodes that already
// hold them; and an element marked `data-scene-slot` is left alone entirely, because the scene
// inside it is megabytes of picture and is kept across renders by the page itself.

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** True when these two are the same thing a minute apart, and not two different things. */
function isSame(old: Node, fresh: Node): boolean {
  if (old.nodeType !== fresh.nodeType) return false;
  if (old.nodeType === TEXT_NODE) return true;
  if (old.nodeType !== ELEMENT_NODE) return true;
  const before = old as Element;
  const after = fresh as Element;
  if (before.tagName !== after.tagName) return false;
  // The one rule the whole fix hangs on (CLAUDE.md T9 3.8).
  if (before.getAttribute('data-do') !== after.getAttribute('data-do')) return false;
  if (before.getAttribute('data-id') !== after.getAttribute('data-id')) return false;
  return true;
}

/** A field's value lives in the property, not in the attribute: setting the attribute alone would
 *  leave what the player has typed on the screen and the state disagreeing. */
function syncField(old: Element, fresh: Element): void {
  if (!(old instanceof HTMLInputElement) || !(fresh instanceof HTMLInputElement)) return;
  if (old.type === 'checkbox' || old.type === 'radio') {
    if (old.checked !== fresh.defaultChecked) old.checked = fresh.defaultChecked;
    return;
  }
  const wanted = fresh.getAttribute('value');
  if (wanted !== null && old.value !== wanted) old.value = wanted;
}

function patchAttributes(old: Element, fresh: Element): void {
  for (const attribute of Array.from(fresh.attributes)) {
    if (old.getAttribute(attribute.name) !== attribute.value) {
      old.setAttribute(attribute.name, attribute.value);
    }
  }
  for (const attribute of Array.from(old.attributes)) {
    if (!fresh.hasAttribute(attribute.name)) old.removeAttribute(attribute.name);
  }
  syncField(old, fresh);
}

function patchNode(old: Node, fresh: Node): void {
  if (old.nodeType === TEXT_NODE) {
    if (old.nodeValue !== fresh.nodeValue) old.nodeValue = fresh.nodeValue;
    return;
  }
  if (old.nodeType !== ELEMENT_NODE) return;
  const before = old as Element;
  // The scene is built once and carried from page to page: it is not this function's business.
  if (before.hasAttribute('data-scene-slot')) return;
  patchAttributes(before, fresh as Element);
  patchChildren(before, fresh as Element);
}

function patchChildren(target: Element, fresh: Element): void {
  const olds = Array.from(target.childNodes);
  const news = Array.from(fresh.childNodes);
  const count = Math.max(olds.length, news.length);
  for (let index = 0; index < count; index += 1) {
    const old = olds[index];
    const next = news[index];
    if (next === undefined) {
      if (old !== undefined) target.removeChild(old);
      continue;
    }
    if (old === undefined) {
      target.appendChild(next);
      continue;
    }
    if (!isSame(old, next)) {
      target.replaceChild(next, old);
      continue;
    }
    patchNode(old, next);
  }
}

/** Writes this markup into the element, keeping every node that is still the same node. The
 *  holder is a copy of the target itself, so a piece of the hall is parsed as SVG and a piece of
 *  the page as HTML without either of them having to say which it is. */
export function patchInto(target: Element, html: string): void {
  const holder = target.cloneNode(false);
  if (!(holder instanceof Element)) return;
  holder.innerHTML = html;
  patchChildren(target, holder);
}
