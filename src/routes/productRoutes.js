import express from "express";

import {
    createProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();

// GET all products
router.get("/", getAllProducts);

// GET single product
router.get("/:id", getSingleProduct);

// CREATE product
router.post("/", createProduct);

// UPDATE product
router.put("/:id", updateProduct);

// DELETE product
router.delete("/:id", deleteProduct);

export default router;