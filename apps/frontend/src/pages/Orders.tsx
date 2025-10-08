import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Package, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const navigate = useNavigate();

  // Mock orders data
  const orders = [
    {
      id: 'ORD-123456',
      filename: 'phone_case.stl',
      maker: 'TechPrint Solutions',
      status: 'in_progress',
      total: '$15.40',
      date: '2024-01-15',
      estimatedCompletion: '2024-01-17'
    },
    {
      id: 'ORD-123455',
      filename: 'mini_figure.stl',
      maker: 'Local Print Shop',
      status: 'completed',
      total: '$8.25',
      date: '2024-01-10',
      completedDate: '2024-01-12'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-light text-text-primary">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-medium text-text-primary mb-2">No Orders Yet</h2>
            <p className="text-text-muted mb-6">
              Upload your first STL file to get started with 3D printing.
            </p>
            <Button onClick={() => navigate('/')}>
              Upload File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="font-medium text-text-primary">
                          {order.filename}
                        </h3>
                        <p className="text-sm text-text-muted">
                          Order {order.id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-text-primary">
                        {order.total}
                      </div>
                      <div className="text-sm text-text-muted">
                        {getStatusText(order.status)}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-text-muted">Maker:</span>
                      <span className="ml-2 font-medium">{order.maker}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Order Date:</span>
                      <span className="ml-2">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    {order.status === 'in_progress' && (
                      <div>
                        <span className="text-text-muted">Est. Completion:</span>
                        <span className="ml-2">{new Date(order.estimatedCompletion).toLocaleDateString()}</span>
                      </div>
                    )}
                    {order.status === 'completed' && (
                      <div>
                        <span className="text-text-muted">Completed:</span>
                        <span className="ml-2">{new Date(order.completedDate!).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Maker
                    </Button>
                    {order.status === 'completed' && (
                      <Button variant="outline" size="sm">
                        Reorder
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;