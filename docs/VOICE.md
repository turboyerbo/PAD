# Talking to the plan (voice)

Layout (AI) mode opens voice first: a conversation about the space. The screen holds the plan and the conversation, nothing else.
The app bar, the editor header, the panel, the zoom buttons, the walking person, the ghost of the original and the area text are all hidden.
The owner talks and points. The page measures the plan after every change and offers one thing at a time, out loud and in the conversation.
Drafting comes back only as a last resort, when the assistant could not make a change.

## One view, modes by voice

In voice first, a unit opens on one view that shows everything, the way Drafting does, plus the furniture: walls, doors, windows,
furniture, dimensions, room names, areas and sizes. No room colours. Walls, doors and furniture can be dragged (the editor's `all` mode).
The mode buttons are gone; modes change by voice:

- **"Layout mode"** (or "change the layout", "move the rooms"): the room colours appear and rooms can be dragged. Furniture is hidden
  because it is placed afresh when the layout settles.
- **"Drafting mode"**: walls and doors only, furniture hidden. **"Furniture mode"**: furniture only.
- **"Normal view"** (or "done with the layout"): back to the one view. Leaving layout mode places the furniture again (`edFinalize`).

Any change the assistant makes to the layout, and Suggest a variation, switch to layout mode while they run, so the colours show that the
layout is being changed, then go back to the view you were in (`vLayoutDo`). A kitchen chosen in the one view is put in at once.

## What is flagged

Only two things, and only once each: **a room missing a wall** (a bath, bedroom, closet, laundry or mechanical room sharing its space with
another room; open plans such as kitchen, living, dining, den and hall may share) and **a room nobody can get into** (no door, so the walking
route cannot reach it). Room sizes and clear widths are the owner's call: the voice does not flag them, and the review before saving does not
warn about them (`SIZEMSG`, and the `room` type from `guAudit` is left out). Asked directly ("how wide is the hall", "is there enough room"),
the voice still measures and answers.

## Sketchpad: when words are not enough

When the assistant could not make a change, the voice offers **Sketch it** (and Draw it myself). "Let me sketch it" or "let me show you" opens it
at any time. A clear sheet lies over the plan (`#vSketch`); draw in red with a finger or the mouse, up to 12 strokes, and talk while drawing:
what is said while the sheet is out is kept as the request ("a wall along here with a door in the middle"). If nothing is said, the request that
failed is used. "Send" sends it; "undo" takes back the last stroke; "clear" wipes the sheet; "cancel" puts it away.

The assistant gets three things (`vSketchSend`, `vCtx`, and `sketch` in `revise.mjs`):
- the words;
- the strokes in plan metres, simplified to within 60 mm, each marked `line`, `loop` (ends meet) or `path`;
- a picture of the plan (`vSketchImage`): walls, room separations dashed, room names and a labelled 1 m grid, with the sketch in red, as a JPEG.
  It goes with the first request only; the repair rounds keep the strokes.

**Read on the page first** (`vSketchRead`), with no assistant, so sketching works even where the assistant is off:
- **A door**: a straight stroke along a wall or across an opening, with an arrow or a hook to one side (`vSketchDoor`, `vDoorAt`). The door goes
  on that wall at the stroke, 820 mm or what fits, opening to the arrow's side. In an opening, a wall is drawn across it first, in line with the
  wall beside it. A door already there is redrawn the way it was sketched. The line drawn is tried first, then the room edges within 500 mm,
  keeping the one that leaves no space without its room. A second traced wall on the same line is opened too, and a room separation beside the
  new wall goes. If the door opens into a space cut off from its room by a separation, that separation goes.
- **A room moved**: a loop round a room (or a stroke starting in it) and an arrow to another room (`vSketchMove`, `roomMove`). The room's name goes
  where the arrow ends (the main room there, not a closet inside it). The room there gives way: the old space joins the room it is open to (the
  separations round it go), or, behind walls, takes the other name. "Swap" swaps them. The furniture is placed again.
- **A table**: small loops in the room, or words about a table and chairs, put a dining table with chairs there (`vTableAt`): the largest that fits
  (1600 by 900 with six chairs, 1200 by 800 with four, or a round table with four), nearest the spot drawn. It stays when the furniture is placed again
  (`P.pref` {yes}).
- Each is one change on the sheet; undo takes it back. Anything else goes to the assistant as below.

The function tells Claude how to read a sketch: a straight stroke is usually a wall, a short stroke across a wall a door, a loop an area, a stroke
from one place to another a move. The sketch is a note to the assistant and never becomes plan geometry.

## Everywhere: the whole app by voice

With voice first on, the voice runs the whole app, not only the editor (`vaOn`, `vaHeard`, `vaBar`). Every view hides its buttons:
the landing card, the building list, the app bar, the keyplan, the scroll arrows, the unit search, the footer, the phone menus and the team chat.
What is left is the logo, the building's units and the conversation (a column on the right on a computer, a sheet under the units on a phone).

- **The first screen** says "Hello, let's start designing some layouts." Browsers only let a page speak or listen after a first touch, so a tap
  anywhere starts the conversation; there is no button to find. If the person already touched the page (signing in, say), it starts on its own.
  Signing in still needs the form where there are accounts; once signed in, the voice takes over. Without accounts, the tap signs in as a guest.
- **Buildings**: it lists them by name and asks which to open. Say a name ("open Ninth Line"), "start a new building called Block B"
  (or just "new building", and it asks the name), "my buildings", "go home", "sign out".
- **Units**: "add a one bedroom" (studio, one, two or three bedroom), then yes opens it; "open PAD-03", "open unit three", "the first one",
  "the last one"; "what is in this building". Opening a unit hands over to the editor's conversation; closing it comes back and asks which unit next.
  The conversation and its log carry on through all of it.
- **The strip still scrolls**: the red arrows and the small keyplan stay on screen beside the conversation, so you can walk the building and
  see where you are. (The voice panel's class once also fixed the page body in place, which stretched it to the strip's width so nothing
  scrolled; the rule now applies to the panel only.)
- **Show the buttons** brings the classic app back. The editor's voice bar menu turns voice first on again.
- Without speech recognition (Firefox) the panel has a text box.

## The conversation panel

On a computer it is a column on the right; on a phone (or a window narrower than 760 px) it is a sheet at the bottom. The plan fits beside or above it.

- **Header**: the unit, Save once something has changed (opens the review), and close (asks first when there are unsaved changes).
- **Conversation**: what you said on the right, the answers on the left, the last 30 turns.
- **Microphone**: one tap starts a conversation. It listens, answers out loud, and listens again by itself; it stops listening while it
  speaks or works, so it never hears itself. Tap while it speaks to interrupt. Tap while it listens to pause. Saying "pause", "that's all"
  or "stop listening" ends it, and so does 90 seconds of silence. If the conversation was on, the next unit opens listening
  (`pad.voice.conv`). Uses the browser's speech recognition (Chrome, Edge, Safari). Where there is none (Firefox), a text box opens instead.
- **State line** beside the microphone: Listening (and what is being heard), Working on it, or Speaking.
- **State box** (`vStat`): a small pill over the plan, at the top and centred on the plan, shows Speaking (bars moving), Thinking (dots) or
  Listening (a ring). While it listens it turns see-through with a halftone of dots, and fainter still while words are coming in. Hidden when idle.
  With reduced motion it does not animate.
- **Patience** (`vPatience`, `vHold`): one turn can run across pauses. The browser's recogniser stops at a pause; a new one carries on the same
  turn, and the turn ends only after a silence long enough to mean the thought is finished: about a second after a one-word answer (yes, undo,
  send), 2.6 seconds after a sentence (3.2 when it is long), and 4.2 seconds when the words trail off (and, so, the, um, to...).
- **Typing**: a text box is always under the microphone, on every view; Enter or Send sends it, the same as saying it. What is being typed survives the panel redrawing (`vKeepIn`).
- **Pictures**: in a unit, the clip button (or pasting an image) attaches a photo, a scan, a sketch on paper or a screenshot (`vAttach`).
  It is made smaller on the page (at most 1400 px, a JPEG under about 650 KB), shows as a thumbnail, and goes to the assistant with the next
  message (`attach` in `revise.mjs`, the first request only). A message sent with a picture goes straight to the assistant.
- **Sketch**: the pencil button opens the sketchpad at any time, the same as saying let me sketch it.
- **Speaker**: mute the voice. The captions still show. Remembered on that device (`pad.voice.mute`).
- **The tools**: saying "show the tools" brings back the header, panel and modes; the menu button on the small bar then hides them again.
  Remembered on that device (`pad.voice`).
- **Chips**: the commands that used to be buttons, offered for what is on screen: Yes and Not now for a suggestion; Back, Next, Use this one and Cancel
  while flipping kitchens; otherwise Make it wider, Kitchen layouts, Is there enough room?, Undo, Review changes, Suggest a variation.
  A chip does exactly what saying its words does.

Spoken commands for the sheet: "save" or "I'm done" (review), "close" or "discard" (asks again when there are unsaved changes), "undo",
"delete this unit" (asks once; yes deletes it and the conversation goes back to the building).

## Pointing

Tap the plan to mark "here". A blue cross shows the spot for 30 seconds. Room dragging still works as before.
"Move the wall here" with no spot marked asks you to point, and the move happens on the tap.

## What the voice checked before (kept for reference; see What is flagged)

In this order, one at a time. "Not now" skips that one for the session; "stop suggesting that" skips the kind.

1. **A bath open to another room**: its walls do not close it off (doorways count as closed, room separations do not).
   "The bath is open to the bedroom. Do you want me to add a wall with a door?" Yes sends that request to the assistant.
2. **No kitchen**, or a kitchen with no counters and no layout chosen. Yes starts the kitchen layouts.
3. **A room nobody can walk to** (the walking person's route). Yes asks the assistant for a door.
4. **A clear width under 860 mm**: two parallel wall faces with nothing between them, in a room people walk through
   (closets, baths, laundry and mechanical rooms are left out). Every one is drawn on the plan as a red dimension in millimetres.
   "This hall is 780 mm wide. That is under 860 mm, so it might be too narrow. Do you want to revise this area?"

## What runs on the page (no assistant needed)

- **"Make it wider"** (or yes to a narrow spot): tries moving each of the two walls away from the other, from just enough to reach 900 mm
  up to 400 mm more, on a copy. It keeps the smallest move that adds no new problem and never makes another spot tighter. If every move
  would, it says so and asks you to point.
- **"Move the wall here"**: the interior wall nearest the spot (the flagged wall wins a close call) moves so its centre lands on the spot,
  then it reports the narrowest clear width left.
- **"How wide is the hall?"**, "show the bath width as a dimension line", or point and "how wide is this": clear width and length,
  wall face to wall face (room separations count), through the middle of the room's largest open rectangle. Both are drawn on the plan
  (red when under 860 mm) until a wall moves, and read out with the area.
- **"Is there enough room?"**: the narrowest spot under 860 mm, any room that cannot be reached, then the first suggestion.
- **Kitchen layouts**: every arrangement of the U, L and galley templates that fits the kitchen, scored by counter length and how close the
  sink is to a bath (shared plumbing), best first, at most six. The best one is drawn in at once; the voice describes it and asks whether
  to show the others. Next and Back flip, "option three" jumps, "yours" goes back to the pick. "Use this one" keeps it (`P.pref = [{kit, w}]`,
  `w` being the walls the runs sit on), and it is drawn that way when the layout is furnished on saving. Choosing another than the pick is said back.
- **Furniture** (`vEditHeard`): "get rid of the sofa", "remove this" while pointing, "move the sofa here", "turn the bed". The piece is the one
  of that kind nearest the spot pointed at, or the only one. A piece taken out stays out when the furniture is placed again: the plan keeps
  `{no: kind, n: room}` in `P.pref`, and `rmFurnish` leaves it out of that room. Toilets and sinks can go too; the owner decides.
- **Taking out a room**: "get rid of one of the bathrooms", "lose the den" (`roomMerge`). The room is opened into its neighbour: the walls between
  them come down with the doors in them, its fixtures go, and the neighbour takes the space. Nothing else moves. The neighbour is the room it is
  entered from, else the one it shares the longest wall with (a main room before a closet). With several rooms of that name, the one pointed at,
  else the smallest. The only bath stays unless the owner says "anyway". The assistant has the same step (`remove_room`), and `remove_item` for furniture.
- **Undo, review, a variation, mute, show or hide the tools.**

Each wall move or kitchen choice counts as a change on the sheet, the same as any other edit. There is no limit on changes.

## What goes to the assistant

Anything else ("add a balcony there", "make the bedroom bigger") goes through the same path as a typed request (docs/PROMPTS.md),
with two extra fields: `point` (the spot tapped in the last 30 seconds, in metres, and the nearest wall id) and `context`
(the suggestion on screen, such as the narrow spot). The function adds both to the message. The answer is read back.
Without the assistant switched on, the voice says which things it can still do.
When the assistant changes nothing or fails, the voice says so, asks for it another way, and offers **Draw it myself**, which opens Drafting.
Tapping Layout (AI) there brings the conversation back.

## Code

Search `voice: talk to the plan` in `index.html`: `vNarrow`, `vOpenBath`, `vKitchen`, `vIssues`, `vHeard` (the phrase routing), `vWiden`,
`vMoveHere`, `vKitOpts`, `vKitStart`, `vAsk`, `vSVG` (red dimensions and the kitchen drawn over the plan), `vBar`, `vListen`, `vSay`.
`kTemplate(P, kind, all, want)` returns every arrangement with `all`, or the one on the walls `want`.
The smoke test covers the voice in its own section by calling `__pad.vHeard` with the words; it cannot test a real microphone.
