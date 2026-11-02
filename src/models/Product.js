import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            maxlength: [150, "Product name cannot exceed 150 characters"],
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        description: {
            type: String,
            required: [true, "Product description is required"],
            trim: true,
        },

        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: [0, "Price cannot be negative"],
        },

        discountPrice: {
            type: Number,
            default: null,
            min: [0, "Discount price cannot be negative"],
        },

        category: {
            type: String,
            required: [true, "Product category is required"],
            trim: true,
        },

        brand: {
            type: String,
            trim: true,
            default: "",
        },

        sku: {
            type: String,
            required: [true, "Product SKU is required"],
            unique: true,
            trim: true,
            uppercase: true,
        },

        stock: {
            type: Number,
            required: [true, "Product stock is required"],
            default: 0,
            min: [0, "Stock cannot be negative"],
        },

        images: [
            {
                url: {
                    type: String,
                    required: true,
                },
                publicId: {
                    type: String,
                    required: true,
                },
            },
        ],

        isActive: {
            type: Boolean,
            default: true,
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model("Product", productSchema);

export default Product;