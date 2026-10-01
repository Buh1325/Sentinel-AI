# Latest Sentinel update

## Live AI Categorization

- The Live AI Categorization screen now requests semantic classification from the `sentinel-agent` Supabase Edge Function.
- The classifier prompt explicitly handles informal / colloquial descriptions and infers incident type from actions and context rather than requiring the legal/crime word itself.
- Example: `they threw her in the car and drove off` is classified as **Kidnapping** even though the text never says "kidnap".
- If the cloud AI is unavailable, Sentinel falls back to an expanded on-device semantic pattern engine so the demo still works.
- The categorization result shows whether it used `AI SEMANTIC` or the `ON-DEVICE FALLBACK`.

### Supabase deployment note

Because the Edge Function was updated to support classification calls without tool definitions, deploy the included function again:

```bash
supabase functions deploy sentinel-agent
```

The existing `ANTHROPIC_API_KEY` secret does not need to be changed if it is already configured.

## Panic activation

- Removed the press + confirmation flow.
- The emergency control now activates after one continuous **3-second hold**.
- Releasing before 3 seconds cancels activation.
- A visible progress bar provides feedback while holding.
- Once the hold completes, Sentinel immediately begins the existing emergency flow: microphone permission / recording and location capture.
