import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api import app


DATA_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "synthetic"
    / "demo_family.json"
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def demo_payload():
    with DATA_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def test_health_endpoint_reports_service_ready(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["demo_available"] is True


def test_demo_endpoint_returns_synthetic_dataset(client):
    response = client.get("/api/demo")

    assert response.status_code == 200
    data = response.json()
    assert data["is_synthetic"] is True
    assert len(data["family"]) == 6
    assert len(data["variants"]) == 4


def test_demo_analysis_endpoint_returns_rankings(client):
    response = client.post("/api/analysis/demo")

    assert response.status_code == 200
    data = response.json()
    assert data["dataset_kind"] == "synthetic_demo"
    assert len(data["results"]) == 4
    assert data["summary"]["variants_analysed"] == 4


def test_custom_analysis_endpoint_accepts_valid_payload(client, demo_payload):
    payload = {
        **demo_payload,
        "label": "API integration test",
        "source": "automated_test",
    }

    response = client.post("/api/analysis", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "API integration test"
    assert data["dataset_kind"] == "custom"
    assert len(data["results"]) == 4


def test_validate_endpoint_accepts_valid_dataset(client, demo_payload):
    response = client.post("/api/validate", json=demo_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["errors"] == []


def test_validate_endpoint_rejects_unknown_genotype_member(client, demo_payload):
    payload = json.loads(json.dumps(demo_payload))
    payload["variants"][0]["genotypes"]["UNKNOWN-MEMBER"] = "HET"

    response = client.post("/api/validate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert data["errors"]


def test_evaluation_endpoint_returns_labelled_case(client):
    response = client.get("/api/evaluation")

    assert response.status_code == 200
    data = response.json()
    assert data["number_of_cases"] == 1
    assert data["labelled_target_variant_id"] == "SYN-V001"
    assert data["rankings"]
    assert data["baseline_rankings"]
