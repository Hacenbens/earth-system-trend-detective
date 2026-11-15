from __future__ import annotations

from fastapi import APIRouter, Depends

from ....application.commands import SeriesQuery
from ....core.constants import API_PREFIX
from ....core.enums import Grain
from ..container import Container, get_container
from ..responses import to_response

router = APIRouter(prefix=API_PREFIX, tags=["catalogue"])


@router.get("/regions", summary="Preset regions as GeoJSON")
def regions(c: Container = Depends(get_container)):
    return to_response(c.list_regions.execute())


@router.get("/datasets", summary="Datasets with role, version, agency and coverage")
def datasets(c: Container = Depends(get_container)):
    return to_response(c.list_datasets.execute())


@router.get("/variables", summary="Variables with units and categories")
def variables(c: Container = Depends(get_container)):
    return to_response(c.list_variables.execute())


@router.get("/series", summary="Stateless time series for charts")
def series(region: str = "sahel", variable: str = "rain_total", dataset: str = "auto", grain: Grain = Grain.SEASON,
           c: Container = Depends(get_container)):
    return to_response(c.get_series.execute(SeriesQuery(region, variable, dataset, grain)))


@router.get("/trends", summary="Precomputed 1998-2025 trends (regional comparison)")
def trends(variable: str | None = None, region: str | None = None, dataset: str | None = None, c: Container = Depends(get_container)):
    return to_response(c.list_trends.execute(variable, region, dataset))


@router.get("/mechanisms", summary="Layer 3 mechanism cards")
def mechanisms(c: Container = Depends(get_container)):
    return to_response(c.list_mechanisms.execute())


@router.get("/interventions", summary="Layer 5 interventions (qualitative)")
def interventions(c: Container = Depends(get_container)):
    return to_response(c.list_interventions.execute())


@router.get("/meta/build", summary="Warehouse build provenance")
def build(c: Container = Depends(get_container)):
    return to_response(c.build_info.execute())
