import { useState, useEffect } from 'react';
import { apiService, Client } from '../services/api';

export const useClients = (filters?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getClients(filters);
      
      if (response.success && response.data) {
        setClients(response.data.data);
        setTotal(response.data.total);
      } else {
        throw new Error(response.error || 'Failed to fetch clients');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [filters?.page, filters?.limit, filters?.search]);

  const createClient = async (clientData: Omit<Client, 'id'>): Promise<boolean> => {
    try {
      const response = await apiService.createClient(clientData);
      if (response.success) {
        await fetchClients(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to create client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
      return false;
    }
  };

  return {
    clients,
    loading,
    error,
    total,
    refetch: fetchClients,
    createClient,
  };
};