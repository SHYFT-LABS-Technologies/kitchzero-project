'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/app-layout';
import { InventoryForm } from '@/components/forms/inventory-form';

export default function EditInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/inventory/${id}`);
      
      if (response.success) {
        const item = response.data;
        setInitialData({
          name: item.name,
          category: item.category,
          quantity: item.quantity.toString(),
          unit: item.unit,
          cost: item.cost.toString(),
          supplier: item.supplier || '',
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
          location: item.location || '',
          notes: item.notes || ''
        });
      } else {
        toast.error('Failed to load inventory item');
        router.push('/inventory');
      }
    } catch (error) {
      console.error('Fetch item error:', error);
      toast.error('Failed to load inventory item');
      router.push('/inventory');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!initialData) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Item not found</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <InventoryForm
          initialData={initialData}
          isEditing={true}
          itemId={id}
        />
      </div>
    </AppLayout>
  );
}