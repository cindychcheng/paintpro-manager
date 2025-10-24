import { useState, useEffect, useCallback } from 'react';
import { apiService, Invoice, ConvertEstimateRequest, RecordPaymentRequest } from '../services/api';

export const useInvoices = (filters?: {
  page?: number;
  limit?: number;
  client_id?: number;
  status?: string;
  search?: string;
  overdue?: boolean;
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getInvoices(filters);
      
      if (response.success && response.data) {
        setInvoices(response.data.data);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        throw new Error(response.error || 'Failed to fetch invoices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.page, filters?.limit, filters?.client_id, filters?.status, filters?.search, filters?.overdue]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const convertEstimateToInvoice = async (
    estimateId: number, 
    data: ConvertEstimateRequest
  ): Promise<boolean> => {
    try {
      const response = await apiService.convertEstimateToInvoice(estimateId, data);
      if (response.success) {
        await fetchInvoices(); // Refresh the list
        return true;
      } else {
        const errorMsg = (response as any).details || response.error || 'Failed to convert estimate to invoice';
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to convert estimate to invoice';
      console.error('Convert estimate error:', errorMsg, err);
      setError(errorMsg);
      return false;
    }
  };

  const updateInvoiceStatus = async (
    id: number, 
    status: Invoice['status']
  ): Promise<boolean> => {
    try {
      const response = await apiService.updateInvoiceStatus(id, status);
      if (response.success) {
        await fetchInvoices(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to update invoice status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice status');
      return false;
    }
  };

  const recordPayment = async (
    invoiceId: number,
    paymentData: RecordPaymentRequest
  ): Promise<boolean> => {
    try {
      const response = await apiService.recordPayment(invoiceId, paymentData);
      if (response.success) {
        await fetchInvoices(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to record payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
      return false;
    }
  };

  const voidInvoice = async (
    invoiceId: number,
    void_reason: string
  ): Promise<boolean> => {
    try {
      const response = await apiService.voidInvoice(invoiceId, void_reason);
      if (response.success) {
        await fetchInvoices(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to void invoice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void invoice');
      return false;
    }
  };

  return {
    invoices,
    loading,
    error,
    total,
    totalPages,
    refetch: fetchInvoices,
    convertEstimateToInvoice,
    updateInvoiceStatus,
    recordPayment,
    voidInvoice,
  };
};

export const useInvoice = (id: number | null) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getInvoice(id);
      
      if (response.success && response.data) {
        setInvoice(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch invoice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoice,
  };
};