import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@food/components/ui/dialog';
import { Button } from '@food/components/ui/button';
import { Label } from '@food/components/ui/label';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AssignRiderModal({ isOpen, onClose, orderId, onAssignSuccess }) {
    const [riders, setRiders] = useState([]);
    const [selectedRider, setSelectedRider] = useState('');
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRiders();
        }
    }, [isOpen]);

    const fetchRiders = async () => {
        setLoading(true);
        try {
            // Assume we can fetch all active riders from this API
            const res = await adminAPI.getDeliveryPartners({ isActive: true });
            if (res.data?.success) {
                setRiders(res.data.data?.docs || res.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching riders:", error);
            toast.error("Failed to load delivery partners");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedRider) {
            toast.error("Please select a delivery partner");
            return;
        }

        setAssigning(true);
        try {
            const res = await adminAPI.adminForceAssignOrder(orderId, { deliveryPartnerId: selectedRider });
            if (res.data?.success) {
                toast.success("Rider assigned successfully");
                onAssignSuccess?.();
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to assign rider");
            }
        } catch (error) {
            console.error("Error assigning rider:", error);
            toast.error(error.response?.data?.message || "Error assigning rider");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Delivery Partner</DialogTitle>
                    <DialogDescription>
                        Manually force-assign a rider to this order. This ignores normal active delivery limits.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Delivery Partner</Label>
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading riders...
                            </div>
                        ) : (
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={selectedRider}
                                onChange={(e) => setSelectedRider(e.target.value)}
                            >
                                <option value="">-- Select a rider --</option>
                                {riders.map((rider) => (
                                    <option key={rider._id} value={rider._id}>
                                        {rider.firstName} {rider.lastName} ({rider.phone})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={assigning}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={assigning || !selectedRider || loading}>
                        {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Assign
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
