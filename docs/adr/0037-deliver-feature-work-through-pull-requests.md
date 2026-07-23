# Deliver feature work through pull requests

Every feature is developed on its own branch and worktree and enters `development` only through a pull request; feature work is never committed directly to `development`, agents do not merge their own pull requests, and squash merge is the only permitted merge method. This preserves an explicit review and CI boundary for each independently verifiable slice, keeps the integration history at one commit per accepted change, and leaves the maintainer in control of integration.
