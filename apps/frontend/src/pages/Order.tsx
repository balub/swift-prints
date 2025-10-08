import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, MessageCircle, Package, Clock, Printer } from 'lucide-react';

const Order = () => {
  const [orderNotes, setOrderNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { maker, analysis, estimate } = location.state || {};

  if (!maker || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-text-primary mb-4">Missing Order Data</h1>
          <p className="text-text-muted mb-6">Please select a maker and upload a file first.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    setIsOrdering(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsOrdering(false);
    setOrderComplete(true);
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-light text-text-primary mb-4">Order Confirmed!</h1>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Your print request has been sent to {maker.name}. They'll contact you within 24 hours to confirm details.
          </p>
          
          <Card className="mb-8 text-left">
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Contact Information</p>
                  <p className="text-sm text-text-muted">
                    {maker.name} will reach out via the platform messaging system
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Package className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Order ID: #ORD-{Date.now().toString().slice(-6)}</p>
                  <p className="text-sm text-text-muted">
                    Save this for tracking your order
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/')}>
              Place Another Order
            </Button>
            <Button variant="outline" onClick={() => navigate('/orders')}>
              View My Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/makers')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Makers
          </Button>
          <h1 className="text-3xl font-light text-text-primary">Confirm Order</h1>
        </div>

        <div className="grid gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-text-primary mb-3">Print Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">File:</span>
                      <span>{analysis.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Material:</span>
                      <span>{analysis.filament_g}g PLA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Print Time:</span>
                      <span>{analysis.print_time}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-3">Maker Details</h4>
                  <div className="flex items-start space-x-3">
                    <img
                      src={maker.image}
                      alt={maker.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium">{maker.name}</p>
                      <p className="text-sm text-text-muted">{maker.location}</p>
                      <div className="flex items-center mt-1 text-sm">
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1">{maker.rating} ({maker.reviews})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Material Cost</span>
                  <span>${(analysis.filament_g * maker.pricePerGram).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Labor ({analysis.print_time})</span>
                  <span>${(2.5 * maker.hourlyRate).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-medium">
                    <span>Estimated Total</span>
                    <span className="text-primary">
                      ${((analysis.filament_g * maker.pricePerGram) + (2.5 * maker.hourlyRate)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special requirements or notes for the maker..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <div className="bg-neutral-50 rounded-lg p-6 text-center">
            <p className="text-sm text-text-muted mb-4">
              By confirming this order, you agree to our terms of service. 
              The maker will contact you within 24 hours to finalize details.
            </p>
            <Button 
              size="lg" 
              onClick={handleConfirmOrder}
              disabled={isOrdering}
              className="min-w-[200px]"
            >
              {isOrdering ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Order;