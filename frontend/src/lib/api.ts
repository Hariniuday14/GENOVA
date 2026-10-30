import type {
  AnalysisPayload,
  AnalysisResult,
  DemoDataset,
  EvaluationResponse,
  Health,
  InheritanceMode,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(message: string, status = 0, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function extractErrors(detail: unknown): { message: string; errors: string[] } {
  if (typeof detail === "string") {
    return { message: detail, errors: [] };
  }

  if (Array.isArray(detail)) {
    const errors = detail.map((item) => {
      const loc = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
      return loc ? `${loc}: ${item?.msg ?? "invalid value"}` : String(item?.msg ?? item);
    });
    return { message: "The request did not pass validation.", errors };
  }

  if (detail && typeof detail === "object") {
    const record = detail as { message?: string; errors?: unknown };
    return {
      message: record.message ?? "The request failed.",
      errors: Array.isArray(record.errors) ? record.errors.map(String) : [],
    };
  }

  return { message: "The request failed.", errors: [] };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the GENOVA API. Confirm the Python service is running on port 8000.",
      0,
    );
  }

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail: unknown }).detail
        : null;
    const { message, errors } = extractErrors(detail);
    const fallback =
      detail === null
        ? `The GENOVA API responded with HTTP ${response.status}. Confirm the Python service is running on port 8000.`
        : message;
    throw new ApiError(fallback, response.status, errors);
  }

  if (body === null) {
    throw new ApiError("The API returned an empty or non-JSON response.", response.status);
  }

  return body as T;
}

export const api = {
  health: () => request<Health>("/api/health"),

  demo: () => request<DemoDataset>("/api/demo"),

  analyse: (payload: AnalysisPayload) =>
    request<AnalysisResult>("/api/analysis", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  demoAnalysis: (mode?: InheritanceMode) =>
    request<AnalysisResult>(
      `/api/analysis/demo${mode ? `?inheritance_mode=${encodeURIComponent(mode)}` : ""}`,
      { method: "POST" },
    ),

  evaluation: (mode?: InheritanceMode) =>
    request<EvaluationResponse>(
      `/api/evaluation${mode ? `?inheritance_mode=${encodeURIComponent(mode)}` : ""}`,
    ),
};
