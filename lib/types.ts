export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface ItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  tokenType: string;
  user: { id: string; email: string; name?: string | null; role: string };
}

/** Registro de turismo.recursos (código MINCETUR o >= 900001 si es manual). */
export interface TouristPlace {
  id: number;
  name: string;
  slug: string | null;
  description?: string | null;
  categoryId?: number | null;
  category?: string | null;
  type?: string | null;
  hierarchy?: string | null;
  department: string;
  province: string;
  district: string;
  ubigeo?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  isPublished: boolean;
  latitude: number | null;
  longitude: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  source: "mincetur" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface Option<T = string> {
  id: T;
  name: string;
}

export interface PlaceOptions {
  categories: Option<number>[];
  departments: Option[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string | null;
  coverImage?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MutationResponse<T> extends ItemResponse<T> {
  warnings?: string[];
}

/** Registro de empresas.empresas. `id` llega como string (bigint). */
export interface Company {
  id: string;
  ruc: string;
  documentType: string;
  businessName: string;
  tradeName?: string | null;
  taxpayerStatus?: string | null;
  domicileCondition?: string | null;
  taxpayerType?: string | null;
  economicActivity?: string | null;
  ciiuCode?: string | null;
  registrationDate?: string | null;
  activityStartDate?: string | null;
  deregistrationDate?: string | null;
  companyUrl?: string | null;
  address?: string | null;
  ubigeo?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  representativeDni?: string | null;
  representativeFirstName?: string | null;
  representativeLastName1?: string | null;
  representativeLastName2?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive: boolean;
  source: "importado" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface CompanyOptions {
  taxpayerTypes: Option<number>[];
  domicileConditions: string[];
  departments: Option[];
}

export interface CiiuActivity {
  code: string;
  description: string;
}

/** Registro de museos.museos. */
export interface Museum {
  id: number;
  slug: string;
  name: string;
  category?: string | null;
  museumType?: string | null;
  administration?: string | null;
  status?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  ubigeo?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string | null;
  feesDescription?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  virtualTourUrl?: string | null;
  virtualCollectionUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  coverImage?: string | null;
  cardImage?: string | null;
  description?: string | null;
  isActive: boolean;
  source: "importado" | "manual";
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MuseumOptions {
  categories: string[];
  museumTypes: string[];
  administrations: string[];
  statuses: string[];
  departments: Option[];
}
