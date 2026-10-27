
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
            default: "",
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },

        role: {
            type: String,
            enum: ["customer", "admin", "staff"],
            default: "customer",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        avatar: {
            type: String,
            default: "",
        },

        address: {
            type: String,
            default: "",
        },

        city: {
            type: String,
            default: "",
        },

        postalCode: {
            type: String,
            default: "",
        },

        verificationTokenHash: {
            type: String,
            select: false,
        },

        verificationTokenExpires: {
            type: Date,
            select: false,
        },

        resetPasswordTokenHash: {
            type: String,
            select: false,
        },

        resetPasswordExpires: {
            type: Date,
            select: false,
        },

        passwordChangedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password during login
userSchema.methods.comparePassword = async function (
    enteredPassword
) {
    return bcrypt.compare(enteredPassword, this.password);
};

// Remove sensitive fields from JSON responses
userSchema.methods.toJSON = function () {
    const user = this.toObject();

    delete user.password;
    delete user.verificationTokenHash;
    delete user.verificationTokenExpires;
    delete user.resetPasswordTokenHash;
    delete user.resetPasswordExpires;
    delete user.__v;

    return user;
};

const User = mongoose.model("User", userSchema);

export default User;
