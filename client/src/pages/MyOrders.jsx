import React from 'react';
import { useSelector } from 'react-redux';
import NoData from '../components/NoData';

const MyOrders = () => {
  const orders = useSelector((state) => state.orders.order || []);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-white shadow-md p-3 font-semibold rounded-md">
        <h1 className="text-lg">My Orders</h1>
      </div>

      {/* Check for Orders */}
      {orders.length === 0 ? (
        <NoData message="You have no orders yet!" />
      ) : (
        <div className="mt-4 space-y-4">
          {orders.map((order, index) => (
            <div
              key={order._id + index}
              className="bg-white shadow-md p-4 rounded-md flex items-start gap-4"
            >
              {/* Product Image */}
              <div className="w-16 h-16 flex-shrink-0">
                <img
                  src={order?.product_details?.image?.[0] || '/placeholder.png'}
                  alt={order?.product_details?.name || 'Product Image'}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              {/* Order Details */}
              <div>
                <p className="text-sm text-gray-600">Order No: {order?.orderId}</p>
                <p className="font-medium text-base text-gray-800">
                  {order?.product_details?.name || 'Unknown Product'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

