# Stitch Reconciliation Notes

## Scope

Reviewed the implemented v1 expansion surfaces against the Stitch brief targets:

- Daily cups widget and machine readiness rows
- Library filter chips and bean cards
- Lab recipe-locked state
- Bean detail recipe, sensory radar, and lifecycle controls
- Care home and machine detail task list

## Deltas Addressed

- Added explicit accessibility labels for the cups widget and sensory radar so the visual-only primitives have a useful spoken summary.
- Added button roles and labels to machine cards, add-machine/add-task tiles, and bean rows.
- Added radio semantics to Library filter chips so the segmented filter state is exposed to assistive tech.

## Remaining Visual Deltas

- Bean cards remain text-first; the Stitch direction calls for richer illustrative art.
- The radar primitive is compact and functional, but could use slightly more label spacing on small screens.

## Recommended Next Polish

- Add a thumbnail/art treatment to bean cards.
- Give the radar a responsive size tier for bean detail on larger screens.
