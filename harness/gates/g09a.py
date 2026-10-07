"""Gate G9a checker. Implemented in a later phase (criteria: docs/plan/06_QA_GATES_AND_DELIVERY.md section 1).
Thresholds are never weakened here; only the Council changes them, by ADR."""


def check(ctx):
    return [{"name": "implemented", "pass": False, "detail": "not implemented yet"}]
