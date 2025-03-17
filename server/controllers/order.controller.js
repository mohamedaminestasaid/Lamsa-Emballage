import Stripe from "../config/stripe.js";
import CartProductModel from "../models/cartproduct.model.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import mongoose from "mongoose";

// 🛒 الدفع عند الاستلام (Cash on Delivery)
export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId; // 🛑 الحصول على ID المستخدم من Middleware
        const { list_items, totalAmt, addressId, subTotalAmt } = request.body;

        // 🛒 تجهيز البيانات لإدخالها في قاعدة البيانات
        const payload = list_items.map(el => ({
            userId: userId,
            orderId: `ORD-${new mongoose.Types.ObjectId()}`,
            productId: el.productId._id,
            product_details: {
                name: el.productId.name,
                image: el.productId.image,
                quantity: el.quantity // ✅ إضافة الكمية
            },
            paymentId: "",
            payment_status: "CASH ON DELIVERY",
            delivery_address: addressId,
            subTotalAmt: el.quantity * el.productId.price, // ✅ حساب المجموع بناءً على الكمية
            totalAmt: el.quantity * el.productId.price,
        }));

        const generatedOrder = await OrderModel.insertMany(payload);

        // 🗑️ إزالة المنتجات من السلة بعد الطلب
        await CartProductModel.deleteMany({ userId: userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({
            message: "Order successfully",
            error: false,
            success: true,
            data: generatedOrder
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// 🔢 حساب السعر بعد الخصم
export const pricewithDiscount = (price, dis = 1) => {
    const discountAmount = Math.ceil((Number(price) * Number(dis)) / 100);
    return Number(price) - discountAmount;
};

// 💳 الدفع عبر Stripe
export async function paymentController(request, response) {
    try {
        const userId = request.userId;
        const { list_items, totalAmt, addressId, subTotalAmt } = request.body;
        const user = await UserModel.findById(userId);

        const line_items = list_items.map(item => ({
            price_data: {
                currency: 'inr',
                product_data: {
                    name: item.productId.name,
                    images: item.productId.image,
                    metadata: {
                        productId: item.productId._id
                    }
                },
                unit_amount: pricewithDiscount(item.productId.price, item.productId.discount) * 100
            },
            adjustable_quantity: {
                enabled: true,
                minimum: 1
            },
            quantity: item.quantity // ✅ إضافة الكمية
        }));

        const params = {
            submit_type: 'pay',
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: user.email,
            metadata: {
                userId: userId,
                addressId: addressId
            },
            line_items: line_items,
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`
        };

        const session = await Stripe.checkout.sessions.create(params);

        return response.status(200).json(session);

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// 🛍️ تجهيز بيانات الطلب بعد الدفع عبر Stripe
const getOrderProductItems = async ({ lineItems, userId, addressId, paymentId, payment_status }) => {
    const productList = [];

    if (lineItems?.data?.length) {
        for (const item of lineItems.data) {
            const product = await Stripe.products.retrieve(item.price.product);

            const payload = {
                userId: userId,
                orderId: `ORD-${new mongoose.Types.ObjectId()}`,
                productId: product.metadata.productId,
                product_details: {
                    name: product.name,
                    image: product.images,
                    quantity: item.quantity // ✅ إضافة الكمية
                },
                paymentId: paymentId,
                payment_status: payment_status,
                delivery_address: addressId,
                subTotalAmt: Number(item.amount_total / 100),
                totalAmt: Number(item.amount_total / 100),
            };

            productList.push(payload);
        }
    }

    return productList;
};

// 🛒 Webhook للدفع عبر Stripe
export async function webhookStripe(request, response) {
    const event = request.body;
    const endPointSecret = process.env.STRIPE_ENPOINT_WEBHOOK_SECRET_KEY;

    console.log("event", event);

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const lineItems = await Stripe.checkout.sessions.listLineItems(session.id);
            const userId = session.metadata.userId;

            const orderProduct = await getOrderProductItems({
                lineItems: lineItems,
                userId: userId,
                addressId: session.metadata.addressId,
                paymentId: session.payment_intent,
                payment_status: session.payment_status,
            });

            const order = await OrderModel.insertMany(orderProduct);

            if (Boolean(order[0])) {
                await UserModel.findByIdAndUpdate(userId, { shopping_cart: [] });
                await CartProductModel.deleteMany({ userId: userId });
            }
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    response.json({ received: true });
}

// 📦 جلب تفاصيل الطلبات
export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId;

        const orderlist = await OrderModel.find({ userId: userId })
            .sort({ createdAt: -1 })
            .populate('delivery_address');

        return response.json({
            message: "Order list",
            data: orderlist,
            error: false,
            success: true
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

