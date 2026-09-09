# where else ai goes in watchlr

Companion to `DESIGN.md`. Every idea below is checked against what the repo
can already answer — the models in `models/`, the TMDB surface in `lib/tmdb.ts`,
and the Groq client in `lib/ai.ts`. Anything needing data you don't have is
marked so.

## what already ships

| feature | file | shape |
|---|---|---|
| 7 summary flavors per title | `lib/ai.ts` → `generateSummary`, `generateVerdict` | one-shot, cached per title+flavor |
| per-title chat | `streamTitleChat` | streaming, spoiler-gated |
| daily picks + reshuffle | `generatePicks` → `AIPick` | JSON, resolved against TMDB, 24h cache |
| vibe search | `generateVibeSearch` | one-shot NL → titles |
| taste roast | `generateTasteRoast` | one-shot prose from real logs |
| what-tonight triage | `generateTriage` | mood → shelf picks + fresh ideas |

The pattern is solid: strict JSON, resolve against TMDB, cache in Mongo, tag
with `MODEL_TAG` so prompt changes invalidate. Everything below reuses it.

---

## the five to build first

Ranked by (value to a real user) ÷ (work, given what's already here).

### 1. spoiler-bounded chat — "ask me anything up to where i am"

The chat currently *warns* before spoilers and hopes. But you already know
exactly where the user is: `WatchHistory` carries per-episode rows, and
`ContinueWatching` reconstructs a resume point from them.

Feed that position into the system prompt as a hard boundary — "the user has
seen through S2E4; anything after that does not exist to you" — and the whole
feature changes character. It stops being a chatbot with a disclaimer and
becomes the only place on the internet you can safely ask "wait, who was that
guy again?" mid-season.

Small change to `streamTitleChat`, large change to what the feature is worth.

### 2. "previously on" — a recap from your exact stopping point

You have the two facts nobody else has: **which episode they stopped on** and
**how long ago**. `WatchHistory.watchedAt` gives you the gap.

> you left *Severance* seven months ago, four episodes into season one.
> here's what you actually need to remember.

Length scales with the gap — three weeks gets two sentences, eight months gets
three paragraphs. Rendered above the resume button in `ContinueWatching`. This
is the single biggest unmet need in TV tracking and the repo is already sitting
on the data.

Cache key: `userId + tmdbId + lastEpisode`, so it regenerates only when they
move.

### 3. the watchlist archaeologist

Everyone's want-to-watch shelf is a graveyard. `Watchlist` rows carry
timestamps, so the AI can audit the pile and say the quiet part:

> these fourteen have been sitting here since 2023. you are not going to watch
> eleven of them. keep these three — here's why. clear the rest?

One bulk-remove button. It reuses `generateTriage`'s shape exactly (score the
pile, return indices + reasons), so it's largely a new prompt against an
existing pipeline. Fits the voice perfectly and makes the library feel
maintained rather than accusing.

### 4. watch-party — the taste intersection

Public profiles at `/[username]` already exist, which means two taste profiles
are two fetches away. Take two usernames, build both profiles the way
`AIPicks` does, and ask for five titles that thread the needle — plus one line
on the compromise each one represents.

> *the thing* — you get the body horror, they get the paranoia. nobody has to
> pretend to like a musical.

This is the one people screenshot. It's also nearly free: the profile loader,
the pick resolver, and the rail renderer all exist.

### 5. stream the prose summaries

Not a feature — a feel change. `AIPanel` waits for the entire completion before
rendering anything, so a 700-token summary is a dead panel for several seconds.
`streamTitleChat` already proves the streaming path works end to end.

Stream `generateSummary` the same way and the panel starts writing in ~400ms
instead of finishing in ~4s. Same tokens, same cost, completely different
product. Cache the finished text on stream close, exactly as now.

Pairs directly with the new `ThinkingBubble` — the bubble covers the first
beat, then prose starts landing under it.

---

## by surface

### detail page

- **"who is that guy?"** — TMDB gives you credits; you also know everything
  they've watched. So the answer isn't a Wikipedia stub, it's *"you know him
  from* The Bear*, which you rated a 9"*. Personal, and nobody else can do it.
- **content warnings, generated** — does the dog die, is there a jumpscare
  around 41 minutes, how graphic does it get. An entire website exists for
  this question. One cached call per title, rendered as sticker chips you can
  opt into seeing.
- **"which episodes can i skip"** — filler detection per season, for the
  20-episode-order shows. Renders straight into `Seasons` as a muted marker.
- **rate my prediction** — before you watch, type your guess at the twist. When
  you log it complete, the AI grades you out of 10 and shows its working. Pure
  play, dead cheap, extremely on-brand.
- **argument mode** — you rated it a 3; the AI takes the other side and tries
  to change your mind in one paragraph. A button on the rating widget.

### home & discovery

- **vibe search as a conversation** — the biggest upgrade to an existing
  feature. Right now it's one shot. Return results *plus* four AI-generated
  refinement chips (`more unhinged`, `less sad`, `under 100 mins`,
  `nothing from the 80s`), each of which re-queries with the previous turn in
  context. Turns a lucky guess into a search you can steer.
- **the calibration game** — for cold-start users you currently show an
  `EmptyState` asking them to go log something. Instead: two posters, "which
  one tonight?", ten rounds. You end up with real preference signal and they
  end up entertained. Fills the emptiest state in the app.
- **time-aware picks** — friday 11pm and sunday 2pm are different people, and
  `watchedAt` already knows which one is currently logged in. Same
  `generatePicks` call, one extra line of context, noticeably better picks.
- **seasonal rails** — "october, but only as scary as you actually tolerate,"
  calibrated from what you've dropped.

### library

- **auto-collections** — the AI reads your shelves and proposes named
  collections with one-click create: *comfort rewatches*, *things you started
  at 1am*, *the prestige pile you're avoiding*. `Collection` already supports
  everything needed.
- **drop-risk predictor** — you're three episodes into four shows. Based on
  where you've bailed before, here's the one you'll finish and the two you
  won't. Want them off the shelf?
- **written nudges** — `Notification` exists but the copy is templated. Let the
  AI write each one against the specific title and the specific gap. A
  notification that knows *why* you stopped is a notification people open.

### dashboard

- **watchlr wrapped** — the obvious one, and you have every ingredient:
  `DashboardView`'s totals, the genre breakdown, the heatmap, and
  `lib/shareCard.ts` for the export. AI narrates it as an awards ceremony —
  best supporting rewatch, the show you lied about finishing, most suspicious
  three-hour gap. Annual, shareable, the reason people come back in december.
- **blind spot detector** — names the genre, decade, or country you
  systematically avoid, then prescribes exactly one entry-point title at the
  right difficulty. Recommenders are good at more-of-the-same and bad at this.
- **rating calibration** — compare your scores against TMDB's `voteAverage`
  and narrate the delta: *"your 7 is everyone else's 8.4. you are a harsh
  grader on comedy and a complete pushover for sci-fi."* Pure arithmetic plus
  one paragraph of prose.
- **taste drift** — this quarter against last year, narrated. *"you've gotten
  softer."*

### reviews & profiles

- **review ghostwriter** — the blank textarea is why `Review` is your emptiest
  collection. Tap three sticker chips (*loved the score*, *third act fell
  apart*, *would rewatch*) and the AI drafts a review **in your voice**,
  learned from the reviews you've already written. You edit before posting.
  Ship it explicitly as a draft, never auto-post.
- **profile tagline** — one line generated from your shelves, for the top of
  `/[username]`. Cheap, funny, regenerable.
- **compatibility score** — when a signed-in user opens someone else's
  profile, one line on how your tastes overlap. Feeds the watch-party feature.

### search

- **screenshot search** — upload a still or a poster, a vision model names it.
  Groq serves vision models, so this is one route and one upload widget. The
  most "how did it do that" feature on the list.
- **quote search** — *"the one where he says 'i drink your milkshake'"*. The
  existing vibe pipeline handles this today if you widen the prompt; it just
  isn't advertised.

---

## structural bets

Bigger swings that change what the app is rather than adding a panel.

### an agent over your own data

One chat box, tool-calling against your own collections:
`library.query`, `history.query`, `ratings.query`, `tmdb.search`,
`watchlist.add`.

> what did i watch last october?
> add everything villeneuve directed that i haven't seen
> which show have i abandoned the most times?

Every one of those is a Mongo query you already write by hand somewhere in
`app/api/`. Exposing them as tools turns a tracker into something you talk to.
Gate the write tools behind a confirm step and never let the model delete.

### embeddings, so recommendations stop being from memory

Right now picks are whatever the model recalls, then resolved against TMDB —
and `resolvePick` silently drops everything that doesn't match, which is why
you sometimes get eight cards instead of twelve.

Store an embedding per title and a rolling taste vector per user (Atlas Vector
Search, or a small local index — the catalog is finite). Retrieve candidates by
vector, then use the model only for *ranking and writing the reason*. That is
the shape recommendations should have: retrieval for recall, the LLM for taste
and voice. It also kills the hallucinated-title class of bug outright.

### close the loop on picks

You throw away the most valuable signal in the app. When a user opens, saves,
or ignores an AI pick, that's ground truth about whether the recommendation was
good. Log it on `AIPick`, feed the last ~20 outcomes into the next
`generatePicks` call, and the recommendations start actually learning instead
of re-deriving you from scratch every 24 hours.

---

## rules to hold to

Whatever gets built:

- **cache by content signature, not by clock.** `MODEL_TAG` +
  taste-signature is the right pattern — keep it. A user who logged nothing new
  should never burn a token.
- **stream anything over ~200 tokens.** Nobody should watch a spinner for prose.
- **ground before you show.** Never render a title the model named until TMDB
  confirms it exists. `resolvePick` is the model for this.
- **label it.** Every AI surface already carries "AI-generated — may get
  details wrong". New ones do too.
- **the model drafts, the user commits.** Reviews, collections, watchlist
  edits — the AI proposes, a human presses the button.
- **spoilers are a hard boundary, not a warning.** Once #1 above lands, treat
  the user's watch position as a constraint the prompt cannot cross.

---

# wave two

Everything above is written. This section is what's left after that list —
ideas that use data the first wave never touched: `StreamingAvailability`
(providers, per country, already cached), `playCount`, `runtime`, the
*density* of `watchedAt` rather than its values, and TMDB's episode-level
text, which is the most spoiler-dense surface in the app and currently
renders raw.

## the six that matter

### 1. spoiler shield, app-wide

Idea #1 in wave one makes the *chat* respect your watch position. But the
chat is the one place you're braced for spoilers. The damage happens on the
season list, where TMDB episode names ("The Funeral", "Nate's Death") and
overviews render unmasked, and in other people's reviews, where
`Review.hasSpoilers` is a self-reported flag and people lie.

Make watch position a global constraint instead of a per-feature one:

- episode titles and overviews past your last logged episode render blurred,
  tap to reveal. No model call needed — that's pure `WatchHistory` arithmetic.
- reviews and TMDB reviews get an AI spoiler classification at write time,
  cached on the row: *clean / spoils this season / spoils the ending*. Then
  the feed filters against your position rather than a checkbox.

This is the only feature on either list that makes the product **safer to
use** rather than more fun, and "the tracker you can browse mid-season" is a
one-line pitch nobody else is making.

### 2. the catch-up plan

A schedule, not a suggestion. "Finale drops the 19th, I'm 11 episodes back."
You have every input: episode count and runtime from TMDB, and the user's
real pace from `watchedAt` density — minutes per day, and *which* days,
straight off the heatmap you already compute.

> 11 episodes, 8h40m. You average 70 minutes on weeknights and burn three
> hours on Sunday. Two a night through Thursday, four on Sunday, and you're
> current with two days spare.

Ship it with a "add to calendar" .ics export and it stops being a novelty.
Also the honest version: *you will not make it, watch the first four and the
last two* — which needs the filler detection from wave one, so build them
together.

### 3. only what you can actually watch

`StreamingAvailability` is cached per title and country and currently only
decorates the detail page. Push it upstream into every AI surface:

- **picks and triage filter to your services.** A recommendation you can't
  press play on is a worse recommendation. One line of context in
  `generatePicks`, a hard filter after `resolvePick`.
- **the subscription audit.** You know minutes watched per title, and which
  provider each title sits on. Sum it per service:
  *"Hulu: two hours since March. That's £6.40 an hour. Everything you
  actually watched this quarter was on two services."*
  A tracker that tells you to cancel something is a tracker people keep.
- **leaving-soon triage** — when a shelved title's availability window is
  closing, the AI writes the nudge: watch it this week or admit you won't.

The audit is the strongest monetisable feature on either list, and it's
arithmetic plus one paragraph of prose.

### 4. paste anything, get a watchlist

The emptiest moment in the app is a new account. Every one of these is a
list of titles trapped in prose:

- a friend's text message with five recommendations in it
- a "best of 2025" listicle URL
- a Letterboxd or Trakt CSV export
- a screenshot of someone's shelf (Groq serves vision — same route as the
  screenshot search idea)

One box, one prompt: extract titles, resolve each against TMDB with
`resolveTitle`, show the matches as checkboxes, bulk-add. Onboarding goes
from "log twenty things by hand" to "paste and press add", and the cold-start
problem that `AIPicks` and the calibration game both exist to work around
mostly evaporates.

### 5. natural-language logging

Logging is the tax the user pays for everything else in the app, and right
now it's a per-episode tap. Let them type it instead:

> watched the first three eps of andor last night and the batman on sunday

Parse to structured `WatchHistory` rows — title, season, episode range,
relative date resolved against today — show them as editable chips, commit on
a button. Strict JSON, resolve against TMDB, never write without the
confirmation press. Same discipline as everything else here.

The dictate-it-on-the-couch version of this is the whole feature; a tracker
lives or dies on whether logging is frictionless.

### 6. the attention score

A cached, per-title annotation of how much of you a title actually needs:

> **second-screen safe** — plot repeats itself, you'll be fine on your phone.
> **subtitles, and they matter** — 40% non-English, and the accents in the
> rest are load-bearing.
> **do not multitask** — three timelines, and it does not recap them.

Nobody publishes this and everybody wants it. It pairs directly with
time-aware picks: Tuesday-after-work you and Saturday-night you want
different answers, and this is the axis that separates them. One cached call
per title, rendered as chips next to the runtime.

## smaller, still worth it

- **"does it get good, and will you get there?"** — you're four episodes in
  and lukewarm. The model knows where the show turns; your own drop history
  knows where *you* bail. *"It turns at seven. You have never made it past
  five on a show you rated this low at four. Set a checkpoint or drop it
  now."* Honest recommendation beats optimistic recommendation.
- **slump diagnosis** — three drops in a row, or four weeks of nothing but
  rewatches (`playCount > 1` makes this trivially detectable). Name the
  pattern — *every one you dropped was a ten-episode prestige drama; you are
  tired, not out of taste* — and prescribe one 95-minute palate cleanser.
- **automatic spoiler tagging on reviews** — the classifier from #1, applied
  at post time. Fixes a flag that is wrong roughly half the time.
- **watch-together, out of sync** — the co-watch case wave one missed. Two
  users on the same show at different positions: the AI returns what's safe
  to discuss at the intersection. *"You're both past the funeral. Do not
  mention the letter."* Uses the same position data as #1.
- **is this okay for a twelve-year-old** — distinct from content warnings,
  which answer "will this upset me". This answers "can I put it on with my
  family in the room", which is a different question and a more common one.
- **the memory prompt** — on complete, one generated question that isn't
  about the film: *what were you doing the week you watched this?* One line
  of answer, stored on `Review`. Turns the emptiest collection in the
  database into a diary, and a diary is the thing people don't churn from.
- **room mode** — four people, one code, everyone's taste profile in the
  same prompt, each gets one veto. The wave-one watch-party feature only
  handles two people, and two people rarely have the problem.

## the honest ordering

If only three ever ship: **natural-language logging** (it lowers the cost of
using the app at all), **paste-anything import** (it fills a cold account in
one paste), and **the spoiler shield** (it's the only thing here nobody else
does). Picks, roasts and summaries are the features people try. These three
are the features that decide whether the app is still open in March.

---

# wave three — the days you didn't watch anything

Both lists above make watching better. Neither gives anyone a reason to open
the app on a Tuesday when they watched nothing, and that number is the one
that decides whether a tracker is still installed in six months. A tracker
that only rewards you *after* you've watched something is a tool. The
features below are the ones that make it a habit.

Different organising principle, so almost nothing here overlaps: these are
games, a character, and rituals.

## the daily game

Framed and Cinenerdle are small products doing enormous daily numbers on one
mechanic: a puzzle, six guesses, an emoji grid you paste into a group chat.
You can ship a better version of that because theirs is built from a generic
catalogue and yours is built **from titles the player has actually seen**.

Five clues, hardest first, generated once per title and cached — which means
the cost amortises across every user who ever gets that title, and the
catalogue builds itself as the app grows:

> 1. A man is told the truth and does not believe it.
> 2. Someone counts backwards.
> ...
> 5. "You know how I know you're gay?"

Pull the answer from `WatchHistory` — completed, rated, over a month ago, so
it's a memory test rather than a trivia test. Wrong guesses are scored
against your own library, so even the near-misses are personal. Share grid,
streak counter, one puzzle a day, done.

The streak is the product. Everything else in this file is a reason to open
the app when you have a question; this is a reason to open it when you don't.

## your critic

Every AI surface in the app right now is stateless and anonymous — you ask,
it answers, it forgets. Give it a name, a fixed set of biases, and a memory,
and it becomes something people talk about instead of something they use.

The character has taste of its own, declared up front and never drifting:
loves a slow first act, distrusts anything over 140 minutes, thinks you are
too generous with sequels. It doesn't wait to be asked — it reacts when you
rate something, and it remembers what it said last time.

> You gave *Tenet* an 8. I have brought this up before. I will bring it up
> again.

Two cheap pieces make it real: a persona block pinned into every prompt, and
a rolling log of its own past verdicts fed back in, so it can be consistent
and hold a grudge. It costs almost nothing over what `generateVerdict`
already does, and it converts the app's entire AI layer from a utility into a
relationship. `AITasteProfile` is already the right shape to store it on.

The debate variant, for one paragraph more: **two** critics who disagree,
arguing about the title in six lines. Funnier than a summary and about the
same tokens.

## the sunday letter

One notification a week that is genuinely worth opening, written rather than
templated:

> Four hours, all of it on one show, which is not like you. Two things on
> your list leave Netflix on the 14th. *Severance* has three unwatched
> episodes and you have not touched it since August — you know how this ends.
> If you only do one thing this week, do the 96-minute one.

Nothing here is new data; it's the existing dashboard totals, the streaming
windows, and the stale-shelf query, in one voice, once a week, at a fixed
time. The digest is the difference between a `Notification` collection people
mute and a thing people wait for.

Weekly is deliberate. Daily nags, monthly is forgettable.

## the bracket

Sixteen titles from your own library, seeded by the AI into a bracket that
has a reason for each seeding, then you vote through it while the model
commentates like it's covering a sport.

> The two-seed goes out to a film you rated a 6 in 2023. This says more about
> you than the film.

Fifteen taps, five minutes, and the output is a single title you can put on
your profile as a settled argument, plus the best share image the app will
ever produce. `lib/shareCard.ts` already renders cards; this just gives it
something worth rendering. Themed brackets on demand — comfort rewatches,
things you watched in one sitting — make it repeatable rather than a
one-time gimmick.

## smaller rituals

- **beat the model** — before you enter a rating, the AI guesses it. You
  score *it*, not the other way round. Gamifies the calibration idea from
  wave one, and every round produces a labelled example of how your taste
  differs from consensus, which makes every other recommendation better. The
  most useful game on this list disguised as the silliest.
- **the memory quiz** — you say you've seen *Breaking Bad*. Ten questions
  says otherwise. Generated per show, cached, shareable, and quietly the
  funniest feature in the app.
- **cast it** — pick a film, recast it from actors in your own watch history,
  AI writes the one-line case for each choice and then rates the whole cast
  out of ten. Pure play, no data problem, extremely screenshot-shaped.
- **the anniversary** — *a year ago today you watched this and gave it a 9.
  Still true?* One tap re-rates it, which is the only mechanism in the app
  that captures how taste ages. `watchedAt` already has the index for it.
- **finish-the-sentence reviews** — the blank textarea is why nobody writes
  reviews. The AI writes the first clause, you finish it. Different from the
  ghostwriter idea: that one drafts *for* you, this one just gets you moving,
  and the result is genuinely yours.

## and one for you, not the user

An eval harness for the AI surfaces, which is the unglamorous thing that
decides whether any of this stays good. `resolvePick` silently drops
hallucinated titles, so a bad `generatePicks` run looks identical to a good
one with fewer cards — you cannot currently tell a prompt regression from a
quiet day.

Log every pick run's resolve rate, hold twenty frozen taste profiles as
fixtures, and have a model score the output of each prompt version against
them. `MODEL_TAG` already versions prompts; this gives the version a number
to move. Ship it before wave one, not after — it's how you find out which of
these forty ideas actually worked.
