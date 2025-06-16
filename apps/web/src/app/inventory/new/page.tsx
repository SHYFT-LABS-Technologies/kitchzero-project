'use client';

import AppLayout from '@/components/layout/app-layout';
import { InventoryForm } from '@/components/forms/inventory-form';

export default function NewInventoryPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <InventoryForm />
      </div>
    </AppLayout>
  );
}