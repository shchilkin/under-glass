# Deliver feature work through pull requests

Every feature is developed on its own branch and worktree and enters `development` only through a pull request; feature work is never committed directly to `development`, and agents do not merge their own pull requests. This preserves an explicit review and CI boundary for each independently verifiable slice while leaving the maintainer in control of integration.
