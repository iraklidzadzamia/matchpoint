# App Store Connect — everything to paste in

Everything below is filled in and checked. The pages are live, the screenshots
are the right size, and every field fits Apple's limits.

---

## App record

| Field | Value |
|---|---|
| **Name** (30 max) | `MatchPoint: Tennis & Padel` |
| **Bundle ID** | `com.matchpoint.scorekeeper` |
| **SKU** | `matchpoint-ios-001` |
| **Primary language** | English (U.S.) |
| **Primary category** | Sports |
| **Secondary category** | *(leave empty)* |
| **Price** | Free |

> **The name has to be unique across the whole App Store.** Plain `MatchPoint`
> is very likely taken, which is why the name above carries the sport. If even
> that is rejected, try `MatchPoint Padel & Tennis` or `MatchPoint Scorekeeper`.
> The name on the home screen of the phone stays `MatchPoint` either way — that
> one comes from `app.json` and is not affected.

---

## Subtitle (30 max)

```
Padel & tennis scorekeeper
```

## Promotional text (170 max — editable any time, without a new build)

```
Keeps score out loud so you can keep playing. Tennis and padel, singles and doubles, with the 2026 padel deuce rules built in.
```

## Keywords (100 max, commas, no spaces)

```
scorekeeper,scoreboard,umpire,referee,racquet,racket,doubles,singles,tiebreak,golden,deuce,court
```

> `padel`, `tennis` and `match` are deliberately absent: they are already in the
> app name, and Apple indexes that separately. Repeating them wastes characters.

## Description

```
MatchPoint keeps the score of your tennis or padel match and calls it out loud, so nobody has to remember whether it was 30-15 or 15-30.

Put the phone on the bench facing the court. Tap your half of the screen when your side wins a point. That is the whole interaction.

SAYS THE SCORE
After every point the score is announced — clearly, and with the server's score first, the way an umpire says it. Game, set and match are called too, with applause. Mute it with one tap when you would rather have quiet.

READS FROM ACROSS THE COURT
The score screen is landscape, in big type, at full brightness, and it will not sleep in the middle of a match.

KNOWS THE ACTUAL RULES
Sets to six with a two-game margin, tie-breaks at six all counted in plain numbers, the serve alternating one point then two, and the next set opened by the pair that did not open the tie-break. Checked against the FIP Rules of Padel, 1 January 2026 edition.

SCORES THE MATCH YOU ARE ACTUALLY PLAYING
Not every match is a tournament match. Set the games it takes to win a set: six for the full thing, four when the court is booked for an hour, or eight for a pro set played on its own. The tie-break follows along.

ALL THREE WAYS TO PLAY 40:40
• Like in tennis — win two points in a row, advantages never run out
• Star point — up to two advantages, then a deciding point. The rule the 2026 professional padel tour plays
• Golden point — the very next point wins the game, as most clubs play it

Choose once in Settings. Tennis matches always play advantages, so the option stays out of the way.

UNDO ANYTHING
Tapped the wrong side? Undo takes the point back and cancels the announcement that was about to play. As many points back as you need.

YOUR MATCHES, KEPT
Finished matches are saved with their set scores. Open one to see how it was won: how long it took, how the points split, the longest game, and a chart of who was ahead at every stage of the match. Delete one match or all of them, whenever you like.

SINGLES AND DOUBLES
Both, for both sports. In doubles the app tracks which partner is serving.

NOTHING LEAVES YOUR PHONE
No account. No sign-up. No advertising. No analytics. MatchPoint makes no network requests at all — it works exactly the same in aeroplane mode, and there is nowhere for your data to go.
```

## What's New (version 1.0)

```
The first release.
```

---

## App Privacy

Answer: **Data Not Collected.**

Nothing else in that section applies — the app has no analytics, no advertising
identifier, no crash reporting, no account, and makes no network requests.
Verified: there is not one `fetch` or URL in the source.

## Age Rating

Every question is **None** / **No**. The result is **4+**.

There is no user-generated content, no web view, no chat, no purchases, no
gambling, no location, and no unrestricted web access.

## Export compliance

Already declared in `app.json` as `ITSAppUsesNonExemptEncryption: false`, so App
Store Connect should stop asking. If it asks anyway: the app uses no encryption.

## App Review Information

| Field | Value |
|---|---|
| **Sign-in required** | No |
| **Demo account** | Not needed |
| **Contact** | your name, phone and email |

Notes to the reviewer:

```
MatchPoint is a scorekeeper for tennis and padel. No account, no sign-in, and no network connection is required — the app works fully offline.

To try it: tap New Match, then Start Match (names are optional). The phone rotates to landscape. Tapping the upper or lower half of the screen scores a point for that side, and the score is spoken aloud. The sidebar has undo, mute and settings.
```

---

## URLs — live, paste them straight in

GitHub Pages serves them from `main` / `docs`. Both were fetched and return 200.

| Field | URL |
|---|---|
| **Support URL** (required) | `https://iraklidzadzamia.github.io/matchpoint/` |
| **Privacy Policy URL** (required) | `https://iraklidzadzamia.github.io/matchpoint/privacy.html` |
| **Marketing URL** (optional) | leave empty |

> Both pages publish `ballroomtbilisii@gmail.com`, kept separate from the main
> address on purpose — a public page collects spam. Use the same one for the
> App Review contact so replies land in one place.
>
> Editing `docs/` and pushing to `main` republishes them within a minute. The
> privacy policy must stay true: if a future version collects anything, that
> page has to say so before the version ships.

---

## Screenshots

> **Stale — recapture before submitting.** These were taken on 29 July 2026 and
> the app has moved on: there is no personal "Your Record" screen any more (it is
> a table of every player), history is grouped into sessions, settings has a
> games-per-set control, and setup no longer asks which side you are on.
> Uploading them would advertise an app that does not exist. Reseed the
> simulator and retake all six.

In `store/screenshots/`, captured on an iPhone 17 Pro Max. Apple accepts
**1320 × 2868** portrait and **2868 × 1320** landscape for the 6.9-inch size,
and every file below is exactly one of those. Nothing else is mandatory now
that the app is iPhone-only.

Upload in this order — the first two are what people see in search results:

| # | File | Size |
|---|---|---|
| 1 | `01-score-landscape.png` | 2868 × 1320 |
| 2 | `02-detail.png` | 1320 × 2868 |
| 3 | `03-setup.png` | 1320 × 2868 |
| 4 | `04-history.png` | 1320 × 2868 |
| 5 | `05-settings.png` | 1320 × 2868 |
| 6 | `06-home.png` (optional) | 1320 × 2868 |

> **About the first one.** The score screen is landscape-only, so it is a
> landscape screenshot while the rest are portrait. Apple's specification lists
> both sizes for 6.9-inch and does not forbid mixing them. If App Store Connect
> refuses the mix, use `01-score-portrait.png` instead — the same shot framed on
> a portrait canvas — and the whole set is then one orientation.

The screenshots show a seeded match (Irakli & Nika vs Rafael & Juan) played by
the real engine, so every number in them is one the app actually produced.

---

## Order of operations

1. **Wait for the enrollment email.** Nothing below works until the membership
   is active — App Store Connect will not let you create the app record.
2. ~~Push to GitHub and switch on Pages.~~ Done — the URLs above are live.
3. Create the app record in App Store Connect with the values above.
4. Build: `npx eas-cli build --platform ios --profile production`. EAS asks for
   the Apple ID and creates the certificates itself. **Do this yourself — it
   needs your Apple credentials.**
5. Submit the build: `npx eas-cli submit --platform ios`.
6. **Retake the screenshots** — the ones in the repo predate the players table
   and session grouping.
7. Fill in the listing, upload the screenshots, and send it for review.

Review is usually a day or two for a first submission.
