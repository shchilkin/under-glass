# Develop independently and dogfood the Viewer in the portfolio

The engine, React components, and demo application are developed in this repository without depending on the portfolio codebase. The existing portfolio is the first external acceptance consumer for the Viewer, providing real constraints for Astro integration, SSR-safe loading, responsive behavior, accessibility, and presentation while preventing portfolio-specific concepts from leaking into the reusable package.
