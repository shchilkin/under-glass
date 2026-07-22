# Preserve route intent during recalculation

The router is deterministic and treats user-created Route Anchors as immutable constraints. Scene changes recalculate only affected route segments between the nearest anchors; when no valid route can preserve those constraints, the component reports a Route Conflict instead of moving or deleting an anchor silently. Fully automatic routes may be recalculated freely, while manually guided routes retain the user's intent.
