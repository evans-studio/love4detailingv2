'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, Button, Input } from '@/components/ui';
import { LoadingState } from '@/components/ui/loadingState';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  DollarSign, 
  Car, 
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Edit
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface VehicleSize {
  id: string;
  label: string;
  description: string;
  price_pence: number;
  order_index: number;
  is_active: boolean;
}

interface ServiceAddon {
  id: string;
  name: string;
  description: string;
  price_pence: number;
  is_active: boolean;
}

const vehicleSizeSchema = z.object({
  sizes: z.array(z.object({
    id: z.string(),
    label: z.string().min(1, 'Label is required'),
    description: z.string().min(1, 'Description is required'),
    price_pence: z.number().min(0, 'Price must be positive'),
    order_index: z.number().min(0),
    is_active: z.boolean(),
  }))
});

const addonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price_pence: z.number().min(0, 'Price must be positive'),
  is_active: z.boolean().default(true),
});

type VehicleSizeFormData = z.infer<typeof vehicleSizeSchema>;
type AddonFormData = z.infer<typeof addonSchema>;

export default function PricingManagement() {
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSize[]>([]);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const supabase = createClientComponentClient();

  const sizeForm = useForm<VehicleSizeFormData>({
    resolver: zodResolver(vehicleSizeSchema),
  });

  const addonForm = useForm<AddonFormData>({
    resolver: zodResolver(addonSchema),
    defaultValues: {
      is_active: true,
    }
  });

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      // Fetch vehicle sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from('vehicle_sizes')
        .select('*')
        .order('order_index');

      if (sizesError) throw sizesError;

      // Try to fetch service addons - table might not exist yet
      let addonsData: ServiceAddon[] = [];
      try {
        const { data, error } = await supabase
          .from('service_addons')
          .select('*')
          .order('name');
        
        if (!error && data) {
          addonsData = data;
        }
      } catch (error) {
        // Service addons table doesn't exist yet - that's okay
        console.log('Service addons table not available yet');
      }

      setVehicleSizes(sizesData || []);
      setAddons(addonsData);
      
      // Set form values for vehicle sizes
      sizeForm.setValue('sizes', sizesData || []);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveVehicleSizes = async (data: VehicleSizeFormData) => {
    setSaving(true);
    try {
      // Update each vehicle size
      for (const size of data.sizes) {
        const { error } = await supabase
          .from('vehicle_sizes')
          .update({
            label: size.label,
            description: size.description,
            price_pence: size.price_pence,
            order_index: size.order_index,
            is_active: size.is_active,
          })
          .eq('id', size.id);
        
        if (error) throw error;
      }

      await fetchPricingData();
      alert('Vehicle size pricing updated successfully!');
    } catch (error) {
      console.error('Error saving vehicle sizes:', error);
      alert('Failed to update pricing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSizePrice = (index: number, field: string, value: any) => {
    const currentSizes = sizeForm.getValues('sizes');
    const updatedSizes = [...currentSizes];
    
    if (field === 'price_pounds') {
      updatedSizes[index] = { 
        ...updatedSizes[index], 
        price_pence: Math.round(parseFloat(value || '0') * 100)
      };
    } else {
      updatedSizes[index] = { ...updatedSizes[index], [field]: value };
    }
    
    sizeForm.setValue('sizes', updatedSizes);
  };

  const addOrUpdateAddon = async (data: AddonFormData) => {
    try {
      const addonData = {
        ...data,
        price_pence: Math.round(data.price_pence)
      };

      if (editingAddon) {
        // Update existing addon
        const { error } = await supabase
          .from('service_addons')
          .update(addonData)
          .eq('id', editingAddon.id);
        
        if (error) throw error;
      } else {
        // Add new addon
        const { error } = await supabase
          .from('service_addons')
          .insert([addonData]);
        
        if (error) throw error;
      }

      await fetchPricingData();
      setShowAddonForm(false);
      setEditingAddon(null);
      addonForm.reset();
      alert(editingAddon ? 'Add-on updated successfully!' : 'Add-on added successfully!');
    } catch (error) {
      console.error('Error saving add-on:', error);
      alert('Failed to save add-on. Please try again.');
    }
  };

  const deleteAddon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) return;

    try {
      const { error } = await supabase
        .from('service_addons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchPricingData();
      alert('Add-on deleted successfully!');
    } catch (error) {
      console.error('Error deleting add-on:', error);
      alert('Failed to delete add-on. Please try again.');
    }
  };

  const startEditAddon = (addon: ServiceAddon) => {
    setEditingAddon(addon);
    addonForm.setValue('name', addon.name);
    addonForm.setValue('description', addon.description);
    addonForm.setValue('price_pence', addon.price_pence);
    addonForm.setValue('is_active', addon.is_active);
    setShowAddonForm(true);
  };

  const cancelAddonForm = () => {
    setShowAddonForm(false);
    setEditingAddon(null);
    addonForm.reset();
  };

  if (loading) {
    return <LoadingState>Loading pricing settings...</LoadingState>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#F2F2F2]">Pricing Management</h1>
        <p className="text-[#C7C7C7] mt-1">
          Configure vehicle size pricing and service add-ons
        </p>
      </div>

      {/* Vehicle Size Pricing */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#F2F2F2]">Vehicle Size Pricing</h2>
            <p className="text-[#C7C7C7] mt-1">Set base prices for different vehicle sizes</p>
          </div>
          <Button 
            onClick={sizeForm.handleSubmit(saveVehicleSizes)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Pricing'}
          </Button>
        </div>

        <div className="space-y-4">
          {vehicleSizes.map((size, index) => (
            <div key={size.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
                    Label
                  </label>
                  <Input
                    value={sizeForm.watch('sizes')?.[index]?.label || ''}
                    onChange={(e) => updateSizePrice(index, 'label', e.target.value)}
                    placeholder="e.g., Small Car"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
                    Description
                  </label>
                  <Input
                    value={sizeForm.watch('sizes')?.[index]?.description || ''}
                    onChange={(e) => updateSizePrice(index, 'description', e.target.value)}
                    placeholder="e.g., Hatchback, Small SUV"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
                    Price (£)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(sizeForm.watch('sizes')?.[index]?.price_pence || 0) / 100}
                      onChange={(e) => updateSizePrice(index, 'price_pounds', e.target.value)}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={sizeForm.watch('sizes')?.[index]?.is_active || false}
                      onChange={(e) => updateSizePrice(index, 'is_active', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-[#C7C7C7]">Active</span>
                  </div>
                  <div className="text-sm text-[#8B8B8B]">
                    {formatCurrency((sizeForm.watch('sizes')?.[index]?.price_pence || 0) / 100)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Service Add-ons */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#F2F2F2]">Service Add-ons</h2>
            <p className="text-[#C7C7C7] mt-1">Manage additional services and their pricing</p>
          </div>
          <Button onClick={() => setShowAddonForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Add-on Form */}
        {showAddonForm && (
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-[#F2F2F2] mb-4">
              {editingAddon ? 'Edit Service Add-on' : 'Add New Service Add-on'}
            </h3>
            <form onSubmit={addonForm.handleSubmit(addOrUpdateAddon)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
                    Service Name
                  </label>
                  <Input
                    placeholder="e.g., Pet Hair Removal"
                    {...addonForm.register('name')}
                    className={addonForm.formState.errors.name ? 'border-red-500' : ''}
                  />
                  {addonForm.formState.errors.name && (
                    <p className="text-red-600 text-sm mt-1">
                      {addonForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
                    Description
                  </label>
                  <Input
                    placeholder="e.g., Deep cleaning for pet hair"
                    {...addonForm.register('description')}
                    className={addonForm.formState.errors.description ? 'border-red-500' : ''}
                  />
                  {addonForm.formState.errors.description && (
                    <p className="text-red-600 text-sm mt-1">
                      {addonForm.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
                    Price (£)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={`pl-10 ${addonForm.formState.errors.price_pence ? 'border-red-500' : ''}`}
                      {...addonForm.register('price_pence', {
                        setValueAs: (value) => Math.round(parseFloat(value || '0') * 100),
                      })}
                    />
                  </div>
                  {addonForm.formState.errors.price_pence && (
                    <p className="text-red-600 text-sm mt-1">
                      {addonForm.formState.errors.price_pence.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...addonForm.register('is_active')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-[#C7C7C7]">Service is active and available to customers</span>
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingAddon ? 'Update Service' : 'Add Service'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelAddonForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Add-ons List */}
        {addons.length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-[#8B8B8B]">No service add-ons configured</p>
            <p className="text-gray-400 text-sm">Add services like wax protection or pet hair removal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map((addon) => (
              <div key={addon.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-medium text-[#F2F2F2]">{addon.name}</div>
                      <div className="text-sm text-[#C7C7C7]">{addon.description}</div>
                    </div>
                    {!addon.is_active && (
                      <span className="px-2 py-1 bg-gray-200 text-[#C7C7C7] text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium text-[#F2F2F2]">
                      {formatCurrency(addon.price_pence / 100)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEditAddon(addon)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteAddon(addon.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Pricing Update Notice</p>
            <p className="text-amber-700 mt-1">
              Price changes will apply to new bookings immediately. Existing bookings will retain their original pricing.
              Always test pricing changes carefully before implementing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}