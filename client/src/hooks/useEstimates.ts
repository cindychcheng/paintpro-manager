import { useState, useEffect, useCallback } from 'react';
import { apiService, Estimate, CreateEstimateRequest } from '../services/api';

export const useEstimates = (filters?: {
  page?: number;
  limit?: number;
  client_id?: number;
  status?: string;
  search?: string;
}) => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getEstimates(filters);
      
      if (response.success && response.data) {
        setEstimates(response.data.data);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        throw new Error(response.error || 'Failed to fetch estimates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.page, filters?.limit, filters?.client_id, filters?.status, filters?.search]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const createEstimate = async (estimateData: CreateEstimateRequest): Promise<boolean> => {
    try {
      const response = await apiService.createEstimate(estimateData);
      if (response.success) {
        await fetchEstimates(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to create estimate');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create estimate');
      return false;
    }
  };

  const updateEstimateStatus = async (
    id: number, 
    status: Estimate['status'], 
    notes?: string
  ): Promise<boolean> => {
    try {
      const response = await apiService.updateEstimateStatus(id, status, notes);
      if (response.success) {
        await fetchEstimates(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to update estimate status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update estimate status');
      return false;
    }
  };

  const deleteEstimate = async (id: number): Promise<boolean> => {
    try {
      const response = await apiService.deleteEstimate(id);
      if (response.success) {
        await fetchEstimates(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete estimate');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete estimate');
      return false;
    }
  };

  return {
    estimates,
    loading,
    error,
    total,
    totalPages,
    refetch: fetchEstimates,
    createEstimate,
    updateEstimateStatus,
    deleteEstimate,
  };
};

export const useEstimate = (id: number | null) => {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getEstimate(id);
      
      if (response.success && response.data) {
        setEstimate(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch estimate');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [id]);

  return {
    estimate,
    loading,
    error,
    refetch: fetchEstimate,
  };
};