
import Product from "../models/Product.js";

// Generate unique product slug
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
};

// Create Product
const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            discountPrice,
            category,
            brand,
            sku,
            stock,
            images,
            isActive,
            isFeatured,
        } = req.body;

        const slug = generateSlug(name);

        const existingProduct = await Product.findOne({
            $or: [{ slug }, { sku }],
        });

        if (existingProduct) {
            return res.status(409).json({
                success: false,
                message: 'Product with this name or SKU already exists.',
            });
        }

        if (
            discountPrice !== undefined &&
            discountPrice !== null &&
            discountPrice !== '' &&
            Number(discountPrice) >= Number(price)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Discount price must be less than regular price.',
            });
        }

        const product = await Product.create({
            name,
            slug,
            description,
            price,
            discountPrice:
                discountPrice === '' || discountPrice === undefined
                    ? null
                    : discountPrice,
            category,
            brand,
            sku,
            stock,
            images: images || [],
            isActive,
            isFeatured,
        });

        return res.status(201).json({
            success: true,
            message: 'Product created successfully.',
            product,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Product name or SKU already exists.',
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create product.',
        });
    }
};

// Get All Products
const getAllProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 12,
        } = req.query;

        const filter = { isActive: true };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
            ];
        }

        if (category) {
            filter.category = {
                $regex: `^${category}$`,
                $options: 'i',
            };
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};

            if (minPrice !== undefined) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice !== undefined) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        let sortOption = { createdAt: -1 };

        if (sort === 'price-asc') {
            sortOption = { price: 1 };
        } else if (sort === 'price-desc') {
            sortOption = { price: -1 };
        } else if (sort === 'name-asc') {
            sortOption = { name: 1 };
        }

        const currentPage = Math.max(1, Number(page) || 1);
        const perPage = Math.min(100, Math.max(1, Number(limit) || 12));

        const totalProducts = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        return res.status(200).json({
            success: true,
            totalProducts,
            currentPage,
            totalPages: Math.ceil(totalProducts / perPage),
            products,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch products.',
        });
    }
};

// Get Single Product
const getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            isActive: true,
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.',
            });
        }

        return res.status(200).json({
            success: true,
            product,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Invalid product ID.',
        });
    }
};

// Update Product
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.',
            });
        }

        const allowedFields = [
            'name',
            'description',
            'price',
            'discountPrice',
            'category',
            'brand',
            'sku',
            'stock',
            'images',
            'isActive',
            'isFeatured',
        ];

        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedName = updates.name || product.name;
        const updatedSku = updates.sku || product.sku;

        if (updates.name !== undefined) {
            updates.slug = generateSlug(updatedName);
        }

        const duplicate = await Product.findOne({
            _id: { $ne: product._id },
            $or: [
                { slug: updates.slug || product.slug },
                { sku: updatedSku },
            ],
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'Another product already uses this name or SKU.',
            });
        }

        const finalPrice =
            updates.price !== undefined ? Number(updates.price) : product.price;

        const finalDiscountPrice =
            updates.discountPrice !== undefined
                ? updates.discountPrice
                : product.discountPrice;

        if (
            finalDiscountPrice !== null &&
            finalDiscountPrice !== '' &&
            Number(finalDiscountPrice) >= finalPrice
        ) {
            return res.status(400).json({
                success: false,
                message: 'Discount price must be less than regular price.',
            });
        }

        Object.assign(product, updates);

        await product.save();

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully.',
            product,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Product name or SKU already exists.',
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update product.',
        });
    }
};

// Delete Product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.',
            });
        }

        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            success: true,
            message: 'Product deleted successfully.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Invalid product ID.',
        });
    }
};

export {
    createProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
};
