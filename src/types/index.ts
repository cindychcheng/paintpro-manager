// Database entity types
export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: number;
  estimate_number: string;
  client_id: number;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
  total_amount: number;
  labor_cost: number;
  material_cost: number;
  markup_percentage: number;
  valid_until?: string;
  revision_number: number;
  parent_estimate_id?: number;
  created_at: string;
  updated_at: string;
  // Populated fields
  client?: Client;
  project_areas?: ProjectArea[];
  communications?: Communication[];
}

export interface Invoice {
  id: number;
  invoice_number: string;
  estimate_id?: number;
  client_id: number;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  due_date?: string;
  payment_terms: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  client?: Client;
  estimate?: Estimate;
  project_areas?: ProjectArea[];
  payments?: Payment[];
  communications?: Communication[];
}

export interface ProjectArea {
  id: number;
  estimate_id?: number;
  invoice_id?: number;
  area_name: string;
  area_type: 'indoor' | 'outdoor';
  surface_type?: string;
  square_footage?: number;
  ceiling_height?: number;
  prep_requirements?: string;
  paint_type?: string;
  paint_brand?: string;
  paint_color?: string;
  finish_type?: string;
  number_of_coats: number;
  labor_hours?: number;
  labor_rate?: number;
  material_cost?: number;
  notes?: string;
  created_at: string;
  // Populated fields
  quality_checkpoints?: QualityCheckpoint[];
  photos?: Photo[];
}

export interface QualityCheckpoint {
  id: number;
  project_area_id: number;
  checkpoint_type: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  inspector_name?: string;
  completion_date?: string;
  temperature?: number;
  humidity?: number;
  notes?: string;
  created_at: string;
  // Populated fields
  photos?: Photo[];
}

export interface Photo {
  id: number;
  project_area_id?: number;
  quality_checkpoint_id?: number;
  client_id?: number;
  photo_type: 'before' | 'during' | 'after' | 'damage' | 'color_sample';
  file_path: string;
  file_name: string;
  description?: string;
  taken_at: string;
}

export interface Communication {
  id: number;
  client_id: number;
  estimate_id?: number;
  invoice_id?: number;
  communication_type: 'email' | 'phone' | 'text' | 'in_person';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  template_type: 'estimate_sent' | 'project_start' | 'project_complete' | 'payment_reminder' | 'follow_up' | 'maintenance_reminder';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaintLibrary {
  id: number;
  brand: string;
  product_line?: string;
  color_name?: string;
  color_code?: string;
  finish_type?: string;
  coverage_per_gallon?: number;
  price_per_gallon?: number;
  voc_rating?: string;
  primer_required: boolean;
  surface_types?: string[]; // JSON array
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method?: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface NumberSequence {
  id: number;
  sequence_type: string;
  current_number: number;
  prefix?: string;
  format?: string;
}

// API Request/Response types
export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
}

export interface CreateEstimateRequest {
  client_id: number;
  title: string;
  description?: string;
  valid_until?: string;
  markup_percentage?: number;
  project_areas: Omit<ProjectArea, 'id' | 'created_at' | 'estimate_id' | 'invoice_id'>[];
}

export interface CreateInvoiceRequest {
  estimate_id?: number;
  client_id: number;
  title: string;
  description?: string;
  due_date?: string;
  payment_terms?: string;
  project_areas?: Omit<ProjectArea, 'id' | 'created_at' | 'estimate_id' | 'invoice_id'>[];
}

export interface UpdateEstimateStatusRequest {
  status: Estimate['status'];
  notes?: string;
}

export interface RecordPaymentRequest {
  invoice_id: number;
  amount: number;
  payment_method?: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export interface SendCommunicationRequest {
  client_id: number;
  estimate_id?: number;
  invoice_id?: number;
  communication_type: Communication['communication_type'];
  subject?: string;
  content: string;
  scheduled_for?: string;
}

export interface QualityCheckpointRequest {
  project_area_id: number;
  checkpoint_type: string;
  description?: string;
  temperature?: number;
  humidity?: number;
  notes?: string;
}

// Utility types for forms and API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EstimateWithDetails extends Estimate {
  client: Client;
  project_areas: (ProjectArea & {
    quality_checkpoints: QualityCheckpoint[];
    photos: Photo[];
  })[];
}

export interface InvoiceWithDetails extends Invoice {
  client: Client;
  estimate?: Estimate;
  project_areas: (ProjectArea & {
    quality_checkpoints: QualityCheckpoint[];
    photos: Photo[];
  })[];
  payments: Payment[];
}

// Search and filter types
export interface ClientFilters {
  search?: string;
  city?: string;
  state?: string;
}

export interface EstimateFilters {
  client_id?: number;
  status?: Estimate['status'];
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface InvoiceFilters {
  client_id?: number;
  status?: Invoice['status'];
  overdue?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Dashboard and reporting types
export interface DashboardStats {
  total_estimates: number;
  pending_estimates: number;
  approved_estimates: number;
  total_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_revenue: number;
  outstanding_amount: number;
  recent_activities: RecentActivity[];
}

export interface RecentActivity {
  id: number;
  type: 'estimate_created' | 'estimate_approved' | 'invoice_sent' | 'payment_received' | 'communication_sent';
  title: string;
  description: string;
  date: string;
  client_name?: string;
  amount?: number;
}

export interface RevenueReport {
  period: string;
  indoor_revenue: number;
  outdoor_revenue: number;
  total_revenue: number;
  labor_cost: number;
  material_cost: number;
  profit_margin: number;
}

export interface ProjectTypeReport {
  project_type: string;
  count: number;
  total_revenue: number;
  average_project_value: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
}