const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5001/api';

// Types
export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  job_address?: string;
  job_city?: string;
  job_state?: string;
  job_zip_code?: string;
  notes?: string;
}

export interface ProjectArea {
  id?: number;
  area_name: string;
  area_type: 'indoor' | 'outdoor';
  surface_type: string;
  square_footage?: number;
  ceiling_height?: number;
  prep_requirements: string;
  paint_type: string;
  paint_brand: string;
  paint_color: string;
  finish_type: string;
  number_of_coats: number;
  labor_cost: number;
  material_cost: number;
  notes?: string;
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
  terms_and_notes?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_zip_code?: string;
  job_address?: string;
  job_city?: string;
  job_state?: string;
  job_zip_code?: string;
  project_areas?: ProjectArea[];
}

export interface CreateEstimateRequest {
  client_id: number;
  title: string;
  description?: string;
  valid_until?: string;
  markup_percentage?: number;
  terms_and_notes?: string;
  project_areas: Omit<ProjectArea, 'id'>[];
  parent_estimate_id?: number;
  revision_number?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string | null;
  estimate_id?: number;
  client_id: number;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';
  total_amount: number;
  paid_amount: number;
  due_date?: string;
  payment_terms: string;
  terms_and_notes?: string;
  voided_at?: string;
  void_reason?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_zip_code?: string;
  job_address?: string;
  job_city?: string;
  job_state?: string;
  job_zip_code?: string;
  estimate_number?: string;
  outstanding_amount?: number;
  project_areas?: ProjectArea[];
  payments?: Payment[];
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

export interface ConvertEstimateRequest {
  due_date?: string;
  payment_terms?: string;
}

export interface RecordPaymentRequest {
  amount: number;
  payment_method?: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

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

// API Functions
class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        // Add auth header when needed
        // 'Authorization': `Bearer ${token}`
      },
      ...options,
    };

    try {
      console.log('API Request:', { url, method: config.method || 'GET', body: options.body });
      const response = await fetch(url, config);
      const data = await response.json();
      
      console.log('API Response:', { status: response.status, data });

      if (!response.ok) {
        const errorMsg = data.details || data.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Client APIs
  async getClients(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Client>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    return this.request(`/clients${queryString ? `?${queryString}` : ''}`);
  }

  async createClient(clientData: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  async getClient(id: number): Promise<ApiResponse<Client>> {
    return this.request(`/clients/${id}`);
  }

  async updateClient(id: number, clientData: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  async deleteClient(id: number): Promise<ApiResponse> {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Estimate APIs
  async getEstimates(params?: {
    page?: number;
    limit?: number;
    client_id?: number;
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<PaginatedResponse<Estimate>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.client_id) searchParams.append('client_id', params.client_id.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    
    const queryString = searchParams.toString();
    return this.request(`/estimates${queryString ? `?${queryString}` : ''}`);
  }

  async getEstimate(id: number): Promise<ApiResponse<Estimate>> {
    return this.request(`/estimates/${id}`);
  }

  async createEstimate(estimateData: CreateEstimateRequest): Promise<ApiResponse<Estimate>> {
    return this.request('/estimates', {
      method: 'POST',
      body: JSON.stringify(estimateData),
    });
  }

  async updateEstimateStatus(
    id: number, 
    status: Estimate['status'], 
    notes?: string
  ): Promise<ApiResponse<Estimate>> {
    return this.request(`/estimates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async createEstimateRevision(id: number, revisionData: any): Promise<ApiResponse<Estimate>> {
    return this.request(`/estimates/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify(revisionData),
    });
  }

  async deleteEstimate(id: number): Promise<ApiResponse> {
    return this.request(`/estimates/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoice APIs
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    client_id?: number;
    status?: string;
    search?: string;
    overdue?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<Invoice>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.client_id) searchParams.append('client_id', params.client_id.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.overdue) searchParams.append('overdue', 'true');
    
    const queryString = searchParams.toString();
    return this.request(`/invoices${queryString ? `?${queryString}` : ''}`);
  }

  async getInvoice(id: number): Promise<ApiResponse<Invoice>> {
    return this.request(`/invoices/${id}`);
  }

  async convertEstimateToInvoice(
    estimateId: number, 
    data: ConvertEstimateRequest
  ): Promise<ApiResponse<Invoice>> {
    return this.request(`/estimates/${estimateId}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoiceStatus(
    id: number,
    status: Invoice['status']
  ): Promise<ApiResponse<Invoice>> {
    return this.request(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async voidInvoice(
    id: number,
    void_reason: string
  ): Promise<ApiResponse<Invoice>> {
    return this.request(`/invoices/${id}/void`, {
      method: 'PATCH',
      body: JSON.stringify({ void_reason }),
    });
  }

  async recordPayment(
    invoiceId: number,
    paymentData: RecordPaymentRequest
  ): Promise<ApiResponse<Invoice>> {
    return this.request(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getInvoicePayments(invoiceId: number): Promise<ApiResponse<Payment[]>> {
    return this.request(`/invoices/${invoiceId}/payments`);
  }

  async updatePayment(
    paymentId: number,
    paymentData: Partial<RecordPaymentRequest>
  ): Promise<ApiResponse<Payment>> {
    return this.request(`/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    });
  }

  async deletePayment(paymentId: number): Promise<ApiResponse> {
    return this.request(`/payments/${paymentId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
export default apiService;