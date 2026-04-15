// Re-export Prisma enums for use throughout the app
export type {
  UserRole,
  UserStatus,
  ClientStatus,
  RegimeTributario,
  CriticalityLevel,
} from "@/lib/generated/prisma/client";

// ── API response shapes ───────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Auth ──────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "collaborator";
  avatarUrl?: string | null;
}

// ── Client views ──────────────────────────────────────────────

export interface ClientListItem {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpjCpf: string;
  regimeTributario: string;
  status: string;
  particularidadesCount: number;
  criticasCount: number;
}

// ── Particularidade views ─────────────────────────────────────

export interface ParticularidadeListItem {
  id: string;
  title: string;
  criticality: string;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  createdByUser: { id: string; name: string };
  updatedByUser: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalParticularidades: number;
  criticasCount: number;
  atencaoCount: number;
  expiringCount: number;
  bySector: Array<{ sectorName: string; count: number; color: string }>;
}
