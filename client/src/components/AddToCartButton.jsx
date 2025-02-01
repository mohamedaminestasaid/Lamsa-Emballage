import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FaMinus, FaPlus } from 'react-icons/fa6';
import toast from 'react-hot-toast';

import { useGlobalContext } from '../provider/GlobalProvider';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import Loading from './Loading';

const AddToCartButton = ({ data }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext();
    const cartItem = useSelector((state) => state.cartItem.cart);

    const [loadingType, setLoadingType] = useState(null); // null, "add", "increase", or "decrease"
    const [cartItemDetails, setCartItemDetails] = useState(null);

    // Check if the item is in the cart and update details
    useEffect(() => {
        const item = cartItem.find((item) => item.productId._id === data._id) || null;
        setCartItemDetails(item);
    }, [cartItem, data]);

    // Add item to the cart
    const handleAddToCart = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            setLoadingType('add');
            const response = await Axios({
                ...SummaryApi.addTocart,
                data: { productId: data._id },
            });

            if (response.data.success) {
                toast.success(response.data.message);
                fetchCartItem && fetchCartItem();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoadingType(null);
        }
    };

    // Increase quantity
    const handleIncreaseQty = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            setLoadingType('increase');
            const newQty = (cartItemDetails?.quantity || 0) + 1;

            const response = await updateCartItem(cartItemDetails._id, newQty);
            if (response.success) {
                toast.success('Item quantity increased');
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoadingType(null);
        }
    };

    // Decrease quantity
    const handleDecreaseQty = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            setLoadingType('decrease');
            const newQty = cartItemDetails.quantity - 1;

            if (newQty === 0) {
                await deleteCartItem(cartItemDetails._id);
                toast.success('Item removed from cart');
            } else {
                const response = await updateCartItem(cartItemDetails._id, newQty);
                if (response.success) {
                    toast.success('Item quantity decreased');
                }
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoadingType(null);
        }
    };

    // Button Class
    const buttonClass =
        'bg-green-600 hover:bg-green-700 text-white flex-1 w-full p-1 rounded flex items-center justify-center';

    return (
        <div className="w-full max-w-[150px]">
            {cartItemDetails ? (
                <div className="flex w-full h-full">
                    {/* Decrease Quantity */}
                    <button
                        onClick={handleDecreaseQty}
                        disabled={loadingType === 'decrease'}
                        aria-label="Decrease quantity"
                        className={`${buttonClass} ${loadingType === 'decrease' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loadingType === 'decrease' ? <Loading /> : <FaMinus />}
                    </button>

                    {/* Quantity Display */}
                    <p className="flex-1 w-full font-semibold px-1 flex items-center justify-center">
                        {cartItemDetails.quantity}
                    </p>

                    {/* Increase Quantity */}
                    <button
                        onClick={handleIncreaseQty}
                        disabled={loadingType === 'increase'}
                        aria-label="Increase quantity"
                        className={`${buttonClass} ${loadingType === 'increase' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loadingType === 'increase' ? <Loading /> : <FaPlus />}
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleAddToCart}
                    disabled={loadingType === 'add'}
                    aria-label="Add to cart"
                    className={`bg-green-600 hover:bg-green-700 text-white px-2 lg:px-4 py-1 rounded ${
                        loadingType === 'add' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {loadingType === 'add' ? <Loading /> : 'Add'}
                </button>
            )}
        </div>
    );
};

export default AddToCartButton;
