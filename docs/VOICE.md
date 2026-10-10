# Talking to the plan (voice)

Layout (AI) mode opens voice first. The plan fills the screen, a bar at the bottom listens and answers, and the tools are put away.
The owner talks and points. The page measures the plan after every change and offers one thing at a time, out loud and as a caption.

## The bar

- **Microphone**: tap, speak, and it stops by itself when you stop talking. Uses the browser's speech recognition (Chrome, Edge, Safari).
  Where there is none (Firefox), the bar opens a text box instead.
- **Caption**: what was heard while listening, then the answer.
- **Keyboard**: type instead of talking.
- **Speaker**: mute the voice. The captions still show. Remembered on that device (`pad.voice.mute`).
- **Menu**: brings back the panel, the mode buttons, Undo and Start over. Press it again to hide them. Remembered on that device (`pad.voice`).
- **Chips**: the commands that used to be buttons, offered for what is on screen: Yes and Not now for a suggestion; Back, Next, Use this one and Cancel
  while flipping kitchens; otherwise Make it wider, Kitchen layouts, Is there enough room?, Undo, Review changes, Suggest a variation.
  A chip does exactly what saying its words does.

Header in voice first: Details, Discard, Review changes and the change count. Furniture and Drafting are behind the menu.

## Pointing

Tap the plan to mark "here". A blue cross shows the spot for 30 seconds. Room dragging still works as before.
"Move the wall here" with no spot marked asks you to point, and the move happens on the tap.

## What the voice checks (after each change settles)

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
- **"Is there enough room?"**: the narrowest spot under 860 mm, any room that cannot be reached, then the first suggestion.
- **Kitchen layouts**: every arrangement of the U, L and galley templates that fits the kitchen, scored by counter length and how close the
  sink is to a bath (shared plumbing), best first, at most six. The best one is drawn in at once; the voice describes it and asks whether
  to show the others. Next and Back flip, "option three" jumps, "yours" goes back to the pick. "Use this one" keeps it (`P.pref = [{kit, w}]`,
  `w` being the walls the runs sit on), and it is drawn that way when the layout is furnished on saving. Choosing another than the pick is said back.
- **Undo, review, a variation, mute, show or hide the tools.**

Each wall move or kitchen choice is one of the five changes on the sheet, the same as any other edit.

## What goes to the assistant

Anything else ("add a balcony there", "make the bedroom bigger") goes through the same path as a typed request (docs/PROMPTS.md),
with two extra fields: `point` (the spot tapped in the last 30 seconds, in metres, and the nearest wall id) and `context`
(the suggestion on screen, such as the narrow spot). The function adds both to the message. The answer is read back.
Without the assistant switched on, the voice says which things it can still do.

## Code

Search `voice: talk to the plan` in `index.html`: `vNarrow`, `vOpenBath`, `vKitchen`, `vIssues`, `vHeard` (the phrase routing), `vWiden`,
`vMoveHere`, `vKitOpts`, `vKitStart`, `vAsk`, `vSVG` (red dimensions and the kitchen drawn over the plan), `vBar`, `vListen`, `vSay`.
`kTemplate(P, kind, all, want)` returns every arrangement with `all`, or the one on the walls `want`.
The smoke test covers the voice in its own section by calling `__pad.vHeard` with the words; it cannot test a real microphone.
