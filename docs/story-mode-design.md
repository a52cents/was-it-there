# WAS IT THERE?

## Story Mode Design Bible — Version 0.1

**Status:** approved direction, kitchen epilogue implemented
**Scope:** first complete story slice across the first five built rooms
**Modes:** `STORY` and `ESCAPE` remain separate  
**Default game language:** English, with content structured for later localization

---

## 1. Purpose

Story Mode turns the house into an active antagonist without replacing the
observation game at the center of **Was It There?**

The player still studies a room, survives a blackout, and reports what changed.
The additional systems give those actions a narrative meaning:

- the house rebuilds its memories incorrectly;
- the player uses observation to resist those false memories;
- mistakes increase the house's control over the current room;
- failure restarts the night at 03:04;
- knowledge survives even when the physical house resets.

The first story slice ends after the kitchen. It must feel like a complete first
chapter while leaving the final resolution for the future ten-room route.

---

## 2. Design pillars

### 2.1 Memory remains the main mechanic

Narrative events support observation. They must not turn the game into combat,
an inventory adventure, or a sequence of cutscenes.

### 2.2 The house is the antagonist

No pursuing monster or character AI is required. Lighting, sound, doors,
furniture, reflections, clocks, and communication devices make the building
feel aware of the player.

### 2.3 Failure teaches the player

A failed loop should reveal a rule, reinforce a clue, or suggest a different
interaction. It must not be only a loss of progress.

### 2.4 The house plays fairly

The player must always be able to distinguish a reportable anomaly from a
narrative effect. Horror may create doubt, but the reporting rules remain
reliable.

### 2.5 Short events, lasting consequences

Individual story beats should usually last between two and six seconds. Their
meaning can persist in the notebook and affect later rooms or endings.

### 2.6 No gore is required

Failure can be unsettling without graphic violence. Pressure, loss of control,
spatial distortion, and implied presence are the preferred tools.

---

## 3. Separation between modes

### Story

Menu promise:

> **STORY**  
> Break the loop. Remember who lived here.

Story Mode includes:

- the 03:04 loop;
- deterministic narrative events;
- interactive story objects;
- persistent discoveries and fragments;
- physical reactions to correct and incorrect reports;
- chapter outcomes and, eventually, multiple endings.

### Escape

Menu promise:

> **ESCAPE**  
> Find the changes. Race to the exit.

Escape Mode retains:

- the existing random run seed;
- time and error scoring;
- the current room order and anomaly rules;
- the direct Game Over and victory flow;
- platform score submission.

Escape is locked on a fresh save. Completing the currently available Story
chapter unlocks it permanently for that browser profile. The mode selection
screen clearly displays the lock condition before completion.

Story systems must be inactive in Escape Mode. Adding Story Mode must not alter
Escape timing, anomaly selection, scoring, or room restoration.

---

## 4. Premise

Every night, the house attempts to reconstruct the people who once lived
inside it. The reconstruction begins at 03:04, but parts of each memory are
wrong.

The player wakes in the bedroom without being told whether they are a former
resident, an intruder, or another reconstruction. A voice on the radio warns
that the house is forgetting someone. The only way forward is to identify the
details that do not belong.

The first chapter establishes four facts:

1. Someone has been removed from the family memory.
2. The house changes more than furniture; it changes evidence.
3. The night has happened before.
4. The house may be rebuilding the player as a replacement.

The story should suggest these ideas through rooms and interactions before
stating them directly.

---

## 5. Story loop

One loop follows this sequence:

1. The screen displays `03:04`.
2. The player wakes in the bedroom.
3. Previously discovered notebook entries remain available.
4. Each room follows observation, blackout, anomaly search, then its Story
   objective during completion.
5. Scripted events occur at stable points in the room timeline.
6. During full black, the player returns to the room entry position.
7. Search therefore begins from a stable, fair reference point.
8. Correct and incorrect reports make the house react.
9. The office revelation leads into the kitchen epilogue.
10. Crossing the kitchen exit completes the first chapter.
11. A third error triggers a room-specific failure sequence.
12. The physical route resets to the bedroom.
13. The loop counter and narrative discoveries persist.

For the five-room slice, a complete successful loop should remain short enough
that restarting from the bedroom is meaningful rather than exhausting.

When the route grows to ten rooms, the restart cost must be playtested again.
Fast-forwarding mastered introductory beats may be added, but automatic room
checkpoints are not part of the first implementation.

---

## 6. Time rules

`03:04` is a diegetic anchor, not the device's wall-clock time.

Story events use monotonic gameplay time and obey these rules:

- pausing freezes event timelines;
- losing pointer lock cannot skip an event;
- a hidden browser tab cannot advance the story;
- room transition cancels events belonging to the previous room;
- restarting a loop cancels every transient effect;
- repeated runs produce the same authored event order;
- random anomaly selection remains deterministic from the run seed.

The authored story schedule remains stable between loops. Anomalies may change
between loops so that narrative knowledge helps without turning a retry into a
memorized answer sheet.

---

## 7. Fairness contract

This contract has priority over atmosphere.

### During observation

A neutral reticle remains visible for orientation, but no object can be
examined, answered, activated, or otherwise interacted with. Observation is
reserved for movement and memorizing the room.

A narrative event may animate or add an element if it returns to a stable state
before the anomaly baseline is finalized. Audio-only reactions may continue as
long as every meaningful clue also has a visual subtitle or indicator.

Objects with authored rotation variants may receive a seeded initial tilt or
rotation before observation. When they do, the anomaly pool exposes a dedicated
return to their canonical orientation. This baseline remains deterministic for
the run seed.

Every registered anomaly target is present during Story observation. Story
therefore never generates an appearance (`show`) anomaly: after blackout, a
present object may disappear, rotate (including returning to its canonical
orientation), or change color. Escape keeps its variable-presence baseline.

### During blackout

Only the anomaly system may change reportable target state. Story effects may
change ambience, overlays, or non-reportable helper objects.

### During search

A story event must never move, recolor, hide, reveal, rotate, or rescale a
reportable target. Story interactions remain disabled until every anomaly has
been reported.

### After room completion

Story interactions unlock only now. A room with a required Story objective
keeps its exit locked until that interaction is completed; a room without one
opens normally. The room may perform stronger narrative transformations
because reporting has ended. These effects must still be restored before the
room is reused.

### Interaction feedback

The reticle must use distinct labels:

- `EXAMINE` for a story interaction;
- `REPORT` for an anomaly report;
- no prompt when the object cannot currently be used.

---

## 8. Narrative event model

Events are authored as data and executed by a `StoryDirector`. Room classes
expose stable bindings; they do not contain story progression logic.

Conceptual event definition:

```ts
interface StoryEventDefinition {
  readonly id: string;
  readonly roomId: string;
  readonly trigger: StoryTrigger;
  readonly conditions?: StoryConditionSet;
  readonly effects: readonly StoryEffectDefinition[];
  readonly discoveryId?: string;
  readonly repeat: 'once-ever' | 'once-per-loop' | 'every-match';
}
```

Supported triggers for the first slice:

- loop started;
- room entered;
- observation started;
- elapsed observation time;
- story object examined;
- correct report;
- run error recorded;
- room completed;
- loop failed;
- chapter completed.

Supported conditions:

- active mode is Story;
- minimum or maximum loop number;
- discovery present or absent;
- fragment present or absent;
- current pressure level;
- another event occurred in the same loop;
- optional story choice value.

Supported effects:

- show a subtitle;
- play or stop a story audio cue;
- apply a story lighting preset;
- show or hide a non-reportable helper object;
- animate a bound story object without changing its reportable state;
- add a discovery or memory fragment;
- set a story condition flag;
- start a short camera-independent screen effect;
- request a room-specific failure presentation.

Event definitions must reference registered effect identifiers. Arbitrary code
callbacks must not be embedded in content data.

---

## 9. Story state and persistence

### Current loop state

Transient state includes:

- current loop number;
- active room;
- house pressure from zero to three;
- events triggered in the current loop;
- discoveries made in the current loop;
- temporary choices;
- active event timeline and effects.

Transient state resets when the night restarts.

### Persistent story progress

Persistent state includes:

- total loop count;
- discovered event identifiers;
- collected memory fragments;
- unlocked notebook entries;
- completed chapter outcomes;
- discovered endings;
- persistent story choices explicitly marked as permanent.

The first implementation should isolate this data behind a repository and use
the versioned key `was-it-there.story.v1`. Missing, invalid, or corrupted data
must fall back to a clean save without preventing the game from starting.

The player must be able to erase Story progress without deleting Escape records
or settings.

No personal information is stored.

Implementation note: the repository accepts the original Escape-only V1 save
and migrates it to the complete V1 structure on the next write. Story progress
can be erased from the notebook while preserving the Escape unlock.

---

## 10. The notebook

The notebook is a record of knowledge, not an inventory.

It contains:

- discovered rules of the house;
- short descriptions of important events;
- memory fragments;
- chapter outcomes and endings;
- the number of completed or failed loops.

Entries should be brief and useful. An entry may remind the player that the
corridor phone predicts a later event, but it must not list the answer to a
random visual anomaly.

The notebook is accessible from the menu or a dedicated pause panel. Opening it
pauses Story time. The first slice does not require a visible book model,
page-turning animation, freeform notes, or collectible inventory UI.

The implemented notebook is available from mode selection and the pause panel.
Its entries unlock from durable event, fragment, and chapter-outcome ids, so the
same knowledge is restored after a reload without duplicating content state.

---

## 11. House pressure and feedback

House pressure mirrors the existing three-error limit.

### Pressure 0 — Observed

- normal room lighting and ambience;
- correct reports produce a short warm light response;
- no persistent distortion.

### Pressure 1 — Noticed

- a subtle reduction in practical light;
- a low structural sound;
- a short subtitle only if needed for accessibility;
- no change to reportable objects.

### Pressure 2 — Watched

- colder light and a stronger room tone;
- one non-reportable detail subtly faces or follows the player;
- a brief peripheral or environmental motion;
- no forced camera movement.

### Pressure 3 — Taken

- input stops;
- a room-specific failure sequence plays for at most four seconds;
- the screen resolves to `03:04`;
- the next loop begins from the bedroom.

Timeout and incorrect-report errors share the same pressure scale but may use
different audio and subtitle feedback.

Story Game Over does not name, outline, or turn the camera toward the missed
anomaly. Escape keeps the direct reveal for practice and score improvement. A
future adaptive hint for repeatedly blocked Story players remains a separate,
explicit feature.

Correct reports never reduce the recorded error count. They may temporarily
calm the presentation so the player receives satisfying physical feedback.

---

## 12. Interaction rules

Story interactions are available only in Story Mode after every anomaly in the
room has been found. This is a global rule for existing and future rooms:
observation and anomaly search never accept Story interaction input.

For the first slice, interactions are fixed to the room. The player does not
carry a general-purpose inventory.

An interaction can:

- examine a photo;
- answer a telephone;
- activate or tune a radio;
- study a mirror overlay;
- inspect a clock;
- replay a notebook-safe clue after it has already been discovered.

The same physical prop may still be an anomaly target. Story interaction must
not change its anomaly snapshot, and search mode always gives reporting
priority.

A single carried `memory object` may be explored after the five-room slice is
validated. It is not required for the first chapter implementation.

---

## 13. First chapter content

### 13.1 Bedroom — The empty place

Purpose:

- introduce 03:04;
- establish the radio and family photo as story objects;
- teach that story interactions are separate from reports.

Authored beats:

1. Loop opening displays `03:04`.
2. A short radio burst begins during observation.
3. After the anomaly search, the room objective asks for the family photo.
4. Examining it reveals that its composition leaves an unnatural gap and lets
   the radio finish its message.
5. In Story, the exit remains locked until the family photo has been examined
   during the current loop.

Provisional English copy:

> The house forgot someone.

> There were four of us.

Core fragment:

`memory-empty-place` — A family photograph was composed for one more person.

Failure presentation:

- the radio searches rapidly through empty frequencies;
- practical lights extinguish toward the player;
- the final radio click cuts to 03:04.

No new external asset is required. A simple non-reportable clock display may be
created from existing UI or primitive geometry if the physical room needs it.
Like every reportable Story prop, the low bookcase, radio, and family photo are
all present during observation. The radio and family photo cannot receive a
disappearance anomaly in Story, so their narrative clues remain readable after
the blackout; their color anomalies remain available. Escape keeps the full
anomaly catalogue.

### 13.2 Bathroom — The warning

Purpose:

- show that the house can write over reflections;
- introduce a clue that only becomes safe to reveal after reporting ends.

Authored beats:

1. Observation displays `MEMORIZE THE ROOM` and accepts no interaction.
2. Once every anomaly is found, the mirror becomes the required examination;
   interacting with it displays its
   warning as a subtitle without changing the mirror visually.
3. The bathtub, vanity, toothbrush cup, rubber duck, candle, and folded towels
   expose optional strange descriptions and connected easter eggs.
4. Water and pipe sounds build during observation.
5. The mirror remains mechanically unchanged during search.
6. No fog, writing, texture, or helper mesh appears on the mirror.
7. The warning is delivered only when the player examines it.

Provisional English copy:

> It remembers you differently.

Core fragment:

`memory-mirror-warning` — The reflection warned that memory can replace a
person, not only an object.

Failure presentation:

- condensation rapidly covers the view without a face or jumpscare;
- water audio cuts to silence;
- 03:04 appears through the fog.

The mirror warning is subtitle-only and never modifies the anomaly target or
adds a helper mesh. The separate third-error presentation can still use its
full-screen condensation effect. The exit stays locked until the mirror has
been examined, while every optional bathroom examination remains available
only during room completion.

### 13.3 Corridor — The prediction

Purpose:

- make the house feel active in real time;
- reward an optional interaction with information about the office;
- confirm that the loop follows a stable sequence.

Authored beats:

1. The wall clock visibly establishes 03:04 as part of the normal baseline.
2. The telephone rings during observation.
3. After the anomaly search, answering it optionally plays a short, subtitled
   prediction; the corridor has no required Story objective.
4. The predicted sound or phrase occurs later in the office.

Provisional English copy:

> When the radio stops, do not answer your name.

Core fragment:

`memory-phone-prediction` — The caller knew what would happen in the next room.

Failure presentation:

- every ring moves closer through spatial audio while the phone remains still;
- the final ring comes from behind the player;
- the screen cuts to 03:04 without showing a creature.

The telephone and clock remain valid anomaly targets. Ringing them cannot
change transform, visibility, color, scale, or anomaly material state.

Implementation note: Story guarantees every corridor target, including the
telephone and clock, is present in the observation baseline while leaving its
post-blackout anomaly variants available. The clock carries a static
non-interactive `03:04` display. Answering the optional call persists both its
memory fragment and a choice flag for the office payoff; ignoring it never
blocks progression.

### 13.4 Office — The erased name

Purpose:

- pay off the corridor prediction;
- connect the missing family member to the player;
- reveal why the house erased the player before the kitchen confirms it.

Authored beats:

1. The office radio repeats the frequency pattern from the bedroom.
2. If the corridor call was answered, the predicted silence occurs.
3. After the anomaly search, examining the required desk photo reveals an
   erased name.
4. Room completion opens the route into the kitchen.

Provisional English copy:

> It did not forget your name. It removed it.

Core fragment:

`memory-erased-name` — The missing name matches the identity the house is trying
to give the player.

Failure presentation:

- the radio addresses the player with an incomplete or distorted name;
- office lights isolate the desk photo;
- the image darkens and resolves to 03:04.

The first implementation should reuse the existing office radio, phone, clock,
and photo bindings. A document may be represented by a lightweight
non-reportable plane if necessary.

### 13.5 Kitchen — Breakfast in reverse

Purpose:

- confirm the office revelation through an ordinary family ritual;
- make the room feel predictive rather than simply haunted;
- close the first slice with a distinct domestic memory.

Authored beats:

1. The microwave and toaster play the end of breakfast before anyone sits down.
2. A chair is heard scraping while every visible object remains still.
3. Appliances contain optional evidence dated tomorrow.
4. After the anomaly search, counting the places reveals three served meals
   and a fourth place removed before service.
5. Room completion resolves the chapter according to collected fragments.

The breakfast table cannot disappear in Story because it carries the required
counting interaction. Its other anomaly types follow the kitchen catalogue.

Provisional English copy:

> They kept setting my place after the house removed me.

Supporting fragment:

`memory-kitchen-fourth-place` — The family continued preparing a place for the
erased resident. This reinforces the four core memories without changing the
first-chapter outcome requirement.

Failure presentation:

- every appliance answers at once;
- the service ticket changes the fourth place from removed to accepted;
- the house begins to “prepare” the player as the missing course.

---

## 14. Chapter outcomes and full endings

### First chapter outcomes

The kitchen exit currently ends the built Story route. Story Mode replaces the normal
victory copy with one of two chapter outcomes:

#### `CHAPTER ESCAPED`

Condition:

- kitchen completed;
- fewer than four core fragments discovered.

Meaning:

The player escaped the reconstructed section but does not understand the loop.

#### `CHAPTER REMEMBERED`

Condition:

- kitchen completed;
- all four core fragments discovered.

Meaning:

The player understands that their identity is connected to the erased resident.

Both outcomes unlock a replay option and remain recorded in the notebook.

### Full-route endings

The ending framework must eventually support:

#### `ESCAPE`

Complete the hall and choose to leave without restoring every core memory.

#### `REMEMBER`

Discover all required core memories and choose to restore the erased identity
before leaving.

#### `REPLACED`

Reach the final hall with enough knowledge to recognize the house's offer, then
deliberately accept the false identity it presents.

`REPLACED` must be the result of a readable player choice, not a punishment for
ordinary errors or a hidden numerical threshold.

The final ending scenes are out of scope until the main hall exists.

---

## 15. Presentation and accessibility

- Every spoken or radio line has a subtitle.
- Subtitle duration is based on text length and can be extended later through
  settings.
- No required clue is communicated only through audio.
- No required clue is communicated only through color.
- Failure sequences avoid forced head rotation and sudden full-volume sounds.
- Flashing effects remain within the future reduced-flashing setting.
- Story overlays cannot obscure the report reticle during search.
- Narrative text uses localization keys rather than being scattered through
  room classes.
- English is the first authored locale; the data model must permit French
  strings without changing event logic.

---

## 16. Technical ownership

Expected system boundaries:

- `GameApp` composes systems and forwards game events.
- `GameStateMachine` remains the authority for global phase transitions.
- `StoryDirector` evaluates story triggers and conditions.
- `StoryProgress` owns transient and persistent narrative state.
- `StorySaveRepository` validates and stores versioned progress.
- `HousePressureSystem` owns error-driven presentation state.
- `NarrativeOverlay` owns subtitles and short story messages.
- `StoryNotebookScreen` renders discoveries and outcomes.
- room story bindings expose stable scene objects and reversible effects.
- `RoomAnomalySystem` remains the sole owner of reportable anomaly mutations.

The initial integration should add the minimum new global states. A dedicated
`failure-sequence` state is justified because player input, timing, audio, and
transition behavior must be explicit during the final error reaction.

---

## 17. First-slice exclusions

Do not add during the five-room story slice:

- combat;
- enemy or family character AI;
- a pursuing monster;
- graphic gore;
- a general inventory grid;
- item-combination puzzles;
- dialogue trees;
- voiced localization;
- branching room construction;
- fully animated cutscenes;
- new paid or attribution-heavy asset packs;
- the complete ten-room ending scenes;
- changes to Escape scoring or anomaly balance.

---

## 18. Validation criteria

The first Story chapter is acceptable when:

- Story and Escape can be selected independently;
- Escape remains locked until the first Story chapter is completed;
- the Escape unlock survives a page reload;
- Escape behaves identically to its pre-Story version;
- each built room contains one clear authored narrative beat;
- all four core fragments can be discovered in one loop;
- missing an optional interaction does not block room progression;
- the third error produces a short reversible failure sequence;
- a failed Story loop restarts in the bedroom at 03:04;
- notebook discoveries survive reload and loop reset;
- anomaly generation remains deterministic;
- every blackout returns the player to the active room spawn while fully dark;
- no story effect creates a false reportable change;
- every transient room effect is restored on restart and transition;
- pause, pointer-lock loss, and hidden tabs cannot advance events;
- all essential audio information is subtitled;
- both first-chapter outcomes are reachable;
- typecheck, lint, unit tests, and standalone build pass.

---

## 19. Implementation order

After approval of this document, implementation proceeds in this order:

1. mode selection and mode-aware run identity;
2. data model and tests for story events;
3. Story Director lifecycle and pause behavior;
4. House Pressure reactions and failure state;
5. bedroom vertical slice;
6. persistent Story progress and notebook;
7. bathroom content;
8. corridor content;
9. office content and chapter outcomes;
10. accessibility, restoration audit, and final validation.

No later step should begin while the preceding slice has known progression,
restoration, or ambiguity bugs.
