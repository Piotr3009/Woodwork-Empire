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

/** The nodes a piece of markup made on its own, one node a piece (`patchPieces`), each with the
 *  markup it was made of after its first tag: only such a node can stand in for its piece the next
 *  time without the piece being parsed (v126). */
const pieceBodies = new WeakMap<Node, string>();

/** True when these two are the same thing a minute apart, and not two different things. */
function isSame(old: Node, fresh: Node): boolean {
  if (old.nodeType !== fresh.nodeType) return false;
  if (old.nodeType === TEXT_NODE) return true;
  if (old.nodeType !== ELEMENT_NODE) return true;
  const before = old as Element;
  const after = fresh as Element;
  // The scene the page carries from page to page (`mountScene`) and the empty slot the fresh
  // markup leaves for it are the same thing, whatever their tags: an `<svg>` of the hall standing
  // where the markup says `<div data-scene-slot>`. Told apart by their tags, as they were until
  // v122, the hall was taken out of the page at every page written, once a game minute, and put
  // back by `mountScene`: every picture in it painted again from nothing, and the big ones, the
  // house factory's stations first, blinked [PIOTR, 20.10: "the graphic disappears and comes back,
  // the same problem the other lines had"]. One marked and the other not are never the same.
  const slotBefore = before.hasAttribute('data-scene-slot');
  const slotAfter = after.hasAttribute('data-scene-slot');
  if (slotBefore || slotAfter) return slotBefore && slotAfter;
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

/** The open state of a details element is the player's, like a scrolled body or a caret: the
 *  markup never carries it, so the patch never takes it away. The efficiency plate on the top bar
 *  is one, and it would shut every game minute otherwise (CLAUDE.md T13 3.5). */
function isPlayersToKeep(element: Element, attribute: string): boolean {
  return attribute === 'open' && element.tagName === 'DETAILS';
}

function patchAttributes(old: Element, fresh: Element): void {
  for (const attribute of Array.from(fresh.attributes)) {
    if (old.getAttribute(attribute.name) !== attribute.value) {
      old.setAttribute(attribute.name, attribute.value);
    }
  }
  for (const attribute of Array.from(old.attributes)) {
    if (isPlayersToKeep(old, attribute.name)) continue;
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
  // A drawable of the hall whose markup carries the mark it carried last time is the same inside:
  // its own attributes are brought into line, and nothing inside it is read or written (v104).
  // What the frame has moved in it since, a man's step or a machine's frame, stays where it is.
  const mark = before.getAttribute('data-sig');
  const same = mark !== null && mark === (fresh as Element).getAttribute('data-sig');
  patchAttributes(before, fresh as Element);
  if (!same) patchChildren(before, fresh as Element);
}

/** The attributes that say which thing of the hall an element is drawn for, first that it carries
 *  wins: a piece of kit, an engineer, a line's forklift, a man, a canteen's kit, a line's yellow
 *  lane, a pallet at the gate, a room, the buyer's van and a room's door (v104). */
const IDENTITY = [
  'data-kit',
  'data-engineer',
  'data-forklift-line',
  'data-figure',
  'data-canteen-kit',
  'data-lane',
  'data-line-pallet',
  'data-room',
  'data-van',
  'data-door-room',
];

/** Which thing this node is drawn for, or null for a node that says none. */
function identityOf(node: Node): string | null {
  if (node.nodeType !== ELEMENT_NODE) return null;
  const element = node as Element;
  if (element.attributes.length === 0) return null;
  for (const name of IDENTITY) {
    const value = element.getAttribute(name);
    if (value !== null) return `${name}=${value}`;
  }
  return null;
}

/** The identity of every node of a list, a second node of the same identity told apart from the
 *  first by its count, so two drawn for one thing are matched in their order. */
function identitiesOf(nodes: readonly Node[]): Array<string | null> {
  const seen = new Map<string, number>();
  return nodes.map((node) => {
    const identity = identityOf(node);
    if (identity === null) return null;
    const count = seen.get(identity) ?? 0;
    seen.set(identity, count + 1);
    return count === 0 ? identity : `${identity}#${count}`;
  });
}

/** The things that walk and drive: the engineers, the forklifts and the men. When a figure has
 *  passed a machine since the last page and the order of the two has to change, it is the figure
 *  that is moved and never the machine (v121) [PIOTR, 19.10: "the houses disappear and blink like
 *  mad"]: moving an SVG `<image>` out of the document and back fetches and decodes its picture
 *  again, which on a station of the house factory, five million pixels, is a blink the eye sees;
 *  a figure is a cell of a small sheet and comes back at once. Measured on v120: at 1x a station
 *  was moved about once a game minute, as its ten engineers walked past it. */
const MOVABLE = ['data-engineer', 'data-forklift-line', 'data-figure'];

function isMovable(identity: string | null): boolean {
  return identity !== null && MOVABLE.some((name) => identity.startsWith(`${name}=`));
}

/** The places in `from` of the longest run of old places that rise, the old places being the
 *  order the nodes stand in now and -1 for a node that is new: the nodes already in the right
 *  order among themselves, which are left where they are. A place marked `movable` is never in the
 *  run: its node is put where it belongs around the ones that stay (v121). */
function longestRising(from: readonly number[], movable: readonly boolean[] = []): Set<number> {
  const tails: number[] = [];
  const previous = new Array<number>(from.length).fill(-1);
  from.forEach((value, index) => {
    if (value < 0 || movable[index] === true) return;
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((from[tails[middle] as number] as number) < value) low = middle + 1;
      else high = middle;
    }
    if (low > 0) previous[index] = tails[low - 1] as number;
    tails[low] = index;
  });
  const stay = new Set<number>();
  for (let at = tails[tails.length - 1] ?? -1; at >= 0; at = previous[at] as number) stay.add(at);
  return stay;
}

/** The children of a list whose nodes say what they are drawn for: each is matched to the old node
 *  drawn for the same thing wherever it stands, and moved there when the order has changed, never
 *  turned into its neighbour (v104). The hall's live layer is the list: its kit, men, engineers
 *  and forklifts are sorted by depth, and a man walking past a machine changes the order. Matched
 *  by place, as the rest of the page is, a module of a line became the machine that had stood
 *  before it and its picture was fetched again, and the line blinked out of the hall [PIOTR,
 *  18.10: "every now and then our production lines disappear"]. A node that says nothing is matched
 *  to the next old node that says nothing, as before. */
function patchByIdentity(
  target: Element,
  olds: readonly Node[],
  news: readonly Node[],
  identities: Array<string | null>,
  kept: ReadonlyMap<Node, string | null> = new Map(),
): void {
  const oldIdentities = identitiesOf(olds);
  const byIdentity = new Map<string, number>();
  const loose: number[] = [];
  oldIdentities.forEach((identity, index) => {
    if (identity === null) loose.push(index);
    else byIdentity.set(identity, index);
  });
  let looseAt = 0;
  const final: Node[] = [];
  const from: number[] = [];
  const matched = new Set<number>();
  news.forEach((next, index) => {
    const identity = identities[index] ?? null;
    const at = identity === null ? loose[looseAt++] : byIdentity.get(identity);
    const old = at === undefined ? undefined : olds[at];
    if (old !== undefined && at !== undefined && !matched.has(at) && (old === next || isSame(old, next))) {
      // A node handed in as itself (`patchPieces`) is the same markup as it stands: only the depth
      // it is sorted at, which its mark does not cover, is brought into line (v126).
      if (old === next) {
        keepDepth(old as Element, kept.get(old) ?? null);
      } else {
        patchNode(old, next);
        // The old node stands for whatever the fresh one was made from from now on (v126).
        const body = pieceBodies.get(next);
        if (body === undefined) pieceBodies.delete(old);
        else pieceBodies.set(old, body);
      }
      matched.add(at);
      final.push(old);
      from.push(at);
    } else {
      final.push(next);
      from.push(-1);
    }
  });
  olds.forEach((old, index) => {
    if (!matched.has(index)) target.removeChild(old);
  });
  const stay = longestRising(
    from,
    identities.map((identity) => isMovable(identity)),
  );
  let after: Node | null = null;
  for (let index = final.length - 1; index >= 0; index -= 1) {
    const node = final[index] as Node;
    // A figure already standing where it belongs is not taken out of the page and put back: every
    // engineer and man was, every page, wherever he stood (v126).
    const inPlace = node.parentNode === target && node.nextSibling === after;
    if (!stay.has(index) && !inPlace) target.insertBefore(node, after);
    after = node;
  }
}

function patchChildren(target: Element, fresh: Element): void {
  const olds = Array.from(target.childNodes);
  const news = Array.from(fresh.childNodes);
  const identities = identitiesOf(news);
  if (identities.some((identity) => identity !== null) || olds.some((old) => identityOf(old) !== null)) {
    patchByIdentity(target, olds, news, identities);
    return;
  }
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

// ---------------------------------------------------------------------------
// The live layer piece by piece (v126) [PIOTR, 24.10: "redrawing every second makes no sense: only
// let the animations run, and work it out again when something changes"]. The hall's live layer
// was written whole every game minute: four thousand elements of markup, about 440,000 characters
// on Piotr's save of day 8,464, parsed by the browser and compared node for node with what stood,
// when in most minutes a handful of them had changed. A drawable whose markup carries the mark it
// carried last time is now left standing untouched, its markup never parsed; only what has changed,
// come or gone is parsed and put in. The page left is the page the whole writing left.
// ---------------------------------------------------------------------------

/** Writes the depth the scene sorted a drawable at, which its mark does not cover. */
function keepDepth(node: Element, depth: string | null): void {
  if (depth === null) {
    if (node.hasAttribute('data-depth')) node.removeAttribute('data-depth');
  } else if (node.getAttribute('data-depth') !== depth) {
    node.setAttribute('data-depth', depth);
  }
}

/** The text of an attribute as markup writes it, as the page reads it. */
function attributeText(raw: string): string {
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** The attributes a first tag's own reading here gives exactly as the browser's parser gives them:
 *  names it keeps as they are written, and values with no character it would read otherwise. */
const PLAIN_NAME = /^(?:data-[a-z0-9-]+|aria-[a-z-]+|transform|class|style|pointer-events|opacity|fill|stroke|visibility|display|cursor|id|role|tabindex)$/;
const PLAIN_VALUE = /^(?:[^&\r\0]|&(?:quot|#39|lt|gt|amp);)*$/;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** What a piece says of itself in its first tag. */
interface Head {
  /** The tag's name as written. */
  tag: string;
  /** Its attributes in their order as the page reads them, the first of a name winning, or null
   *  when one of them is not plain enough to be sure the page reads it the same. */
  attributes: Array<[string, string]> | null;
  /** The thing it is drawn for, its mark and its depth. */
  identity: string | null;
  sig: string | null;
  depth: string | null;
  /** Where the first tag ends in the piece. */
  end: number;
}

/** What a piece says of itself in its first tag; null for a piece that does not open with a tag. */
function headOf(piece: string): Head | null {
  const tag = /^<([a-zA-Z][^\s>/]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/.exec(piece);
  if (tag === null) return null;
  const read = new Map<string, string>();
  let plain = true;
  for (const found of (tag[2] ?? '').matchAll(/([^\s=>/]+)(?:="([^"]*)")?/g)) {
    const name = found[1];
    if (name === undefined || read.has(name)) continue;
    const raw = found[2] ?? '';
    if (!PLAIN_NAME.test(name) || !PLAIN_VALUE.test(raw)) plain = false;
    read.set(name, attributeText(raw));
  }
  let identity: string | null = null;
  for (const name of IDENTITY) {
    const value = read.get(name);
    if (value !== undefined) {
      identity = `${name}=${value}`;
      break;
    }
  }
  return {
    tag: tag[1] ?? '',
    attributes: plain ? Array.from(read.entries()) : null,
    identity,
    sig: read.get('data-sig') ?? null,
    depth: read.get('data-depth') ?? null,
    end: tag[0].length,
  };
}

/** True when this standing node is the element the piece's first tag would make, all but its
 *  attributes: the same tag, an SVG element as the hall's are, the same control, and no slot. */
function takesHead(old: Element, head: Head, attributes: ReadonlyArray<[string, string]>): boolean {
  if (old.namespaceURI !== SVG_NAMESPACE || old.tagName !== head.tag) return false;
  const valueOf = (name: string): string | null => attributes.find(([written]) => written === name)?.[1] ?? null;
  if (old.hasAttribute('data-scene-slot') || valueOf('data-scene-slot') !== null) return false;
  return old.getAttribute('data-do') === valueOf('data-do') && old.getAttribute('data-id') === valueOf('data-id');
}

/** Brings a node's own attributes into line with a first tag's, as `patchAttributes` brings them
 *  into line with a fresh node's. */
function writeHead(old: Element, attributes: ReadonlyArray<[string, string]>): void {
  for (const [name, value] of attributes) {
    if (old.getAttribute(name) !== value) old.setAttribute(name, value);
  }
  const written = new Set(attributes.map(([name]) => name));
  for (const attribute of Array.from(old.attributes)) {
    if (isPlayersToKeep(old, attribute.name)) continue;
    if (!written.has(attribute.name)) old.removeAttribute(attribute.name);
  }
}

/** Writes this markup, given as the pieces it is made of in their order, each the markup of one
 *  drawable or of a few nodes, into the element: what `patchInto` writes of the pieces joined, the
 *  page node for node the same (v126). A piece whose node stands with the mark the piece carries is
 *  not parsed: the node is kept as it is, and only its depth is written. Nor is a piece whose node
 *  stands made of the same markup after its first tag, an engineer walked on or a man come into
 *  another cell: only the node's own attributes are written, as a fresh node's would be. */
export function patchPieces(target: Element, pieces: readonly string[]): void {
  const olds = Array.from(target.childNodes);
  const standing = new Map<string, Node>();
  identitiesOf(olds).forEach((identity, index) => {
    const old = olds[index];
    if (identity !== null && old !== undefined) standing.set(identity, old);
  });
  const news: Node[] = [];
  const identities: Array<string | null> = [];
  const kept = new Map<Node, string | null>();
  // Counted in the order of the fresh markup, as `identitiesOf` counts it: a second node drawn for
  // the same thing is told apart from the first by its count.
  const counts = new Map<string, number>();
  const nextOf = (identity: string): string => {
    const count = counts.get(identity) ?? 0;
    return count === 0 ? identity : `${identity}#${count}`;
  };
  const count = (identity: string | null): string | null => {
    if (identity === null) return null;
    const counted = nextOf(identity);
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
    return counted;
  };
  let holder: Element | null = null;
  for (const piece of pieces) {
    const head = headOf(piece);
    if (head !== null && head.identity !== null) {
      const old = standing.get(nextOf(head.identity));
      const body = old === undefined ? undefined : pieceBodies.get(old);
      if (old instanceof Element && body !== undefined) {
        const same = head.sig !== null && old.getAttribute('data-sig') === head.sig;
        const attributes = head.attributes;
        const inside = !same && attributes !== null && body === piece.slice(head.end) && takesHead(old, head, attributes);
        if (same || inside) {
          if (inside && attributes !== null) writeHead(old, attributes);
          news.push(old);
          identities.push(count(head.identity));
          kept.set(old, head.depth);
          continue;
        }
      }
    }
    if (holder === null) {
      const copy = target.cloneNode(false);
      if (!(copy instanceof Element)) return;
      holder = copy;
    }
    holder.innerHTML = piece;
    const made = Array.from(holder.childNodes);
    for (const node of made) {
      news.push(node);
      identities.push(count(identityOf(node)));
    }
    const only = made.length === 1 ? made[0] : undefined;
    if (only !== undefined && head !== null) pieceBodies.set(only, piece.slice(head.end));
  }
  patchByIdentity(target, olds, news, identities, kept);
}
