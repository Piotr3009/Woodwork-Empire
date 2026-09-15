// All shapes of the simulation. Everything here is plain JSON: no classes, no functions,
// no Map, no Set. `JSON.parse(JSON.stringify(state))` must return an identical state.

export type Difficulty = 'veryEasy' | 'easy' | 'hard';

/** 0 is paused. Ten is the fastest there is (PIOTR, 13.09; CLAUDE.md T9 3.11). */
export type Speed = 0 | 1 | 2 | 4 | 10;

export type MaterialKind = 'sheet' | 'solidWood';

export type Finish = 'laminate' | 'lacquer' | 'veneer';

/** The stages a job goes through in the hall (CLAUDE.md T7 3.1). `cnc` is the one stage a CNC
 *  does instead of Cutting and Machining; `delivery` carries no labour at all. */
export type StageId = 'cutting' | 'machining' | 'cnc' | 'assembly' | 'finishing' | 'delivery';

/** One stage of the work, as the catalogue of stages holds it. */
export interface StageSpec {
  id: StageId;
  label: string;
  /** Share of the job's labour it carries. */
  share: number;
}

/** One run at one stage: when somebody started it and when it was finished. The Work Plan draws
 *  its bars from these, so a gap in them is a gap the player can see (CLAUDE.md T7 3.2). */
export interface StageRun {
  stage: StageId;
  startDay: number;
  startMinute: number;
  /** Null while the stage is still in hand. */
  endDay: number | null;
  endMinute: number | null;
}

export type SoftwareTier = 'basic' | 'standard' | 'pro';

export type SoftwareMode = 'none' | 'oneOff' | 'subscription';

export type TaskCategory = 'admin' | 'design' | 'workshop';

/** The seven things a working day of the owner's is made of, as the top bar paints them
 *  (CLAUDE.md T11 3.1). Break and idle are not on the list: unpainted is unpainted. */
export type DayCategory =
  | 'workshop'
  | 'calls'
  | 'emails'
  | 'meetings'
  | 'siteMeasure'
  | 'office'
  | 'fixing'
  /** Assigning the crew to their work: the owner's until a production manager takes it off him,
   *  and then the manager's own (CLAUDE.md T13 3.9). */
  | 'assign';

/** One run of minutes on one thing. Consecutive minutes on the same thing are one segment, so a
 *  morning of drawing is one entry and not two hundred (CLAUDE.md T11 3.1). */
export interface DayLogEntry {
  category: DayCategory;
  minutes: number;
}

/** A day of the owner's, kept after it closed so the week can be added up (CLAUDE.md T11 3.1). */
export interface DayLog {
  day: number;
  segments: DayLogEntry[];
}

/** How often the player wants the end of day summary in front of him. A preference, not an
 *  engine number: the day ends the same way whatever it says (CLAUDE.md T4 3.6). */
export type SummaryCadence = 'daily' | 'weekly' | 'monthly';

export type WorkerRole =
  | 'joiner'
  | 'helper'
  | 'officeAdmin'
  | 'purchasingClerk'
  | 'salesman'
  /** The one who draws, at 0.8 of the owner's own speed (PIOTR; CLAUDE.md T10 3.6). */
  | 'draftsman'
  /** Reads the drawing and counts the sheets: the material take off, so many a day
   *  (CLAUDE.md T13 3.8). The tab calls him Technical. */
  | 'estimator'
  /** The first management role: the second shift, the assigning, and the owner's absence covered
   *  (CLAUDE.md T13 3.9). */
  | 'productionManager';

/** Which shift a man on the floor works. The second one runs after the day shift, at the night
 *  rate, only while a production manager is on the books (CLAUDE.md T13 3.9). */
export type Shift = 'day' | 'night';

/** Residential is the work the board has always carried; commercial is bigger, wants a standing
 *  and a crew, and both covers of insurance held (CLAUDE.md T13 3.15). */
export type EnquiryKind = 'residential' | 'commercial';

export type WorkerTier = 'poor' | 'normal' | 'super';

export type EquipmentCategory =
  | 'furniture'
  | 'machine'
  | 'bench'
  | 'welfare'
  | 'tools'
  | 'vehicle'
  | 'extraction'
  | 'storage';

/** One class of a machine: the same job done by a worn out one or by an industrial one
 *  (CLAUDE.md T3 3.5). Every family has at least one. */
export interface EquipmentVariant {
  id: string;
  name: string;
  price: number;
  /** Multiplies the production speed of the stage this machine does, and of no other
   *  (CLAUDE.md T7 3.1). */
  outputFactor: number;
  /** Multiplies the family's base endurance in hours. */
  enduranceFactor: number;
  /** Power this one draws a day. */
  powerPerDay: number;
  /** Two or three lines of plain English about what this class of machine is. */
  description: string;
  /** What the picture stands on, in metres. Left out means the family's own footprint
   *  (CLAUDE.md T7 3.3). */
  width?: number;
  depth?: number;
  height?: number;
  /** The floor this class reserves, in metres: the working room around it, which contains the
   *  footprint. Left out means the family's own zone. Zero means it holds no floor at all,
   *  because it is kept in a tool cabinet (CLAUDE.md T7 3.3, 3.6). */
  zoneWidth?: number;
  zoneDepth?: number;
  /** Sheets this class holds. Left out means the family's own (CLAUDE.md T7 3.6). */
  sheetCapacity?: number;
  /** What must be owned before this class can be bought. Left out means the family's own: a
   *  floor edgebander wants extraction where a hand one wants a cabinet (CLAUDE.md T7 3.6). */
  requires?: string[];
  requiresOneOf?: string[];
  /** Working days between the click and the lorry. Filled in for every class the catalogue
   *  hands out, from the class ladder or the family's own figure (CLAUDE.md T8 3.2). */
  deliveryDays?: number;
}

/** One line of the day 1 catalogue (CLAUDE.md 9.2). A catalogue line is a family: the modal
 *  behind it shows one tile per variant (CLAUDE.md T3 3.5). */
/** The tabs the equipment catalogue is laid out in, in the order Piotr gave them
 *  (CLAUDE.md T6 3.6). */
export type EquipmentTab =
  | 'sheetMachines'
  | 'timberMachines'
  | 'spraying'
  | 'sanding'
  | 'handTools'
  | 'extraction'
  | 'computers'
  | 'cnc'
  | 'cncCentre'
  | 'handling'
  | 'storage';

export interface EquipmentSpec {
  id: string;
  name: string;
  price: number;
  category: EquipmentCategory;
  /** Which tab of the catalogue it is under. Every line has one (CLAUDE.md T6 3.6). */
  tab: EquipmentTab;
  /** A second tab the family's folder is shown under as well, for a family two trades share: the
   *  spindle moulder is a sheet machine and a timber machine (CLAUDE.md T13 3.13). */
  sharedTab: EquipmentTab | null;
  /** The folder inside that tab, named for the family in the plural: a tab holds folders and a
   *  folder holds the classes of one family (CLAUDE.md T7 3.7). */
  folder: string;
  /** Footprint in tiles. */
  width: number;
  depth: number;
  height: number;
  /** The floor the family reserves by default, in metres. A class may say its own
   *  (CLAUDE.md T7 3.3). */
  zoneWidth: number;
  zoneDepth: number;
  spriteKey: string;
  /** The machine only runs on jobs of this material. null means every job. */
  usedOn: MaterialKind | null;
  /** Sheets this item can hold on the rack. 0 for everything that is not shelving. */
  sheetCapacity: number;
  /** Reputation needed to buy. */
  minReputation: number;
  /** Parked for a later stage: shown with a price, buy button disabled. */
  locked: boolean;
  lockReason: string;
  /** One per worker (workbench, locker, canteen seat, hand tool set). */
  perWorker: boolean;
  /** More than one may be owned. */
  stackable: boolean;
  /** Other catalogue ids that must be owned first. */
  requires: string[];
  /** Catalogue ids of which at least one must be owned first. Empty means no such condition. */
  requiresOneOf: string[];
  effect: string;
  /** Working days between the click and the lorry for a class that does not say its own
   *  (CLAUDE.md T8 3.2). Zero means it comes back with the owner from the trip. */
  deliveryDays: number;
  /** What this family can be bought as, cheapest first. The catalogue price is the first one. */
  variants: EquipmentVariant[];
  /** Hours of use a standard one of these has in it [TUNE]. */
  enduranceHours: number;
}

/** A purchased item standing in the hall. */
export interface Equipment {
  id: string;
  specId: string;
  /** Which variant of its family was bought (CLAUDE.md T3 3.5). */
  variantId: string;
  spriteKey: string;
  anchorX: number;
  anchorY: number;
  broken: boolean;
  /** Hours on the machine's own clock at the last service: the service is due by its hours, not
   *  by the calendar (CLAUDE.md T6 3.6). */
  serviceHours: number;
  /** Hours of use it has in it, family base times the variant factor. */
  enduranceHours: number;
  /** Hours of use it has had. Past its endurance it starts giving up. */
  hoursUsed: number;
  /** The one man standing at it: 'owner', a worker id, or null while it is free. A machine serves
   *  one person at a time (CLAUDE.md T7 3.1). */
  takenBy: string | null;
  purchasePrice: number;
  /** The working day the buyer's van comes for it. Null while it is the company's. A machine
   *  that is sold stops working the moment the sale is made (CLAUDE.md T8 3.5). */
  soldOnDay: number | null;
  /** The compressor this one draws its air from, for a machine that wants air and for an air
   *  dryer, which is fitted to one compressor. Null means the first compressor in the hall, which
   *  is what "default: all" means (CLAUDE.md T10 3.2, 3.3). */
  compressorId: string | null;
  /** Stood at ninety degrees to the walls: the footprint and the working zone swap their width
   *  and their depth, and the picture is mirrored unless the art side has delivered a second
   *  orientation for it (PIOTR, CLAUDE.md T10 3.8). */
  rotated: boolean;
}

/** Something bought and paid for that is not here yet: the cash left at the click, the item is
 *  not in the hall, and the cells it will stand on are held for it (CLAUDE.md T8 3.2). */
export interface OnOrderItem {
  id: string;
  specId: string;
  variantId: string;
  /** What left the bank at the click, which is what a cancellation gives back in full. */
  pricePaid: number;
  /** The day he ordered it, and the working day it lands on at 08:00. */
  orderedDay: number;
  dueDay: number;
  /** The corner of the floor held for it, read exactly as a machine's anchor is. */
  anchorX: number;
  anchorY: number;
  /** True from 08:00 of the due day until somebody has it off the lorry. */
  arrived: boolean;
  /** The outline is dragged and turned like the machine it holds the floor for (T10 3.8). */
  rotated: boolean;
}

export interface ProductTemplate {
  id: string;
  name: string;
  basePrice: number;
  material: MaterialKind;
  designMinutes: number;
  calls: number;
  needsMeasure: boolean;
  requiredEquipment: string[];
  allowedFinishes: Finish[];
  minReputation: number;
  /** Draw weight per reputation tier, index 0 is the lowest tier. */
  weightsByTier: number[];
  byHandAllowed: boolean;
}

export interface Clock {
  /** 1-based absolute day. Day 1 is a Monday. */
  day: number;
  /** Minutes since 08:00. 540 is 17:00, the end of the working day; overtime runs above it and
   *  the clock never passes 660, which is 19:00. */
  minute: number;
}

export interface OwnerState {
  present: boolean;
  minutesByCategory: Record<TaskCategory, number>;
  minutesWorked: number;
  /** Overtime minutes worked today. Any at all costs him tomorrow. */
  overtimeMinutes: number;
  /** What today's work is multiplied by: 1 less the overtime debt, and 3% off again if he worked
   *  through yesterday's dinner. Floored (CLAUDE.md T6 3.4). */
  labourFactor: number;
  /** 0.10 for every day with overtime in it, cumulative, back to zero on Monday morning. */
  overtimeDebt: number;
  /** He worked through dinner on the last day he worked: 60 minutes more then, 3% off after. */
  breakSkipped: boolean;
  /** The two questions the day puts to him, so neither is put twice. */
  breakAsked: boolean;
  homeAsked: boolean;
  wentHome: boolean;
  currentTaskId: string | null;
  /** What the phone interrupted, so he goes back to it when the call is over (T4 3.3). */
  resumeTaskId: string | null;
  sickDaysRemaining: number;
  /** Absolute day the next sick leave starts. */
  sickStartDay: number | null;
  /** Player asked to stay home today. */
  stayHome: boolean;
  /** Days of holiday still to come, counting today. Only with a production manager to cover
   *  (CLAUDE.md T13 3.9). */
  holidayDaysRemaining: number;
  /** Where he is standing: bench, machine:<specId>, rack, gate, office or idle. */
  station: string;
  /** Minutes of production worked, which drives the bench and machine cycle. */
  productionMinutes: number;
  /** Today's day, in the order it happened: one segment per run of minutes on the same thing.
   *  Emptied every morning (CLAUDE.md T11 3.1). */
  dayLog: DayLogEntry[];
}

export interface UnitState {
  areaM2: number;
  widthCells: number;
  depthCells: number;
  rentMonthly: number;
  ratesMonthly: number;
  benchSlots: number;
  /** One month of rent the landlord holds. Returned on a move, which is parked. */
  depositHeld: number;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  tier: WorkerTier | null;
  /** Fraction of the owner's speed. 0 for non-production roles. */
  rate: number;
  weeklyWage: number;
  monthlyWage: number;
  startDay: number;
  jobId: string | null;
  taskId: string | null;
  /** Minutes of his own day spent so far. Office roles have 480 of them (CLAUDE.md T2 3.8). */
  minutesWorked: number;
  /** Minutes past 17:00 he has stood in the hall today, and since the last wages went out: the
   *  first says when he has had his two hours, the second is what Friday pays him for
   *  (CLAUDE.md T8 3.6). */
  overtimeMinutes: number;
  overtimeMinutesWeek: number;
  /** Working days in a row with any overtime in them, and the flag three of them set. A tired
   *  man may hand his notice in at the month end (CLAUDE.md T8 3.6). */
  overtimeDays: number;
  tiredOfOvertime: boolean;
  /** Per job material orders this clerk has put through today. */
  ordersToday: number;
  /** Where he is standing: bench, machine:<specId>, rack, gate, office or idle. */
  station: string;
  /** Minutes of production worked, which drives the bench and machine cycle. */
  productionMinutes: number;
  absentDaysRemaining: number;
  anchorX: number;
  anchorY: number;
  /** Day or night. Everybody is on the day shift until a production manager puts him on the
   *  second one (CLAUDE.md T13 3.9). */
  shift: Shift;
  /** His own day, in the order it happened, for a man who has a day meter of his own: the
   *  production manager's shows the assigning the owner no longer does (CLAUDE.md T13 3.9). */
  dayLog: DayLogEntry[];
}

export interface HiringOption {
  role: WorkerRole;
  tier: WorkerTier | null;
  label: string;
  rate: number;
  weeklyWage: number;
  monthlyWage: number;
  minReputation: number;
  available: boolean;
  blockReason: string;
  /** What must be bought before this hire is possible, named and counted for the card. */
  missing: string[];
  missingCost: number;
}

export interface Enquiry {
  id: string;
  templateId: string;
  name: string;
  sizeMultiplier: number;
  /** What the client pays. An express job carries the 20% uplift here and nowhere else. */
  price: number;
  /** The price the material and the labour are worked out from: no express uplift. */
  basePrice: number;
  finish: Finish;
  materialKind: MaterialKind;
  deadlineDays: number;
  express: boolean;
  bespokeMaterial: boolean;
  needsMeasure: boolean;
  createdDay: number;
  /** Last day the enquiry is on the board. */
  expiresOnDay: number;
  lockReason: string | null;
  byHandAvailable: boolean;
  /** Residential or commercial (CLAUDE.md T13 3.15). */
  kind: EnquiryKind;
  /** What the client says he has to spend: the figure the board shows. What he actually offers
   *  when the job is taken is the budget times a factor drawn inside the band, and that becomes
   *  the job's price (CLAUDE.md T13 3.24). */
  budget: number;
  /** The client's answer, once the player has said yes and the number has been drawn: null until
   *  then. Kept on the enquiry so a replay draws the same number (CLAUDE.md T13 3.24). */
  offer: number | null;
  /** True for an enquiry the company cannot take at all: it is on the board, greyed, so the
   *  player can see what the workshop is not equipped or not known enough for, and it can never
   *  be accepted (PIOTR, 13.09; CLAUDE.md T10 3.7). */
  unreachable: boolean;
  /** Why, in plain words: "no timber machines", "needs a spray booth", "too few people for the
   *  deadline", "reputation too low (needs 20)". Empty on an enquiry that can be taken. */
  blockReason: string;
  /** Where the tile's reason takes the player: the catalogue, the team, or nowhere. */
  blockWhere: '' | 'catalogue' | 'team';
}

export type JobStage =
  | 'accepted'
  | 'materialPending'
  | 'materialOrdered'
  | 'materialInYard'
  | 'ready'
  | 'inProduction'
  | 'awaitingTransport'
  | 'completed';

export interface Job {
  id: string;
  templateId: string;
  name: string;
  price: number;
  /** The price the material and the labour were worked out from: no express uplift. */
  basePrice: number;
  sizeMultiplier: number;
  finish: Finish;
  materialKind: MaterialKind;
  materialCost: number;
  sheets: number;
  /** Whole sheets already taken off the rack for this job. */
  sheetsUsed: number;
  /** Sheets on the rack held for this job and not yet cut: a job that is accepted reserves its
   *  sheets from the free stock at once, and what it could not reserve is its shortfall, red on
   *  the card until Restock or an order for this job clears it (CLAUDE.md T13 3.3, 3.6). */
  sheetsReserved: number;
  /** Residential or commercial, as the enquiry was (CLAUDE.md T13 3.15). */
  kind: EnquiryKind;
  /** What the client said he had to spend. The price is what he offered (CLAUDE.md T13 3.24). */
  budget: number;
  /** Minutes of production put into this piece on the second shift, at night: the client sees
   *  it in the finish, a tier down (CLAUDE.md T13 3.9). */
  nightMinutes: number;
  /** The machining is done on the spindle moulder (CLAUDE.md T13 3.13). */
  needsSpindle: boolean;
  /** Why the job is standing still, in plain English. Empty while nothing is in its way. */
  blockedBy: string;
  bespokeMaterial: boolean;
  express: boolean;
  byHand: boolean;
  /** With a CNC in the hall, this job goes on the saw when the CNC is taken. Off means it waits
   *  for the CNC instead (CLAUDE.md T7 3.4). */
  sawFallback: boolean;
  needsMeasure: boolean;
  /** 0.40 P of the price: the labour the job carries. */
  labourValue: number;
  /** Labour still to do. Machine reductions and the by hand penalty act on the minutes it takes
   *  to work this off, not on the figure itself (CLAUDE.md 9.5). */
  labourRemaining: number;
  acceptedDay: number;
  dueDay: number;
  stage: JobStage;
  /** Day the piece was finished and stood at the gate. */
  finishedDay: number | null;
  /** Transport is booked and the piece leaves on this day. Null while nothing is booked. */
  deliverOnDay: number | null;
  /** The calls the client makes about this job, in the diary (CLAUDE.md T4 3.3). */
  calls: ClientCall[];
  /** Calls nobody picked up. The first is free, every one after it costs. */
  callsMissed: number;
  designMinutesRemaining: number;
  assignedTo: string | null;
  /** What was worked when, one entry per run at a stage, for the Work Plan (CLAUDE.md T7 3.2). */
  stageRuns: StageRun[];
  completedDay: number | null;
  daysLate: number;
  depositPaid: number;
  balancePaid: number;
  penalty: number;
  /** Emails still unanswered when the client took delivery. */
  emailsUnanswered: number;
  /** True once a minute of this job's Finishing was sprayed on wet air: the client sees the
   *  defects in it and takes a point off (CLAUDE.md T10 3.3). */
  wetFinish: boolean;
  /** Minutes of production somebody has actually put into this piece, and how many of them the
   *  hall was under extracted for. A job delivered out of a dusty workshop loses a point of
   *  rating (CLAUDE.md T10 3.1). */
  productionMinutes: number;
  dustyMinutes: number;
  rating: number | null;
  overdueWarned: boolean;
}

/** One call from the client: when he rings, and what happened when he did. */
export interface ClientCall {
  /** Absolute day he rings on. */
  day: number;
  /** Minute of the working day he rings at. */
  minute: number;
  state: 'waiting' | 'taken' | 'missed';
  /** The second attempt after a missed call. The same call trying again, not a call of its own. */
  retry: boolean;
}

/** One item the player has dragged, and the tile it stood on before he started. An item put back
 *  exactly where it was is taken off this list: it was never moved (CLAUDE.md T4 3.5). */
export interface MovedItem {
  itemId: string;
  fromX: number;
  fromY: number;
  /** Which way it was standing before the player picked it up. Turning a heavy machine where it
   *  stands is a move like any other; turning a bench costs nothing (CLAUDE.md T11 3.9). */
  fromRotated: boolean;
}

export interface Delivery {
  id: string;
  jobId: string | null;
  sheets: number;
  /** The day it was ordered and what it cost, so the shopping list can draw the wait and say
   *  what was paid (CLAUDE.md T8 3.2). */
  orderedDay: number;
  pricePaid: number;
  arriveDay: number;
  arrived: boolean;
  unloaded: boolean;
  bespoke: boolean;
  /** Sheets that did not fit in the rack and still need a decision. */
  overflowSheets: number;
}

export type TaskKind =
  | 'emails'
  /** The meeting at the client's that a job over 20,000 starts with (CLAUDE.md T7 3.11). */
  | 'clientMeeting'
  | 'bookkeeping'
  | 'dailyOrdering'
  | 'staffManagement'
  | 'clientCall'
  | 'design'
  /** Reading the drawing and counting the sheets for one accepted job: the owner's until an
   *  estimator is taken on (CLAUDE.md T13 3.8). It was the per job material order. */
  | 'materialTakeOff'
  | 'siteMeasure'
  /** The weekly minutes the company website costs whoever keeps it (CLAUDE.md T13 3.7). */
  | 'websiteUpkeep'
  | 'unload'
  /** Emptying the bags on the extractor, all of them at once (CLAUDE.md T12 2.3). */
  | 'emptyBags'
  | 'cleaning'
  | 'fetchStorage'
  | 'deliver'
  | 'service'
  | 'repair'
  | 'moveMachines'
  /** The interview that taking somebody on costs the owner. Ordering a machine costs him
   *  nothing; taking a man on is still an hour of his day (CLAUDE.md T9 3.1). */
  | 'hiring'
  /** The laptop booting up before the player can touch anything on it. */
  | 'booting';

/** What an interview will do once its hour is spent. Equipment and software are booked at the
 *  click and ride on nothing (CLAUDE.md T9 3.1). */
export type TaskOrder = { kind: 'hire'; role: WorkerRole; tier: WorkerTier | null };

export interface TaskInstance {
  id: string;
  kind: TaskKind;
  category: TaskCategory;
  label: string;
  minutesTotal: number;
  minutesRemaining: number;
  jobId: string | null;
  equipmentId: string | null;
  deliveryId: string | null;
  /** The kit on the lorry this unloading is for, empty for a load of sheets. One van is one
   *  unloading, however many machines are on it (CLAUDE.md T9 3.1). */
  orderIds: string[];
  /** Day the task belongs to. Daily tasks are created fresh each working day. */
  day: number;
  done: boolean;
  /** Day it was finished. Null while it is still open. */
  doneDay: number | null;
  /** Worker id, 'owner', or null while nobody works on it. */
  doneBy: string | null;
  /** What this task books when it finishes. Empty for every task but an interview
   *  (CLAUDE.md T9 3.1). */
  orders: TaskOrder[];
}

export type GameEventKind =
  /** Noon: take the hour or work through it (CLAUDE.md T6 3.4). */
  | 'breakTime'
  /** 17:00: home, or two more hours. */
  | 'goingHome'
  | 'deliveryArrived'
  | 'stockOverflow'
  /** The hall's bags are full: nothing that makes dust runs until they are emptied (T12 2.3). */
  | 'bagsFull'
  | 'machineBroken'
  | 'serviceDue'
  | 'noMaterial'
  | 'lowStock'
  | 'accident'
  | 'dayEnd'
  /** Leaving setup mode with heavy machines moved: it is two hours and a ducting bill, so it is
   *  asked about before it is booked (CLAUDE.md T8 3.4). */
  | 'moveConfirm'
  /** The buyer's van came for a machine that was sold (CLAUDE.md T8 3.5). */
  | 'machineCollected'
  | 'weekend'
  | 'wagesPaid'
  | 'monthlyBills'
  | 'arrearsWarning'
  | 'arrearsFinalWarning'
  | 'bailiff'
  | 'bankruptcy'
  | 'ownerSick'
  | 'jobOverdue'
  | 'lateAccounts'
  | 'jobAtGate'
  | 'jobPaid'
  | 'clientCall'
  /** A worker who has had enough of the evenings has handed his notice in (CLAUDE.md T8 3.6). */
  | 'workerQuit'
  /** The client answers the accepted enquiry with a number: take it or leave it
   *  (CLAUDE.md T13 3.24). */
  | 'clientOffer'
  /** The first working day of the month, before the board: the month's report (T13 3.20). */
  | 'monthEnd'
  /** The workshop was broken into overnight (CLAUDE.md T13 3.17). */
  | 'burglary'
  /** A standing contract's term is over: the closing report and the renegotiation
   *  (CLAUDE.md T13 3.16). */
  | 'contractEnded'
  /** An accident with no liability cover: the claim lands (CLAUDE.md T13 3.15). */
  | 'insuranceClaim';

export interface GameEventChoice {
  id: string;
  label: string;
}

export type JsonValue = string | number | boolean | null;

export interface GameEvent {
  id: string;
  kind: GameEventKind;
  title: string;
  body: string;
  choices: GameEventChoice[];
  data: Record<string, JsonValue>;
  day: number;
  minute: number;
}

export type LedgerCategory =
  | 'rent'
  | 'rates'
  | 'power'
  /** The owner's daily draw, which was the living cost (CLAUDE.md T13 3.18). */
  | 'ownerDraw'
  | 'wages'
  /** The second shift's hours, at the night rate, kept apart from the day's (T13 3.9, 3.20). */
  | 'wagesNight'
  | 'salaries'
  | 'software'
  | 'waste'
  | 'equipment'
  | 'material'
  | 'unitDeposit'
  | 'jobDeposit'
  | 'jobBalance'
  | 'interest'
  | 'repair'
  | 'storage'
  | 'taxi'
  | 'transport'
  | 'accounts'
  | 'pellets'
  | 'arrears'
  | 'seizure'
  /** The Turn 13 lines: every one of them its own line on the month end (CLAUDE.md T13 3.20). */
  | 'insurance'
  | 'security'
  | 'loan'
  | 'loanInterest'
  | 'overdraftInterest'
  | 'contract'
  | 'website'
  | 'pipes'
  | 'claim'
  | 'burglary';

export interface LedgerEntry {
  id: string;
  day: number;
  minute: number;
  category: LedgerCategory;
  label: string;
  /** Positive is money in, negative is money out. */
  amount: number;
  balance: number;
  /** True when no cash moved: a cost that became arrears, or a credit applied against them. */
  unpaid: boolean;
}

export interface PeriodTotals {
  income: number;
  costs: number;
  byCategory: Record<string, number>;
}

export interface BookedTotals {
  day: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
}

/** One loan at a time: sixty monthly instalments at Piotr's rate, interest on the balance charged
 *  with each one (CLAUDE.md T13 3.14). */
export interface LoanState {
  principal: number;
  balance: number;
  /** The capital part of one instalment: the principal over the months. */
  monthlyInstalment: number;
  monthsLeft: number;
  interestPaid: number;
  startDay: number;
}

export interface FinanceState {
  overdraftLimit: number;
  loan: LoanState | null;
  /** Overdraft interest accrued day by day below zero and not yet charged: it goes out on the
   *  1st, interest only (CLAUDE.md T13 3.14). */
  overdraftInterestAccrued: number;
  arrearsAmount: number;
  arrearsMonths: number;
  firstArrearsDay: number | null;
  day: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
  /** What the books said the last time somebody wrote them up. */
  booked: BookedTotals;
}

export interface StockState {
  sheets: number;
  /** Sheets sitting in paid temporary storage, fetched next morning. */
  tempStorageSheets: number;
}

/** The covers held and what the property cover is written on (CLAUDE.md T13 3.15). */
export interface InsuranceState {
  property: boolean;
  liability: boolean;
  /** What the property cover is insuring: every machine and the stock, recomputed on every
   *  purchase and every stock change. */
  insuredValue: number;
  /** Payouts still coming in, a slice a day (CLAUDE.md T13 3.17). */
  payouts: InsurancePayout[];
}

export interface InsurancePayout {
  label: string;
  perDay: number;
  daysLeft: number;
}

/** Five levels, from nothing to a firm that takes the risk to zero (CLAUDE.md T13 3.17). */
export interface SecurityState {
  level: number;
  lastBurglaryDay: number | null;
}

/** Five levels of company website (CLAUDE.md T13 3.7). */
export interface WebsiteState {
  level: number;
  /** The last day the upkeep was put on the desk, so it lands once a week. */
  lastUpkeepDay: number | null;
}

/** The eight thresholds the owner pays himself at (CLAUDE.md T13 3.18). */
export interface OwnerDrawState {
  /** Index into the tiers table. */
  tier: number;
}

export type ContractStatus = 'offered' | 'active' | 'ended';

/** One week of a standing contract: what was wanted and what was made (CLAUDE.md T13 3.16). */
export interface ContractWeek {
  week: number;
  wanted: number;
  made: number;
}

/** Repeat work at low margin: a piece, so many a week, for a term, at a price a piece
 *  (CLAUDE.md T13 3.16). */
export interface Contract {
  id: string;
  name: string;
  /** The piece, off the contract pieces table. */
  pieceId: string;
  quantityPerWeek: number;
  termWeeks: number;
  pricePerPiece: number;
  status: ContractStatus;
  offeredDay: number;
  /** Last day the offer stands on the board. */
  expiresOnDay: number;
  startDay: number | null;
  endDay: number | null;
  /** The people on it. Only people are assigned; the machines stay in the general queue. */
  assigned: string[];
  /** The week in hand. */
  weekStartDay: number | null;
  piecesThisWeek: number;
  /** Labour put into the piece in hand, in owner minutes, so a piece is made minute by minute. */
  pieceMinutes: number;
  weeks: ContractWeek[];
  /** Totals for the closing report. */
  piecesMade: number;
  revenue: number;
  materialCost: number;
  labourMinutes: number;
  /** The price the client offers at the end of the term, from the delivery history. Null until
   *  the term ends. */
  renegotiatedPrice: number | null;
}

/** One tile of pipe over the floor. It occupies no cell and blocks nothing under it
 *  (CLAUDE.md T13 3.19). */
export type PipeTileKey =
  | 'pipe.ns'
  | 'pipe.ew'
  | 'pipe.ne'
  | 'pipe.nw'
  | 'pipe.se'
  | 'pipe.sw'
  | 'pipe.tee'
  | 'pipe.drop'
  | 'pipe.inlet';

export interface PipeTile {
  x: number;
  y: number;
  key: PipeTileKey;
}

/** One run of pipe from a machine to an extractor, or to a branch of an existing run
 *  (CLAUDE.md T13 3.19). */
export interface PipeRun {
  id: string;
  equipmentId: string;
  extractorId: string;
  tiles: PipeTile[];
  metres: number;
}

/** What the player can switch (CLAUDE.md T13 3.22). Tips and nothing else tonight. */
export interface SettingsState {
  tips: boolean;
}

/** The first use bubbles already dismissed (CLAUDE.md T13 3.22). */
export interface TipsState {
  seen: string[];
}

/** The second shift, on or off (CLAUDE.md T13 3.9). */
export interface ShiftState {
  second: boolean;
}

/** Why a production minute the workshop could have worked was not worked (CLAUDE.md T13 3.5). */
export type LostMinuteCause = 'noPeople' | 'noMachine' | 'noMaterial' | 'ownerAway';

/** The day's production minutes: what could have been worked with every hired person at a
 *  station, what was, and where the rest went (CLAUDE.md T13 3.5). */
export interface EfficiencyStats {
  possible: number;
  worked: number;
  lost: Record<LostMinuteCause, number>;
}

export interface SoftwareState {
  mode: SoftwareMode;
  tier: SoftwareTier;
  /** Jobs left on a one-off licence. */
  jobsRemaining: number;
  /** Joinery Core on the laptop: the estimator does ten take offs a day instead of five, and five
   *  more per extension, at most two (CLAUDE.md T13 3.8). */
  joineryCore: boolean;
  joineryCoreExtensions: number;
}

/** What the end of day summary says, kept per day so the Days tab can open a past one and get
 *  the same component the evening did (CLAUDE.md T6 3.9). Plain JSON, like everything in the
 *  state. */
export interface DaySummary {
  day: number;
  title: string;
  minutesByCategory: Record<TaskCategory, number>;
  minutesWorked: number;
  minutesAvailable: number;
  overtimeMinutes: number;
  /** What tomorrow starts at, 1 when nothing is owed. */
  tomorrowFactor: number;
  breakSkipped: boolean;
  /** The money column and the heading it carries, as the cadence had it that evening. */
  spanLabel: string;
  income: number;
  costs: number;
  cash: number;
  jobsAdvanced: number;
  jobsCompleted: string[];
  dustAtStart: number;
  dustAtEnd: number;
  deliveriesTomorrow: number[];
  /** Labour value produced and the people minutes that produced it (CLAUDE.md T6 3.8). */
  labourValue: number;
  workMinutes: number;
  /** The owner's day as it happened, for the plate at the top of the summary (T11 3.1). */
  dayLog: DayLogEntry[];
  /** Cubic metres of sawdust the hall made that day (CLAUDE.md T12 3.4). */
  dustMadeM3: number;
  /** The day's efficiency, as the top bar showed it (CLAUDE.md T13 3.5). */
  efficiency: EfficiencyStats;
  /** Minutes of production the second shift put in after the day (CLAUDE.md T13 3.9). */
  nightMinutes: number;
}

export interface DayStats {
  jobsAdvanced: string[];
  jobsCompleted: string[];
  /** The dust reading the day opened with, for the end of day summary. */
  dustAtStart: number;
  /** The empty rack is reported once a day and no more. */
  noMaterialWarned: boolean;
  /** Labour value produced today, and the people minutes that went into it: the two halves of
   *  the earned labour rate (CLAUDE.md T6 3.8). */
  labourValue: number;
  workMinutes: number;
  /** Cubic metres of sawdust the hall made today, bags or no bags (CLAUDE.md T12 3.4). */
  dustM3: number;
  /** The production minutes the workshop could have worked, did work, and lost, by cause
   *  (CLAUDE.md T13 3.5). */
  efficiency: EfficiencyStats;
  /** Minutes of production the second shift put in after the day (CLAUDE.md T13 3.9). */
  nightMinutes: number;
}

/** One line of the reputation log: the day, what happened, and what it was worth. The company
 *  board is this list, week by week (PIOTR, 13.09; CLAUDE.md T9 3.10). */
export interface ReputationEntry {
  day: number;
  reason: string;
  points: number;
}

export interface GameOver {
  reason: string;
  day: number;
}

export interface GameState {
  version: number;
  seed: number;
  /** Cursor of the seeded RNG. The only source of randomness in the engine. */
  rng: number;
  nextId: number;
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
  /** The optional real life notes under decisions are on. */
  showWhy: boolean;
  clock: Clock;
  speed: Speed;
  cash: number;
  reputation: number;
  /** Every point of reputation the company has gained or lost, with the day and the reason
   *  (CLAUDE.md T9 3.10). */
  reputationLog: ReputationEntry[];
  /** The last few days of the owner's day log, newest last, for the week on the company board
   *  (CLAUDE.md T11 3.1). */
  dayLogs: DayLog[];
  dust: number;
  /** Cubic metres of sawdust in the hall's bags. One store for the hall, however many fans are
   *  on the duct run, fed by every machine somebody stands at (CLAUDE.md T12 2.3). */
  bagFillM3: number;
  unit: UnitState;
  owner: OwnerState;
  software: SoftwareState;
  /** The day the laptop was last booted: it is up for the rest of that day (PIOTR, 13.09). */
  laptopBootedOnDay: number | null;
  stock: StockState;
  equipment: Equipment[];
  /** Bought, paid for, and still on its way (CLAUDE.md T8 3.2). */
  onOrder: OnOrderItem[];
  workers: Worker[];
  enquiries: Enquiry[];
  jobs: Job[];
  tasks: TaskInstance[];
  deliveries: Delivery[];
  finance: FinanceState;
  insurance: InsuranceState;
  security: SecurityState;
  website: WebsiteState;
  /** Standing contracts, offered, active and ended (CLAUDE.md T13 3.16). */
  contracts: Contract[];
  ownerDraw: OwnerDrawState;
  /** Every pipe run over the floor, one per connected machine (CLAUDE.md T13 3.19). */
  pipes: PipeRun[];
  /** The ids of the machines with an automatic blast gate on their drop (CLAUDE.md T13 3.11). */
  gates: string[];
  settings: SettingsState;
  tips: TipsState;
  shift: ShiftState;
  /** The month whose report has been put in front of the player, so it is shown once
   *  (CLAUDE.md T13 3.20). */
  monthEndShownFor: number;
  ledger: LedgerEntry[];
  eventQueue: GameEvent[];
  activeEvent: GameEvent | null;
  dayStats: DayStats;
  /** The last few months of end of day summaries, newest last (CLAUDE.md T6 3.9). */
  days: DaySummary[];
  /** Day the last express enquiry reached the board. One a week is the cap. */
  lastExpressDay: number | null;
  /** Day the last low stock warning went out. One a week is the cap. */
  lastLowStockDay: number | null;
  /** Last day the bookkeeping was done. 0 means it never has been. */
  booksUpToDay: number;
  /** Consecutive months the books were behind on the 1st. */
  lateAccountsMonths: number;
  /** The month the notices were last read. Nobody hands his notice in twice for one month, and a
   *  month that opens on a weekend still has its 1st (CLAUDE.md T8 3.6). */
  lastQuitMonth: number;
  /** Production minutes since the 1st, for pellet sales. */
  productionMinutesMonth: number;
  /** Kit the player has dragged about and not yet paid for in time and ducting (T4 3.5). */
  movedItems: MovedItem[];
  /** The task the player asked the clock to be run through at 4x, and the speed to give him back
   *  when it is over. Null while he is driving the clock himself (CLAUDE.md T8 3.3). */
  skipTaskId: string | null;
  speedBeforeSkip: Speed | null;
  /** How often the end of day summary is put in front of the player (CLAUDE.md T4 3.6). */
  summaryCadence: SummaryCadence;
  gameOver: GameOver | null;
}

export type GameAction =
  | { type: 'SET_SPEED'; speed: Speed }
  /** Run the clock at 4x until the task the owner is out on is over (CLAUDE.md T8 3.3). */
  | { type: 'SKIP_AHEAD' }
  | { type: 'BUY_EQUIPMENT'; specId: string; variantId?: string }
  | { type: 'BUY_SOFTWARE'; mode: 'oneOff' | 'subscription' }
  /** Calls an order off before the lorry, in full (CLAUDE.md T8 3.5). */
  | { type: 'CANCEL_ORDER'; orderId: string }
  /** Sells a machine standing in the hall. The buyer comes in the morning (CLAUDE.md T8 3.5). */
  | { type: 'SELL_MACHINE'; equipmentId: string }
  /** Says yes to the enquiry: the client answers with a number, and the job is taken when the
   *  number is (CLAUDE.md T13 3.24). */
  | { type: 'ACCEPT_ENQUIRY'; enquiryId: string; byHand: boolean }
  | { type: 'START_TASK'; taskId: string }
  | { type: 'PAUSE_TASK' }
  /** Lifting the lid: the machine has to come up before anything on it can be touched. */
  | { type: 'BOOT_LAPTOP' }
  /** Buys a job's shortfall at the ad hoc price, for that job (CLAUDE.md T13 3.3). */
  | { type: 'ORDER_FOR_JOB'; jobId: string }
  /** Brings every low stock line back up to the restock figure (CLAUDE.md T13 3.2). */
  | { type: 'RESTOCK' }
  /** Gives the client his deposit back and takes the job off the plan (CLAUDE.md T9 3.9). */
  | { type: 'DROP_JOB'; jobId: string }
  | { type: 'SET_SAW_FALLBACK'; jobId: string; on: boolean }
  | { type: 'BUY_STOCK'; sheets: number }
  | { type: 'PAY_ARREARS'; amount: number | null }
  | { type: 'ORDER_TRANSPORT'; jobId: string }
  | { type: 'MOVE_ITEM'; itemId: string; x: number; y: number; rotated?: boolean }
  | { type: 'END_SETUP'; speed: Speed }
  | { type: 'SET_SUMMARY_CADENCE'; cadence: SummaryCadence }
  | { type: 'SET_SHOW_WHY'; on: boolean }
  | { type: 'WORK_HERE'; jobId: string | null }
  | { type: 'ASSIGN_JOB'; jobId: string; workerId: string | null }
  /** Puts a machine, or an air dryer, on one of the compressors in the hall (CLAUDE.md T10 3.2). */
  | { type: 'ASSIGN_AIR'; equipmentId: string; compressorId: string | null }
  | { type: 'HIRE'; role: WorkerRole; tier: WorkerTier | null }
  | { type: 'ASK_UNLOAD'; deliveryId: string }
  /** Asks again who empties the bags, from the extractor on the floor (CLAUDE.md T12 2.3). */
  | { type: 'ASK_EMPTY_BAGS' }
  | { type: 'START_CLEANING' }
  | { type: 'REPAIR_MACHINE'; equipmentId: string }
  | { type: 'SERVICE_MACHINE'; equipmentId: string }
  | { type: 'RESOLVE_EVENT'; choiceId: string }
  | { type: 'END_DAY' }
  | { type: 'SKIP_DAY' }
  // Turn 13 (CLAUDE.md T13 section 3). Money and paper:
  | { type: 'TAKE_LOAN'; amount: number }
  | { type: 'REPAY_LOAN'; amount: number | null }
  | { type: 'SET_INSURANCE'; cover: 'property' | 'liability'; on: boolean }
  | { type: 'ACCEPT_CONTRACT'; contractId: string }
  | { type: 'DECLINE_CONTRACT'; contractId: string }
  | { type: 'ASSIGN_CONTRACT'; contractId: string; workerId: string; on: boolean }
  | { type: 'RENEW_CONTRACT'; contractId: string; accept: boolean }
  // People and shifts:
  | { type: 'SET_SECOND_SHIFT'; on: boolean }
  | { type: 'ASSIGN_SHIFT'; workerId: string; shift: Shift }
  | { type: 'TAKE_HOLIDAY'; days: number }
  | { type: 'SET_OWNER_DRAW'; tier: number }
  | { type: 'BUY_JOINERY_CORE' }
  | { type: 'BUY_JOINERY_CORE_EXTENSION' }
  // Orders and stock:
  | { type: 'SET_WEBSITE_LEVEL'; level: number }
  // Machines and the hall:
  | { type: 'CONNECT_EXTRACTION'; equipmentId: string }
  | { type: 'BUY_GATE'; equipmentId: string }
  | { type: 'SET_SECURITY_LEVEL'; level: number }
  // Chrome and guidance:
  | { type: 'SET_TIPS'; on: boolean }
  | { type: 'DISMISS_TIP'; key: string };
