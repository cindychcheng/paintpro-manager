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
  const [totalPages, setTotalPages] = useState(0);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getClients(filters);
      
      if (response.success && response.data) {
        setClients(response.data.data);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
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

  const updateClient = async (id: number, clientData: Omit<Client, 'id'>): Promise<boolean> => {
    try {
      const response = await apiService.updateClient(id, clientData);
      if (response.success) {
        await fetchClients(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to update client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
      return false;
    }
  };

  const deleteClient = async (id: number): Promise<boolean> => {
    try {
      const response = await apiService.deleteClient(id);
      if (response.success) {
        await fetchClients(); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
      return false;
    }
  };

  const getClient = async (id: number): Promise<Client | null> => {
    try {
      const response = await apiService.getClient(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get client');
      return null;
    }
  };

  return {
    clients,
    loading,
    error,
    total,
    totalPages,
    refetch: fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClient,
  };
};