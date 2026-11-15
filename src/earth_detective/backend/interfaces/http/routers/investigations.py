from __future__ import annotations

import hmac

from fastapi import APIRouter, Depends, Header

from ....core.constants import API_KEY_HEADER, API_PREFIX
from ....core.settings import Settings, get_settings
from ....domain.result import AppError
from ..container import Container, get_container
from ..dto import DetectDTO, ExplainDTO, InvestigateDTO, InvestigationCreateDTO, NarrativeDTO, ProjectDTO, SolveDTO
from ..responses import ApiError, to_response, to_text

router = APIRouter(prefix=f"{API_PREFIX}/investigations", tags=["investigations"])


def require_team_key(x_api_key: str | None = Header(None, alias=API_KEY_HEADER),
                     settings: Settings = Depends(get_settings)) -> None:
    """Expert-only endpoints: when TEAM_API_KEY is set, the X-API-Key header must match (constant-time compare)."""
    expected = settings.team_api_key
    if expected is None:
        return
    if x_api_key is None or not hmac.compare_digest(x_api_key.encode(), expected.encode()):
        raise ApiError(AppError.unauthorized(f"this endpoint needs a valid {API_KEY_HEADER} header"),
                       headers={"WWW-Authenticate": "ApiKey"})


@router.post("", status_code=201, summary="Create an investigation (global inputs)")
def create(body: InvestigationCreateDTO, c: Container = Depends(get_container)):
    return to_response(c.create_investigation.execute(body.to_command()), status_code=201)


@router.get("", summary="List investigations")
def list_all(c: Container = Depends(get_container)):
    return to_response(c.list_investigations.execute())


@router.get("/{inv_id}", summary="Full investigation document")
def get_one(inv_id: str, c: Container = Depends(get_container)):
    return to_response(c.get_investigation.execute(inv_id))


@router.post("/{inv_id}/detect", tags=["layer 1: detect"], summary="Trend detection")
def detect(inv_id: str, body: DetectDTO, c: Container = Depends(get_container)):
    return to_response(c.detect.execute(body.to_command(inv_id)))


@router.post("/{inv_id}/investigate", tags=["layer 2: investigate"], summary="Supporting evidence")
def investigate(inv_id: str, body: InvestigateDTO, c: Container = Depends(get_container)):
    return to_response(c.investigate.execute(body.to_command(inv_id)))


@router.post("/{inv_id}/explain", tags=["layer 3: explain"], summary="Confirm a mechanism assessment (team key when set)",
             dependencies=[Depends(require_team_key)])
def explain(inv_id: str, body: ExplainDTO, c: Container = Depends(get_container)):
    return to_response(c.explain.execute(body.to_command(inv_id)))


@router.post("/{inv_id}/project", tags=["layer 4: project"], summary="Scenarios (not forecasts)")
def project(inv_id: str, body: ProjectDTO, c: Container = Depends(get_container)):
    return to_response(c.project.execute(body.to_command(inv_id)))


@router.post("/{inv_id}/solve", tags=["layer 5: solve"], summary="Intervention comparison")
def solve(inv_id: str, body: SolveDTO, c: Container = Depends(get_container)):
    return to_response(c.solve.execute(body.to_command(inv_id)))


@router.post("/{inv_id}/narrative", tags=["report"], summary="AI narrative (LLM over the warehouse, numbers verified)")
def narrative(inv_id: str, body: NarrativeDTO, c: Container = Depends(get_container)):
    return to_response(c.narrative.execute(body.to_command(inv_id)))


@router.get("/{inv_id}/report.json", tags=["report"], summary="Scientific investigation report")
def report_json(inv_id: str, c: Container = Depends(get_container)):
    return to_response(c.report.execute(inv_id))


@router.get("/{inv_id}/report.csv", tags=["report"], summary="Time series and trends as CSV")
def report_csv(inv_id: str, c: Container = Depends(get_container)):
    return to_text(c.report_csv.execute(inv_id))
