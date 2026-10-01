# Sentinel merged feature set

This branch keeps the existing Sentinel login/auth, Agent, Safety Mode, news, emergency and Supabase functionality and adds the requested collaboration features.

## Layout
- Main application uses Android/iOS safe-area insets at the top and bottom.
- Bottom navigation sits above the Android system navigation area.
- Bottom navigation icons/touch targets are larger.

## Incident reporting
- Optional photo attachment (camera or gallery).
- Optional video attachment (record or gallery).
- Public/private setting for the report.
- Separate public/private settings for attached photo and video.
- Private report automatically forces its media private.
- Editable incident date/time, defaulting to now.
- Human-friendly location picker: current location, South African place search, tap map, or drag the map pin.
- `incident_at` is stored separately from report submission time.

## Privacy behavior
- Private reports do not appear on the public Map or Community feed.
- Private reports remain in Sentinel's internal incident data and are included in Safety Mode and Sentinel Agent context.
- Public reports can keep their image/video private.
- Public community images/videos begin obscured and require a tap to reveal.

## Map / demo
- Visible frequency/time key.
- Marker colour uses reports in the previous 7 days within ~750 m:
  - Green: 1 recent report
  - Amber: 2 recent reports
  - Red: 3+ recent reports
  - Grey: older than 7 days
- More fixed sample incidents are included.
- On startup Sentinel adds 3 **session-only demo incidents** near the device (within 2 km; usually under 1 km) so Safety Mode and hotspot frequency can be demonstrated without saving fake cloud rows.

## Supabase
If Supabase is enabled, rerun `sql/schema.sql` to add the new incident fields and privacy-aware read policy.

### Media persistence note
Photo/video URIs work immediately for the same-device demo. This merge does **not** upload media binaries into Supabase Storage. Add Storage upload before relying on cross-device or post-reinstall media persistence.
