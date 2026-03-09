# Hacker Wheel of Fortune - Game Design Document

## Overview

Hacker Wheel of Fortune is a hacker/security-themed adaptation of the classic TV game show *Wheel of Fortune* (NBC/CBS, 1975-present). Three contestants spin a wheel and solve hangman-style word puzzles using security terms, hacker culture phrases, tech company names, and infosec jargon. It combines luck (the wheel) with vocabulary knowledge and pattern recognition.

## Source Material

*Wheel of Fortune* was created by Merv Griffin and has aired in various forms since 1975:

- **Wheel of Fortune** (NBC daytime 1975-89, syndicated 1983-present): Longest-running syndicated game show in US history
- Originally hosted by Chuck Woolery (1975-81), then Pat Sajak (1981-2024), now Ryan Seacrest (2024-present)
- Letter-turner: Vanna White (1982-present)
- Based on the classic word game *Hangman*
- Format licensed in over 60 international versions

The core mechanic has remained consistent for 50 years: spin a wheel, call a letter, solve a word puzzle.

---

## Game Rules

### Players

- **3 contestants** compete head-to-head
- In a hacker event setting: audience members, conference attendees, CTF competitors
- No teams -- each contestant plays individually

### Core Mechanic

1. A word puzzle is displayed on the board as blank tiles (letters hidden)
2. A **category** is revealed (e.g., "Security Tool", "Hacker Phrase", "Tech Company")
3. Contestants take turns spinning the wheel
4. After spinning, the contestant **calls a consonant**:
   - If the letter is in the puzzle: earn the wheel value **per occurrence**, keep spinning
   - If the letter is NOT in the puzzle: turn passes to the next contestant
5. Instead of spinning, a contestant may **buy a vowel** for **$250** (deducted from round earnings)
6. Instead of spinning, a contestant may **attempt to solve** the puzzle
   - Correct solve: win all accumulated money for that round
   - Wrong solve: turn passes to the next contestant

### The Wheel

A virtual wheel with **24 wedges**:

| Wedge Type | Values | Count | Notes |
|------------|--------|-------|-------|
| Cash | $300-$900 (Round 1) | ~16 | Increment by $50-$100 |
| Cash | $500-$900 + $2,500 top (Round 1) | - | Top value increases per round |
| **Bankrupt** | $0 | 2 | Lose ALL round earnings + turn |
| **Lose a Turn** | - | 1 | Lose turn only, keep money |
| **Free Play** | - | 1 | Free consonant or vowel, no penalty if wrong |
| **Mystery** | $1,000 or Bankrupt | 1 | Flip to reveal after correct letter |
| **Bonus Wedge** | Carry to bonus | 1 | Collect for bonus round advantage (see below) |

**Round scaling:** Top cash value increases each round:
- Round 1: $2,500 top value
- Round 2: $3,500 top value
- Round 3+: $5,000 top value

### Special Wedges (Hacker Adaptations)

| Classic Wedge | Hacker Version | Effect |
|---------------|---------------|--------|
| Mystery | **0day** | Correct letter = choose $1,000 safe or flip for $10,000/Bankrupt |
| Free Play | **Free Shell** | Call any letter free (consonant or vowel), no penalty if miss |
| Bankrupt | **pwned** | Lose all round earnings |
| Lose a Turn | **SIGKILL** | Lose turn, keep money |
| Express | **Root Access** | After correct letter: keep calling consonants at $1,000 each + free vowels, but one miss = Bankrupt |
| Bonus Wedge | **Skeleton Key** | Carry to bonus round for extra letters |

### Vowel Rules

- Vowels (A, E, I, O, U) cannot be called on a spin -- they must be **bought** for $250 each
- Contestant must have at least $250 in round earnings to buy
- If the vowel is not in the puzzle, $250 is still deducted and the turn continues (no turn loss)
- Multiple vowels can be bought in succession

### Solving

- A contestant may attempt to solve at any point during their turn
- Must say the complete phrase exactly (minor pronunciation tolerance at host discretion)
- Correct: contestant wins all money accumulated in that round
- Incorrect: turn passes, money is NOT lost (only bankrupt loses money)

---

## Round Structure

### Toss-Up Rounds (3 total, interspersed)

Quick-fire rounds that determine who starts each main round:

1. Letters are revealed **one at a time** at random positions
2. All three contestants watch -- first to **buzz in** and solve correctly wins
3. Toss-Up 1: **$1,000** (before Round 1)
4. Toss-Up 2: **$2,000** (before Round 2)
5. Toss-Up 3: **$3,000** (before Round 3)
6. Toss-Up money is banked permanently (not affected by Bankrupt)

### Main Rounds (3-4 rounds)

Standard spin-call-solve gameplay:

**Round 1:** Standard wheel, $2,500 top value
**Round 2:** Higher values, $3,500 top value, Mystery wedge active
**Round 3 (Prize Puzzle):** Solving wins the round money PLUS a bonus prize (e.g., hacker conference tickets, hardware, swag bundle)
**Round 4 (if time permits):** $5,000 top value, speed round rules (see below)

### Speed Round (Final Spin)

If time is short, the host spins the wheel once:
- The landed value + $1,000 = value per consonant for all contestants
- Vowels are free (no $250 cost)
- Contestants take turns: spin is skipped, just call a letter or solve
- 5-second time limit per turn
- Continue until solved

### Bonus Round

The contestant with the **most total winnings** plays the bonus round:

1. Contestant receives **R, S, T, L, N, E** free (the six most common letters)
2. Contestant picks **3 additional consonants** and **1 vowel**
3. All chosen letters are revealed in the puzzle
4. Contestant has **10 seconds** to solve
5. Multiple guesses allowed within the time limit

**Bonus Wheel:** Before the puzzle is revealed, contestant spins a smaller bonus wheel to determine the prize:
- Prizes range from $25,000 to $100,000
- One wedge: **Grand Prize** (e.g., $1,000,000 or major prize package)
- If contestant collected the **Skeleton Key** wedge during main play, they get 1 extra consonant pick

---

## Hacker Adaptation: Content Design

### Puzzle Categories

Adapted from classic Wheel of Fortune categories with a hacker twist:

| Classic Category | Hacker Category | Example Puzzle |
|-----------------|----------------|----------------|
| Thing | **Security Tool** | `METASPLOIT FRAMEWORK` |
| Thing | **Protocol** | `TRANSPORT LAYER SECURITY` |
| Phrase | **Hacker Phrase** | `HACK THE PLANET` |
| Phrase | **Security Mantra** | `DEFENSE IN DEPTH` |
| Person | **Notable Hacker** | `KEVIN MITNICK` |
| Person | **Tech Pioneer** | `LINUS TORVALDS` |
| Place | **Tech Company** | `PALO ALTO NETWORKS` |
| Place | **Hacker Venue** | `LAS VEGAS CONVENTION CENTER` |
| Event | **Security Conference** | `BLACK HAT USA` |
| Title | **CVE Description** | `HEARTBLEED` |
| Proper Name | **Tool Name** | `JOHN THE RIPPER` |
| Before & After | **Before & After** | `BRUTE FORCE MULTIPLIER` |
| Rhyme Time | **Rhyme Time** | `HACK ATTACK` |
| Fun & Games | **CTF Challenge** | `CAPTURE THE FLAG` |
| Occupation | **Infosec Role** | `CHIEF INFORMATION SECURITY OFFICER` |
| On the Map | **On the Darknet** | `SILK ROAD MARKETPLACE` |
| Food & Drink | **Hacker Fuel** | `ENERGY DRINK` |
| Same Letter | **Same Letter** | `PACKET PARSER PROXY` |

### Puzzle Difficulty Tiers

**Tier 1: Easy (General Tech Awareness)**
Short phrases, common terms, recognizable names.
- `FIREWALL` (7 letters)
- `OPEN SOURCE` (10 letters)
- `DARK WEB` (7 letters)
- `TWO FACTOR AUTHENTICATION` (24 letters)

**Tier 2: Medium (Security Practitioner)**
Longer phrases, specific tools, industry terms.
- `BUFFER OVERFLOW ATTACK` (19 letters)
- `PENETRATION TESTING` (18 letters)
- `ADVANCED PERSISTENT THREAT` (24 letters)
- `SOCIAL ENGINEERING` (17 letters)

**Tier 3: Hard (Deep Hacker Culture)**
Obscure references, historical events, niche terms.
- `Morris WORM INCIDENT` (18 letters)
- `RESPONSIBLE DISCLOSURE` (20 letters)
- `RETURN ORIENTED PROGRAMMING` (25 letters)
- `CERTIFICATE TRANSPARENCY LOG` (27 letters)

### Puzzle Selection Guidelines

- **Toss-Ups:** Tier 1, short (8-15 letters), quick to solve
- **Round 1:** Tier 1 and easy Tier 2 (accessible start)
- **Round 2:** Tier 2 (building difficulty)
- **Round 3 (Prize Puzzle):** Tier 2 (satisfying solve)
- **Bonus Round:** Tier 2-3, 2-3 words, 12-20 letters (solvable with RSTLNE + 4 picks)
- **Avoid:** Single words under 6 letters (too easy), puzzles over 30 letters (too slow), obscure acronyms alone

### Content Format: Puzzle File

```
# hacker-wheel-of-fortune/content/puzzles.json
{
  "puzzles": [
    {
      "id": "wof-001",
      "category": "Security Tool",
      "answer": "METASPLOIT FRAMEWORK",
      "tier": 2,
      "letterCount": 19,
      "wordCount": 2,
      "notes": "Popular penetration testing framework by Rapid7"
    },
    {
      "id": "wof-002",
      "category": "Hacker Phrase",
      "answer": "HACK THE PLANET",
      "tier": 1,
      "letterCount": 13,
      "wordCount": 3,
      "notes": "Famous line from the 1995 film Hackers"
    }
  ]
}
```

### Content Volume Target

- **Minimum viable:** 100 puzzles across all tiers and categories
- **Production target:** 300+ puzzles to prevent repetition
- **Per show:** ~8-10 puzzles consumed (3 toss-ups + 3-4 main rounds + 1 bonus)

---

## Technical Requirements

### Game State Machine

```
LOBBY -> TOSS_UP_1 (buzz-in race)
  -> ROUND_1_START (winner of toss-up goes first)
    -> SPIN / BUY_VOWEL / SOLVE
    -> LETTER_REVEAL (animation)
    -> TURN_RESULT (correct/miss/bankrupt/lose-turn)
    -> NEXT_TURN | ROUND_WON
  -> TOSS_UP_2
  -> ROUND_2_START (Mystery/0day wedge active)
    -> [same spin cycle]
  -> TOSS_UP_3
  -> ROUND_3_START (Prize Puzzle round)
    -> [same spin cycle]
  -> SPEED_ROUND (if time permits, or Round 4)
  -> BONUS_ROUND
    -> BONUS_LETTER_PICK (3 consonants + 1 vowel)
    -> BONUS_REVEAL (show picked letters)
    -> BONUS_TIMER (10 seconds)
    -> BONUS_RESULT (win/lose)
  -> FINAL_SCORE
```

### Host Console Requirements

- **Wheel control:** Spin button (virtual wheel with physics-based deceleration), or manual wedge selection for speed
- **Letter board:** Full alphabet display showing called/available letters
- **Puzzle board:** Editable grid for revealing letters, with animation triggers
- **Scoring:** Per-contestant running totals (round + bank), vowel purchase button ($250 deduct)
- **Special wedges:** Trigger Mystery/0day flip, Free Shell activation, Skeleton Key collection
- **Timer controls:** Toss-up letter reveal speed, bonus round 10-second countdown, speed round 5-second turns
- **Solve attempt:** Mark correct/incorrect, transfer round money to winner's bank
- **Bankrupt trigger:** Zero out round earnings with animation

### Board Display (Audience-Facing)

- **Puzzle board:** Large grid of letter tiles (blank/revealed), Vanna-White-style flip animation
- **Wheel:** Animated spinning wheel with pointer, wedge highlight on stop
- **Scoreboard:** Three contestant names + current totals
- **Category display:** Current puzzle category prominently shown
- **Letter tracker:** Used letters grayed out (consonants vs vowels distinguished)
- **Bonus round:** Timer countdown, dramatic reveal animation

### Player Display (Contestant-Facing)

- **Buzzer:** For toss-up rounds (integrates with existing DFIU buzzer system)
- **Score:** Personal running total
- **Turn indicator:** Whose turn it is
- **Letter board:** Available letters to choose from (touch-friendly for mobile)

### Buzzer Integration

- **Toss-up rounds:** All three contestants race to buzz in first
- **Uses existing DFIU buzzer system** (WebSocket, port 3001)
- **Lock/unlock:** Buzzers locked during regular rounds, unlocked during toss-ups
- **Hardware buzzer bridge:** Compatible with physical buzzers

### Audio/Visual Cues

- Wheel spinning sound (click-click-click as it passes wedges)
- Bankrupt/pwned: dramatic failure sound
- Letter reveal: tile flip sound
- Correct solve: celebratory fanfare
- Bonus round: tension music, countdown beeps
- Toss-up: rapid letter appear sound

---

## Differences from Classic Wheel of Fortune

| Aspect | Classic WoF | Hacker WoF |
|--------|------------|------------|
| Puzzles | Common English phrases | Security terms, hacker culture, tech names |
| Categories | Thing, Place, Person, etc. | Security Tool, Hacker Phrase, Notable Hacker, etc. |
| Audience | General TV audience | Hacker conference attendees |
| Wheel theming | Generic dollar amounts | Hacker-themed wedges (pwned, 0day, Free Shell) |
| Prize Puzzle | Vacation trip | Conference tickets, hardware, hacker swag |
| Bonus prize | Cash up to $100K | Grand prize relevant to audience (hardware, training) |
| Letter-turner | Vanna White | Could be a volunteer, or automated |
| Setting | TV studio | Conference stage, bar event, CTF venue |
| Speed Round | Final Spin by host | Same mechanic, keeps pace for live events |

---

## Design Considerations for Live Events

### Show Length

- **Full show (30 min):** 3 toss-ups + 3 main rounds + bonus round
- **Short show (15-20 min):** 2 toss-ups + 2 main rounds + bonus round
- **Bar/casual (10 min):** Skip toss-ups, 2 rounds + bonus round

### Wheel Implementation

For a digital/live event, the wheel can be:
1. **Virtual (projected/screen):** Fully animated, host clicks to spin, random physics simulation
2. **Physical wheel:** Build or buy a real wheel -- high production value, audience engagement
3. **Hybrid:** Physical wheel with sensors that report the result digitally to the game engine

**Recommendation:** Start virtual, upgrade to physical for flagship events.

### Contestant Selection

- 3 contestants per game, selected from signup queue (existing contestant system, port 3002)
- Quick audience qualifier: toss-up style puzzle on the big screen, first 3 to solve on their phones become contestants
- Rotate contestants every full game (every 30 min)

---

## Open Questions for the Board

1. **Physical wheel:** Is building/buying a physical wheel in scope, or start virtual-only?
2. **Prize structure:** Real prizes for each round, or cumulative funny-money with a single prize for the winner?
3. **Vowel cost:** $250 is the TV standard -- adjust for hacker context (e.g., 250 "credits")?
4. **Content contributors:** Should puzzle submissions be crowd-sourced from the community?
5. **Letter-turner role:** Automate letter reveals, or have a human "Vanna" for showmanship?
6. **Show frequency:** One-off event or recurring? Affects content volume needs.
7. **Difficulty calibration:** DEF CON audience vs. corporate security event vs. general tech meetup?

---

## Research Sources

- [Wheel of Fortune (American game show) - Wikipedia](https://en.wikipedia.org/wiki/Wheel_of_Fortune_(American_game_show))
- [Gameplay elements | Wheel of Fortune History Wiki](https://wheeloffortunehistory.fandom.com/wiki/Gameplay_elements)
- [Bonus Round | Wheel of Fortune History Wiki](https://wheeloffortunehistory.fandom.com/wiki/Bonus_Round)
- [List of categories | Wheel of Fortune History Wiki](https://wheeloffortunehistory.fandom.com/wiki/List_of_categories)
- [Rules - Wheel of Fortune Live](https://www.wheeloffortunelive.com/rules)
- [Wheel of Fortune Rules | It Still Works](https://itstillworks.com/12212242/wheel-of-fortune-rules)
- [Paramount Press Express | Wheel of Fortune | About](https://www.paramountpressexpress.com/cbs-media-ventures/shows/wheel-of-fortune/about/)
