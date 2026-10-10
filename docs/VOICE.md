# Talking to the plan (voice)

Layout (AI) mode opens voice first: a conversation about the space. The screen holds the plan and the conversation, nothing else.
The app bar, the editor header, the panel, the zoom buttons, the walking person, the ghost of the original and the area text are all hidden.
The owner talks and points. The page measures the plan after every change and offers one thing at a time, out loud and in the conversation.
Drafting comes back only as a last resort, when the assistant could not make a change.

## The conversation panel

On a computer it is a column on the right; on a phone (or a window narrower than 760 px) it is a sheet at the bottom. The plan fits beside or above it.

- **Header**: the unit, Save once something has changed (opens the review), and close (asks first when there are unsaved changes).
- **Conversation**: what you said on the right, the answers on the left, the last 30 turns.
- **Microphone**: one tap starts a conversation. It listens, answers out loud, and listens again by itself; it stops listening while it
  speaks or works, so it never hears itself. Tap while it speaks to interrupt. Tap while it listens to pause. Saying "pause", "that's all"
  or "stop listening" ends it, and so does 90 seconds of silence. If the conversation was on, the next unit opens listening
  (`pad.voice.conv`). Uses the browser's speech recognition (Chrome, Edge, Safari). Where there is none (Firefox), a text box opens instead.
- **State line** beside the microphone: Listening (and what is being heard), Working on it, or Speaking.
- **Keyboard**: type instead of talking.
- **Speaker**: mute the voice. The captions still show. Remembered on that device (`pad.voice.mute`).
- **The tools**: saying "show the tools" brings back the header, panel and modes; the menu button on the small bar then hides them again.
  Remembered on that device (`pad.voice`).
- **Chips**: the commands that used to be buttons, offered for what is on screen: Yes and Not now for a suggestion; Back, Next, Use this one and Cancel
  while flipping kitchens; otherwise Make it wider, Kitchen layouts, Is there enough room?, Undo, Review changes, Suggest a variation.
  A chip does exactly what saying its words does.

Spoken commands for the sheet: "save" or "I'm done" (review), "close" or "discard" (asks again when there are unsaved changes), "undo".

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
- **"How wide is the hall?"**, "show the bath width as a dimension line", or point and "how wide is this": clear width and length,
  wall face to wall face (room separations count), through the middle of the room's largest open rectangle. Both are drawn on the plan
  (red when under 860 mm) until a wall moves, and read out with the area.
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
When the assistant changes nothing or fails, the voice says so, asks for it another way, and offers **Draw it myself**, which opens Drafting.
Tapping Layout (AI) there brings the conversation back.

## Code

Search `voice: talk to the plan` in `index.html`: `vNarrow`, `vOpenBath`, `vKitchen`, `vIssues`, `vHeard` (the phrase routing), `vWiden`,
`vMoveHere`, `vKitOpts`, `vKitStart`, `vAsk`, `vSVG` (red dimensions and the kitchen drawn over the plan), `vBar`, `vListen`, `vSay`.
`kTemplate(P, kind, all, want)` returns every arrangement with `all`, or the one on the walls `want`.
The smoke test covers the voice in its own section by calling `__pad.vHeard` with the words; it cannot test a real microphone.
