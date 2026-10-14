export type DeliveryMethod = "home_delivery" | "store_pickup";

export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  deliveryMethod: DeliveryMethod;
  notes?: string;
};
