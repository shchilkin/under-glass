# Keep domain semantics outside the component

The component accepts a generic multigraph of Nodes, Groups, and Connections rather than owning concepts such as services, databases, repositories, or environments. Multiple independently identified Connections may join the same pair of Nodes. The host application supplies type information and arbitrary metadata, while the component owns visualization, placement, and interaction; this keeps the public API reusable across different kinds of project visualization.
