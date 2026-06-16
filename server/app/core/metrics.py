class Metrics:
    """Simple in-memory metrics exported via /metrics."""

    def __init__(self):
        self.analysis_total: int = 0
        self.analysis_completed: int = 0
        self.analysis_failed: int = 0
        self.reports_generated: int = 0

    def increment(self, metric: str) -> None:
        if hasattr(self, metric):
            setattr(self, metric, getattr(self, metric) + 1)


metrics = Metrics()

