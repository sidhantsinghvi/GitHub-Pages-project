/**
 * Extract JSON from a string that may be wrapped in markdown code fences.
 */
function extractJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence ? fence[1] : text
  return JSON.parse(raw.trim())
}

async function callClaude({ system, messages, apiKey }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, apiKey }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'API request failed')
  }
  const { text } = await res.json()
  return text
}

// ── System prompts ────────────────────────────────────────────────────────────

const GENERATE_SYSTEM = `You are an expert architectural layout AI. Generate a complete house floor plan as a JSON object.

Output ONLY valid JSON matching this schema exactly — no markdown, no explanation, no code fences:
{
  "meta": {
    "plotWidth": <number, feet>,
    "plotDepth": <number, feet>,
    "style": "<architecture style>",
    "interiorStyle": "<interior style>",
    "stories": <1 or 2>
  },
  "rooms": [
    {
      "id": "<unique string like r1, r2...>",
      "type": "<bedroom|bathroom|kitchen|living|dining|garage|office|gym|hallway|balcony|pool>",
      "label": "<human-readable name>",
      "x": <number, feet from left edge>,
      "y": <number, feet from top edge>,
      "width": <number, feet east-west>,
      "depth": <number, feet north-south>,
      "floor": <0 for ground, 1 for second floor>,
      "windows": ["north"|"south"|"east"|"west"],
      "door": { "wall": "north"|"south"|"east"|"west", "offset": <feet from wall start> }
    }
  ],
  "features": {
    "pool": <boolean>,
    "poolX": <number>, "poolY": <number>, "poolW": <number>, "poolD": <number>,
    "garage": <boolean>,
    "garageX": <number>, "garageY": <number>, "garageW": <number>, "garageD": <number>
  }
}

Layout rules:
- All coordinates are in feet; plot origin (0,0) is the top-left (NW corner)
- x increases eastward, y increases southward
- Every room must be within the plot with 2ft clearance from all edges
- Minimum sizes: bedroom ≥ 100sqft, bathroom ≥ 40sqft, kitchen ≥ 80sqft, living ≥ 150sqft
- Rooms on the same floor must not overlap
- For 2-story houses: floor 1 rooms should be above floor 0 rooms (same x/y footprint)
- Include a hallway connecting bedrooms when there are 2+ bedrooms
- Place windows on exterior-facing walls where possible
- Door offsets must be within the wall's length
- South-facing windows are preferred for living rooms (good natural light)
- Garage goes near the front/east edge; pool goes in the backyard
- Generate realistic, livable proportions — typical rooms are roughly square
- Only include garage/pool rooms if explicitly requested in the prompt`

const EDIT_SYSTEM = `You are a home layout editor. Apply the user's requested change to the house layout.

Return ONLY valid JSON with this shape — no markdown, no explanation:
{
  "changes": [
    { "action": "<action>", ...params }
  ],
  "summary": "<one sentence describing what changed>"
}

Allowed actions and their params:
- resize_room: { "roomId": "r1", "width": 15, "depth": 12 }
- move_room: { "roomId": "r1", "x": 10, "y": 5 }
- add_window: { "roomId": "r1", "wall": "south" }
- remove_window: { "roomId": "r1", "wall": "north" }
- change_room_label: { "roomId": "r1", "label": "Master Bedroom" }
- add_room: { "type": "office", "label": "Home Office", "x": 10, "y": 5, "width": 12, "depth": 10, "floor": 0, "windows": ["east"], "door": { "wall": "west", "offset": 2 } }
- remove_room: { "roomId": "r1" }
- rotate_house: { "degrees": 90 }
- change_style: { "style": "Modern" }
- move_pool: { "x": 20, "y": 30 }

Rules:
- Only change what the user explicitly asked for
- Do not modify unrelated rooms
- Use exact roomId strings from the current house state
- Keep coordinates within plot bounds (2ft clearance from edges)
- Provide a concise summary of what you changed`

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate the initial house from form inputs.
 * Returns a house state object.
 */
export async function generateHouse(form, apiKey) {
  const userPrompt = `Generate a house layout with these specifications:
- Plot size: ${form.plotWidth}ft wide × ${form.plotDepth}ft deep
- Stories: ${form.stories}
- Bedrooms: ${form.bedrooms}
- Bathrooms: ${form.bathrooms}
- Swimming pool: ${form.pool ? 'yes' : 'no'}
- Garage: ${form.garage}
- Garden/yard: ${form.garden}
- Architecture style: ${form.style}
- Interior style: ${form.interiorStyle}
- Special features: ${form.specialFeatures.length > 0 ? form.specialFeatures.join(', ') : 'none'}

Create a practical, aesthetically pleasing layout. Make sure all rooms are accessible and well-positioned.`

  const text = await callClaude({
    system: GENERATE_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    apiKey,
  })

  return extractJSON(text)
}

/**
 * Apply a chat edit to the current house.
 * Returns { changes, summary }.
 */
export async function editHouse(house, userMessage, apiKey) {
  const houseJSON = JSON.stringify(house, null, 2)

  const text = await callClaude({
    system: EDIT_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Current house state:\n${houseJSON}\n\nUser request: ${userMessage}`,
      },
    ],
    apiKey,
  })

  return extractJSON(text)
}
