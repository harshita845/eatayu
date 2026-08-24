import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@food/components/ui/card';
import { Input } from '@food/components/ui/input';
import { Button } from '@food/components/ui/button';
import { Layers, ArrowLeft, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

export default function MultiorderSetting() {
    const navigate = useNavigate();
    const [limit, setLimit] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await adminAPI.getBusinessSettings();
                if (response.data?.success) {
                    setLimit(response.data.data.deliveryBoyOrderLimit?.toString() || '1');
                }
            } catch (error) {
                console.error("Error fetching settings", error);
                toast.error("Failed to load multiorder setting");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        const numLimit = parseInt(limit, 10);
        if (isNaN(numLimit) || numLimit < 1 || numLimit > 5) {
            toast.error("Order limit must be between 1 and 5");
            return;
        }
        
        setSaving(true);
        try {
            const res = await adminAPI.updateBusinessSettings({
                deliveryBoyOrderLimit: numLimit
            });
            if (res.data?.success) {
                toast.success('Multiorder setting updated successfully');
            } else {
                toast.error(res.data?.message || 'Update failed');
            }
        } catch (error) {
            console.error("Error updating", error);
            toast.error('Failed to update multiorder setting');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="h-10 w-10 rounded-full"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <Layers className="w-6 h-6 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-800">Multiorder Setting</h1>
            </div>
            
            <p className="text-gray-600 mb-6">
                Configure how many orders a delivery partner can handle at the same time. This is a <strong>global setting</strong> and applies to all delivery partners.
            </p>

            <Card className="border-blue-100 bg-blue-50/30">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Layers className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-gray-800">Delivery Boy Order Limit</CardTitle>
                            <p className="text-sm text-blue-600">Global setting - applies to all delivery partners</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                        Maximum number of orders a delivery partner can accept and work on at the same time. Allowed range is <strong>1 to 5</strong>.
                    </p>
                    
                    {loading ? (
                        <div className="flex items-center text-sm text-gray-500 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading current setting...
                        </div>
                    ) : (
                        <div className="flex items-end gap-4 max-w-md">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                    Order limit per delivery boy
                                </label>
                                <Input 
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={limit}
                                    onChange={(e) => setLimit(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <Button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="bg-blue-500 hover:bg-blue-600 text-white min-w-[100px]"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
