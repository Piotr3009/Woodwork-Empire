/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The production line's own state (PIOTR, 10.10 and 11.10; CLAUDE.md T30). The line is six modules
// of kit on the floor, bought whole, and everything of it that is not kit lives in one field of the
// state, `state.windowLine`: its contract, the day it may be offered again, the minutes into the
// window in hand, the windows on module 6's pallet, the full pallets at the gate and the upgrades.
// The field is written whole from the first task that needs it, every part with its default, so
// the save is lifted once (CLAUDE.md T30 section 4) [TUNE: the name of this module].

import type { WindowLineState } from './types';

/** The line's state of a company that has never had a line: no contract, no offer yet, no window
 *  in hand, an empty pallet, nothing at the gate and no upgrade (CLAUDE.md T30 section 4). */
export function emptyWindowLine(): WindowLineState {
  return {
    contract: null,
    nextOfferDay: null,
    minutes: 0,
    onPallet: 0,
    palletsAtGate: 0,
    upgrades: [],
  };
}
