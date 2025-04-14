import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({

  cart: JSON.parse(localStorage.getItem("cart-storage")) || [],
  coupon: JSON.parse(localStorage.getItem("coupon-storage")) || null,
  total: 0,
  subtotal: 0,
  isCouponApplied: false,

  getMyCoupon: async () => {
    try {
      const response = await axios.get("/coupons");
      set({ coupon: response.data });
      localStorage.setItem("coupon-storage", JSON.stringify(response.data)); 
    } catch (error) {
      console.error("Error fetching coupon:", error);
    }
  },


  applyCoupon: async (code) => {
    try {
      const response = await axios.post("/coupons/validate", { code });
      set({ coupon: response.data, isCouponApplied: true });
      get().calculateTotals();
      localStorage.setItem("coupon-storage", JSON.stringify(response.data));
      toast.success("Coupon applied successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply coupon");
    }
  },

  removeCoupon: () => {
    set({ coupon: null, isCouponApplied: false });
    get().calculateTotals();
    toast.success("Coupon removed");
    localStorage.removeItem("coupon-storage"); 
  },


  getCartItems: async () => {
    try {
      const res = await axios.get("/cart");
      set({ cart: res.data });
      get().calculateTotals();
      localStorage.setItem("cart-storage", JSON.stringify(res.data)); 
    } catch (error) {
      set({ cart: [] });
      toast.error(error.response?.data?.message || "An error occurred");
    }
  },

  addToCart: async (product) => {
    try {
      await axios.post("/cart", { productId: product._id });
      toast.success("Product added to cart");

      set((prevState) => {
        const existingItem = prevState.cart.find(
          (item) => item._id === product._id
        );
        const newCart = existingItem
          ? prevState.cart.map((item) =>
              item._id === product._id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [...prevState.cart, { ...product, quantity: 1 }];

        localStorage.setItem("cart-storage", JSON.stringify(newCart));

        return { cart: newCart };
      });
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  },

  removeFromCart: async (productId) => {
    await axios.delete(`/cart`, { data: { productId } });
    set((prevState) => {
      const updatedCart = prevState.cart.filter(
        (item) => item._id !== productId
      );

      localStorage.setItem("cart-storage", JSON.stringify(updatedCart));

      return { cart: updatedCart };
    });
    get().calculateTotals();
  },

  updateQuantity: async (productId, quantity) => {
    if (quantity === 0) {
      get().removeFromCart(productId);
      return;
    }
    await axios.put(`/cart/${productId}`, { quantity });
    set((prevState) => {
      const updatedCart = prevState.cart.map((item) =>
        item._id === productId ? { ...item, quantity } : item
      );

      localStorage.setItem("cart-storage", JSON.stringify(updatedCart));

      return { cart: updatedCart };
    });
    get().calculateTotals();
  },

  calculateTotals: () => {
    const { cart, coupon } = get();
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    let total = subtotal;

    if (coupon) {
      const discount = subtotal * (coupon.discountPercentage / 100);
      total = subtotal - discount;
    }

    set({ subtotal, total });
  },

  clearCart: async () => {
    try {

      await axios.post("/cart/clear-cart"); 

      set({ cart: [], coupon: null, total: 0, subtotal: 0 });

      localStorage.removeItem("cart-storage");
      localStorage.removeItem("coupon-storage");

    } catch (error) {
      toast.error("Failed to clear the cart");
    }
  },
}));
