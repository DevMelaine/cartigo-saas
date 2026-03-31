import { OrderDetailPage } from "@/components/orders/order-detail-page";

type OrderDetailRouteProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderDetailRoute({ params }: OrderDetailRouteProps) {
  const { orderId } = await params;

  return <OrderDetailPage orderId={orderId} />;
}
