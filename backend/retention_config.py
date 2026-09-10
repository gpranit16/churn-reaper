from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DiscountConfig:
    max_percent: float = 15.0
    max_duration_months: int = 3
    scenario_success_rate: float = 0.20


@dataclass(frozen=True)
class SupportConfig:
    max_monthly_cost: float = 30.0
    max_duration_months: int = 3
    scenario_success_rate: float = 0.15


@dataclass(frozen=True)
class ContractConfig:
    max_one_time_incentive: float = 150.0
    scenario_success_rate: float = 0.25


@dataclass(frozen=True)
class RetentionBusinessConfig:
    planning_horizon_months: int = 24
    gross_margin: float = 0.60
    discount: DiscountConfig = DiscountConfig()
    support: SupportConfig = SupportConfig()
    contract: ContractConfig = ContractConfig()


RETENTION_CONFIG = RetentionBusinessConfig()
