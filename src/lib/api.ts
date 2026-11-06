import type {
  AlgoId,
  CompareData,
  ExperimentConfigInput,
  ExperimentDef,
  ExperimentRun,
  PresetDetail,
  PresetSummary,
  SearchResultData,
  ValidateResponse,
  WireWarehouse,
} from "./types";

export class ApiClientError extends Error {
  status: number;
  details: string[];
  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiClientError(0, "Cannot reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(res.status, data?.error?.message ?? `Request failed (${res.status})`, data?.error?.details ?? []);
  }
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  presets: () => request<{ presets: PresetSummary[] }>("/api/warehouses/presets").then((r) => r.presets),
  preset: (id: string) => request<PresetDetail>(`/api/warehouses/presets/${encodeURIComponent(id)}`),
  validate: (warehouse: WireWarehouse) => request<ValidateResponse>("/api/warehouses/validate", post({ warehouse })),
  search: (algorithm: AlgoId, warehouse: WireWarehouse) => request<SearchResultData>("/api/search", post({ algorithm, warehouse })),
  compare: (warehouse: WireWarehouse) => request<CompareData>("/api/search/compare", post({ warehouse })),
  experimentDefs: () => request<{ experiments: ExperimentDef[] }>("/api/experiments/definitions").then((r) => r.experiments),
  runExperiment: (cfg: ExperimentConfigInput) => request<ExperimentRun>("/api/experiments/run", post(cfg)),
};
