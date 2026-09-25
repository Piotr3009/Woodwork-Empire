// Compressed air (PIOTR's bands from the trade; CLAUDE.md T10 3.2 and 3.3). Bar decides whether a
// machine runs at all; litres decide how fast everything on that compressor runs; the dryer
// decides whether the CNC runs and what the booth's finish is worth.

import { describe, expect, it } from 'vitest';
import {
  AIR_BENCH_DEMAND,
  AIR_DEMAND,
  AIR_DIVERSITY,
  AIR_HEADROOM,
  COMPRESSOR_AIR,
  LOW_AIR_FACTOR,
  OWNER_LABOUR_PER_MINUTE,
  WET_AIR_FINISH_RATING,
} from '../../src/engine/constants';
import {
  airBlockFor,
  airCheck,
  airDemandOf,
  compressorAirOf,
  compressorFor,
  compressorHasDryer,
  compressorLabel,
  compressors,
  familyAirBlock,
  familyRuns,
  hallAirCheck,
  hallBlock,
  needsDryAir,
  tick,
} from '../../src/engine/index';
import { hallPlaces } from '../../src/engine/machines';
import { jobPace, stageSpeed } from '../../src/engine/stages';
import { applyRating } from '../../src/engine/reputation';
import { renderCatalogue } from '../../src/ui/catalogue';
import { hallProblems, renderHall } from '../../src/render/hall';
import type { Equipment, GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
  withExtraction,
} from '../helpers';

/** A hall with one compressor of the class the test names, and nothing else on the air. */
function hallWithAir(compressorClass: string): GameState {
  const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
  placeEquipment(state, 'compressor', { variantId: compressorClass, x: 18, y: 4 });
  return state;
}

function firstCompressor(state: GameState): Equipment {
  const found = compressors(state)[0];
  if (!found) throw new Error('no compressor in the hall');
  return found;
}

describe('what the air tables say', () => {
  it('is Piotr’s bands, class by class', () => {
    expect(COMPRESSOR_AIR).toEqual({
      used: { bar: 8, litres: 150 },
      budget: { bar: 8, litres: 250 },
      standard: { bar: 10, litres: 450 },
      pro: { bar: 10, litres: 1100 },
      industrial: { bar: 13, litres: 2300 },
    });
    expect(AIR_DEMAND.edgebander).toEqual({
      standard: { bar: 7, litres: 250 },
      pro: { bar: 7, litres: 350 },
      industrial: { bar: 10, litres: 500 },
    });
    expect(airDemandOf({ specId: 'cnc', variantId: 'standard' })).toEqual({
      bar: 6.5,
      litres: 650,
    });
    expect(airDemandOf({ specId: 'sprayBooth', variantId: 'standard' })).toEqual({
      bar: 7,
      litres: 350,
    });
    // A hand edgebander and a saw run on no air at all.
    expect(airDemandOf({ specId: 'edgebander', variantId: 'budget' })).toBeNull();
    expect(airDemandOf({ specId: 'tableSaw', variantId: 'standard' })).toBeNull();
    expect(AIR_BENCH_DEMAND).toEqual({ bar: 6, litres: 30 });
    expect(AIR_DIVERSITY).toBe(0.6);
    expect(AIR_HEADROOM).toBe(0.85);
  });
});

describe('rule 1, the bar', () => {
  it('will not start a machine that wants more pressure than its compressor gives', () => {
    const state = hallWithAir('budget');
    const bander = placeEquipment(state, 'edgebander', { variantId: 'industrial', x: 4, y: 1 });
    expect(compressorAirOf(firstCompressor(state)).bar).toBe(8);
    expect(airBlockFor(state, bander)).toBe('needs 10 bar, compressor gives 8');
    expect(familyAirBlock(state, 'edgebander')).toBe('needs 10 bar, compressor gives 8');
  });

  it('starts the same machine on a compressor that gives enough', () => {
    const state = hallWithAir('standard');
    const bander = placeEquipment(state, 'edgebander', { variantId: 'industrial', x: 4, y: 1 });
    expect(compressorAirOf(firstCompressor(state)).bar).toBe(10);
    expect(airBlockFor(state, bander)).toBe('');
  });

  it('says so on the catalogue tile, before the money is spent', () => {
    const page = renderCatalogue(hallWithAir('budget'), '', 'sheetMachines', 'edgebander');
    expect(page).toContain('Needs 10 bar, 500 l/min, compressor gives 8');
  });

  it('stops no job for a bander that will not start: its places are gone and the machining goes by hand', () => {
    const state = fillRack(hallWithAir('budget'), 40);
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 2, y: 8 });
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
    placeEquipment(state, 'edgebander', { variantId: 'industrial', x: 10, y: 1 });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
    let next = acceptNow(state, enquiry.id, false);
    const job = firstJob(next);
    job.stage = 'ready';
    // Past the cutting and into the edging, which is the bander's stage: cutting is the first
    // quarter of the labour and edging the quarter after it (CLAUDE.md T7 3.1; v55).
    job.labourRemaining = job.labourValue * 0.68;
    next = act(next, { type: 'WORK_HERE', jobId: job.id });
    // The bar still decides whether a machine runs at all, and this one does not: it has no
    // places. Until v53 that stopped the job with `edgebander needs 10 bar, compressor gives 8`
    // on it; now nothing stops a job but the whole hall, and the bander's share of the job goes
    // at the by hand pace (PIOTR, 24.09; v53).
    expect(familyAirBlock(next, 'edgebander')).toBe('needs 10 bar, compressor gives 8');
    expect(familyRuns(next, 'edgebander')).toBe(false);
    expect(hallPlaces(next, 'edgebander')).toBe(0);
    expect(hallBlock(next, firstJob(next))).toBe('');
    expect(stageSpeed(next, firstJob(next), 'edging')).toEqual({ speed: 1 / 1.5, byHand: true });
    const before = firstJob(next).labourRemaining;
    const worked = tick(next, 1);
    expect(firstJob(worked).blockedBy).toBe('');
    // At the saw, whose turn it is for him in the first half hour, or at a bench: never at the
    // bander, which has no place (v55).
    expect(['machine:tableSaw', 'machine:workbench']).toContain(worked.owner.station);
    expect(worked.owner.working).toBe(true);
    // His minute at the job's one pace: the used saw's 0.95 on the cutting's quarter, the by hand
    // 1 / 1.5 on the edging's quarter and on the moulding's, the hall having no spindle moulder,
    // and 1.00 on the assembly's (v55).
    const pace = 1 / (0.25 / 0.95 + 0.25 * 1.5 + 0.25 * 1.5 + 0.25);
    expect(jobPace(worked, firstJob(worked))).toBeCloseTo(pace, 10);
    expect(before - firstJob(worked).labourRemaining).toBeCloseTo(OWNER_LABOUR_PER_MINUTE * pace, 10);
  });
});

describe('rule 2, the litres', () => {
  it('works the sum at the trade’s diversity and the pipe at its headroom', () => {
    const state = hallWithAir('used');
    // Four men at their benches: 4 x 30 l/min, worked at 0.6, against 150 x 0.85.
    const check = airCheck(state, { bench: 4 });
    const line = check.compressors[0];
    expect(line?.drawn).toBe(120);
    expect(line?.demand).toBeCloseTo(72, 6);
    expect(line?.allowed).toBeCloseTo(127.5, 6);
    expect(line?.low).toBe(false);
  });

  it('is short the moment there are more nailers than the pipe carries', () => {
    // Eight men at their benches: 8 x 30 l/min, worked at 0.6, is 144 against the 127.5 a used
    // compressor's pipe carries. Until v55 the ninth draw was a man sanding at 200 l/min; the
    // sanding is in the Assembly now and draws the bench's 30 (PIOTR, 24.09).
    const state = hallWithAir('used');
    const check = airCheck(state, { bench: 8 });
    const line = check.compressors[0];
    expect(line?.drawn).toBe(240);
    expect(line?.demand).toBeCloseTo(144, 6);
    expect(line?.low).toBe(true);
    expect(check.lowAir).toEqual([line?.id]);
    expect(check.lines).toEqual(['Low air on compressor 1: 144 of 128 l/min']);
  });

  it('runs every pneumatic consumer on that compressor at 0.7 for the minute', () => {
    expect(LOW_AIR_FACTOR).toBe(0.7);
    /** The owner at an assembly with a nailer, in a hall with `others` more men at benches. The
     *  work all goes into the one job he is on; the rest are there to draw air. */
    function assembled(compressorClass: string, others: number): number {
      const state = fillRack(hallWithAir(compressorClass), 200);
      placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
      state.enquiries = [];
      for (let index = 0; index <= others; index += 1) {
        placeEquipment(state, 'workbench', {
          variantId: 'budget',
          x: 2 + index * 2,
          y: 8,
          id: `kit-bench-${index}`,
        });
        placeEnquiry(state, { price: 4000, deadlineDays: 40, name: `Job ${index}` });
      }
      let next = state;
      for (const enquiry of state.enquiries.slice()) {
        next = acceptNow(next, enquiry.id, false);
      }
      for (const job of next.jobs) {
        job.stage = 'inProduction';
        job.assignees = ['owner'];
        // Into the assembly, the last quarter, which is the stage a man does with a nailer in
        // his hand (v55).
        job.labourRemaining = job.labourValue * 0.2;
      }
      // The saw was there for the board to take sheet work at all; now it goes, so the benches
      // are the one place the owner has and he is at one with his nailer whichever half hour it
      // is (v55).
      next.equipment = next.equipment.filter((item) => item.specId !== 'tableSaw');
      const before = firstJob(next).labourRemaining;
      const worked = runClock(next, 20);
      // Unrounded: the figures moved in v53 with the job's one pace, and a figure rounded to five
      // places times 0.7 is no longer a figure rounded to five places.
      return before - firstJob(worked).labourRemaining;
    }
    // One man at a bench draws 30 l/min, which a used compressor holds without noticing. His
    // twenty minutes are 9.6970 of labour, at the job's one pace on a hall with no machine but
    // the benches: three quarters by hand at 1 / 1.5 and the assembly's at 1.00 (v55; 12.2531
    // on v53, with a used saw and the old shares).
    const fine = assembled('used', 0);
    expect(fine).toBeCloseTo(20 * OWNER_LABOUR_PER_MINUTE / (0.75 * 1.5 + 0.25), 4);
    expect(fine).toBeCloseTo(9.697, 3);
    // Eight of them draw 240, worked at 0.6 that is 144 against the 128 the pipe carries.
    const low = assembled('used', 7);
    expect(low).toBeCloseTo(fine * LOW_AIR_FACTOR, 10);
    // The same eight on a compressor that holds them are back at full speed.
    expect(assembled('pro', 7)).toBeCloseTo(fine, 10);
  });

  it('says so under the hall, with a lamp on the compressor', () => {
    const state = fillRack(hallWithAir('used'), 40);
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 2, y: 8 });
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
    state.enquiries = [];
    // Eight jobs in assembly at once: far more nailers than a used compressor will feed.
    for (let index = 0; index < 8; index += 1) {
      placeEquipment(state, 'workbench', {
        variantId: 'budget',
        x: 2 + index * 2,
        y: 6,
        id: `kit-bench-${index}`,
      });
      const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40, name: `Job ${index}` });
      const next = acceptNow(state, enquiry.id, false);
      state.jobs = next.jobs;
      state.enquiries = next.enquiries;
      state.tasks = next.tasks;
    }
    for (const job of state.jobs) {
      job.stage = 'inProduction';
      job.assignees = ['owner'];
      job.labourRemaining = job.labourValue * 0.2;
    }
    // The saw goes once the jobs are on the books, so the benches are the one place the owner
    // has (v55).
    state.equipment = state.equipment.filter((item) => item.specId !== 'tableSaw');
    expect(hallAirCheck(state).lowAir).toHaveLength(1);
    const page = renderHall(state);
    expect(
      hallProblems(state).some((problem) => problem.text.startsWith('Low air on compressor 1')),
    ).toBe(true);
    expect(page).toContain('fx-lamp');
  });
});

describe('rule 3, the hours', () => {
  it('runs a compressor’s clock only while something draws on it', () => {
    const state = fillRack(hallWithAir('standard'), 40);
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 2, y: 8 });
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
    let next = acceptNow(state, enquiry.id, false);
    const job = firstJob(next);
    job.stage = 'ready';
    // Cutting is done on the saw with no air in it at all: the saw is the owner's turn in the
    // first half hour (v55).
    const idle = runClock(act(next, { type: 'WORK_HERE', jobId: job.id }), 20);
    expect(idle.owner.station).toBe('machine:tableSaw');
    expect(firstCompressor(idle).hoursUsed).toBe(0);
    // The assembly is done with a nailer, and the compressor's clock runs for it: the job in its
    // last quarter and the saw gone, so the bench is his one place for the hour. One clock hour,
    // however many men draw on it (v55).
    firstJob(next).labourRemaining = firstJob(next).labourValue * 0.2;
    next.equipment = next.equipment.filter((item) => item.specId !== 'tableSaw');
    next = runClock(act(next, { type: 'WORK_HERE', jobId: job.id }), 60);
    expect(firstCompressor(next).hoursUsed).toBeCloseTo(1, 2);
  });
});

describe('the assignment', () => {
  it('puts everything on the first compressor until the player says otherwise', () => {
    const state = hallWithAir('standard');
    const bander = placeEquipment(state, 'edgebander', { variantId: 'standard', x: 4, y: 1 });
    expect(bander.compressorId).toBeNull();
    expect(compressorFor(state, bander)?.id).toBe(firstCompressor(state).id);
    const second = placeEquipment(state, 'compressor', {
      variantId: 'pro',
      x: 18,
      y: 8,
      id: 'kit-air-2',
    });
    expect(compressorLabel(state, second)).toBe('compressor 2');
    const moved = act(state, {
      type: 'ASSIGN_AIR',
      equipmentId: bander.id,
      compressorId: second.id,
    });
    const after = moved.equipment.find((item) => item.id === bander.id);
    expect(after?.compressorId).toBe(second.id);
    expect(compressorFor(moved, after as Equipment)?.id).toBe(second.id);
    // And a machine draws from its own compressor only.
    expect(airCheck(moved).compressors[0]?.drawn).toBe(0);
  });

  it('says which compressor a machine is on, in the Owned tab', () => {
    const state = hallWithAir('standard');
    placeEquipment(state, 'edgebander', { variantId: 'standard', x: 4, y: 1 });
    placeEquipment(state, 'compressor', { variantId: 'pro', x: 18, y: 8, id: 'kit-air-2' });
    const page = renderCatalogue(state, '', 'owned', null, 'all');
    // The consumer's line moved under the rule of its card in v35, in colour, and says what it
    // needs beside what the compressor gives (PIOTR, 20.09).
    expect(page).toContain('compressor 1 gives');
    expect(page).toContain('compressor 1: 10 bar, 450 l/min');
    // Two compressors, so the valve is on the tile, one chip each and one click each.
    expect(page).toContain('data-do="assignAir"');
  });
});

describe('the dryer', () => {
  it('is built into the industrial compressor and bought for the rest', () => {
    const wet = hallWithAir('standard');
    expect(compressorHasDryer(wet, firstCompressor(wet))).toBe(false);
    placeEquipment(wet, 'airDryer', { x: 17, y: 4 });
    expect(compressorHasDryer(wet, firstCompressor(wet))).toBe(true);
    const built = hallWithAir('industrial');
    expect(compressorHasDryer(built, firstCompressor(built))).toBe(true);
  });

  it('gates the CNC, which will not run on wet air at all', () => {
    expect(needsDryAir('cnc')).toBe(true);
    const wet = hallWithAir('standard');
    const cnc = placeEquipment(wet, 'cnc', { x: 4, y: 4 });
    expect(airBlockFor(wet, cnc)).toBe('needs dry air');
    placeEquipment(wet, 'airDryer', { x: 17, y: 4 });
    expect(airBlockFor(wet, cnc)).toBe('');
  });

  it('costs a spray booth its finish, and never stops it', () => {
    const wet = hallWithAir('standard');
    const booth = placeEquipment(wet, 'sprayBooth', { x: 4, y: 4 });
    // It still runs: the booth is not gated the way the CNC is (CLAUDE.md T10 3.3).
    expect(needsDryAir('sprayBooth')).toBe(false);
    expect(airBlockFor(wet, booth)).toBe('');
    // And the piece it sprayed carries the defects to the client.
    const state = newGame();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000 });
    const next = acceptNow(state, enquiry.id, false);
    const job = firstJob(next);
    expect(job.wetFinish).toBe(false);
    job.wetFinish = true;
    const clean = { ...job, wetFinish: false };
    const rating = applyRating(next, job);
    expect(rating).toBe(applyRating({ ...next, reputationLog: [] }, clean) - WET_AIR_FINISH_RATING);
    expect(next.reputationLog.map((entry) => entry.reason)).toContain(
      `${job.name}: finish defects`,
    );
  });
});
