## Game Rules by Level (Locked)

### Core Mechanics
- Goal: Move the player (cyan) to the yellow door tile.
- Movement: Arrow keys, on-screen D‑pad, or swipe. Movement is blocked by grid edges and unwalkable gaps.
- Controls: Level 1 is normal. From level 2 onward, control mappings are randomized each level (no immediate repeats).
- Grid sizing: Levels 1–10 use an 8×8 grid; levels 11+ use a 12×12 grid.
- Areas: From level 11+, the playfield is separated into distinct areas: the main mainland (largest) and one or more islands. Gaps between areas are unwalkable and not rendered; each area has its own white border.
- Start/Goal: Player starts at (0,0). The door spawns at a random cell (never at start). Stepping onto the door completes the level.
- Testing: Press L to jump to a level or open with `?level=N`.
- Persistence: Mechanics introduced at a level persist to all higher levels unless explicitly stated otherwise.
- Reachability: Any entry portal placed on the mainland is guaranteed to be reachable by walking from the start (no boxed-in starts). Portals never spawn on unwalkable gaps.
- Separation: No two entities (door, keys, portal entries/exits) ever spawn on the same tile, and are not placed orthogonally adjacent to each other to avoid ambiguous overlaps.
- Uniqueness: Each entity occupies a unique grid coordinate (A1, B3, …). If any duplicates occur during generation, the level is rerolled.
- One occupant per cell: An in-memory occupancy matrix is maintained during generation to prevent any duplicate placement.
- Portals: Two‑way. Stepping on either end teleports you directly onto the other end’s portal tile (no adjacent drop).
- Island borders (11+): Walking cannot cross an island border in either direction. You can walk up to a border; entering or leaving an island requires a portal.

### Levels 8+ — Mainland Obstructions
- Mainland-only blocking tiles appear (never inside island rectangles).
- Placement rules ensure the player is never boxed in, and all required targets remain reachable by walking on the mainland:
  - 8–10: door (and door key when present).
  - 11–15: portal entry on the mainland.
  - 16+: orange and blue portal entries on the mainland.
- Density scales with grid size (higher grids get more blocks), clamped to a minimum; blocks never overlap entities and never occupy the start tile.
- Visual: purple “X” tiles.

### Level 1
- Grid: 8×8
- Controls: Normal (Up/Right/Down/Left → N/E/S/W)
- Mechanics: None
- Win: Reach the door

### Levels 2–5
- Grid: 8×8
- Controls: Randomized each level (no consecutive repeats)
- Mechanics: None
- Win: Reach the door

### Levels 6+ — Key & Gate
- Grid: 8×8 for 6–10; 12×12 for 11+
- Door is locked until a key is collected (persists into all higher levels).
- A key spawns on a random free cell (not start or door). Picking it up:
  - Removes the lock immediately (overlay disappears)
  - Removes the key from the board
  - Shows a small key badge on the player for the rest of the level
- Controls: Randomized (no consecutive repeats)
- Win: Reach the (unlocked) door (and satisfy any additional conditions for higher tiers)

### Levels 11–15 — Portal + Door Island
- Grid: 12×12
- From level 11 onward, islands are visually separated as distinct areas with their own white borders (no water fill); only walkable areas are outlined, gaps are empty background. The mainland uses all remaining space and is fully navigable. You can walk up to the island’s border but cannot step inside or leave the island without a portal.
- A color‑matched portal pair spawns: stepping on either end teleports you directly onto the other end’s portal tile (two‑way).
- Visual consistency: portal entry and exit are color-matched.
- Adjacency rule: The portal entry and the exit are never placed side‑by‑side (no orthogonal adjacency).
- Placement safety: The door tile and any exit portal tile must have at least one orthogonally adjacent open tile (N/E/S/W). If placed on a border or in a corner, at least one adjacent open tile is still guaranteed.
- No entity overlap: Door, key, portal entry, and portal exit never occupy the same tile.
- You must: (1) collect the key (key/gate persists from level 6+), and (2) have used the portal during the level to be allowed to enter the door.
- The key appears on the mainland (visual lock overlay will show on the door until the key is collected).
- Controls: Randomized (no consecutive repeats)
- Win: Use the portal to reach the door, collect the key, then enter the door

### Levels 16+ — Multi-Portal Chain
- Grid: 12×12
- Two islands, two portal pairs:
  - Island A: contains the Blue Key (for the blue portal).
  - Island B: contains the Door (door key still required from 6+).
  - Portal B (Orange): mainland ↔ Island A (two-way), always unlocked; used to reach the Blue Key.
  - Portal A (Blue): mainland ↔ Island B (two-way), locked until the Blue Key is collected.
- Flow: Use Orange to Island A → collect Blue Key → use Blue to Island B → collect Door Key → exit.
- Keys: Two keys at 16+ — Blue Key (unlocks blue portal) and Door Key (unlocks door). The player’s tile shows badges for collected keys.
- Portals: Two‑way; stepping on either end teleports you directly onto the other end’s portal tile.
- Islands: Two separate islands (A: Blue Key, B: Door) never overlap and are accessible only via portals. There is at least a one‑tile gap between islands. Each island is outlined; gaps are unwalkable and not rendered. Walking cannot cross between islands; switching islands requires portals. Door and exits are placed with a one‑tile inner margin.
- Placement safety: Exit portals and the door have at least one orthogonally adjacent open tile. Entry portals on mainland are always placed on reachable, non-water tiles.
- Controls: Randomized (no consecutive repeats)

### Visuals & Feedback
- Door: Brown door over the yellow goal tile.
- Lock: Overlays the door while locked.
- Key: Rendered on its cell and shown as a badge on the player when carried.
- Blue portal lock: The blue portal entry shows a lock badge until the Blue Key is collected.
- Obstructions (8+): Purple “X” tiles on the mainland; they block movement but never isolate required paths.
- Water/Void: Blocks movement; used to isolate the islanded door from level 11+.
- Haptics: Light vibration on moves and a stronger pulse on key pickup (when supported).


